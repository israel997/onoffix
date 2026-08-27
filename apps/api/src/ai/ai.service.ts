import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { PrioriteTache } from '@prisma/client';

export interface SuggestedTask {
  titre: string;
  description?: string;
}

export interface SuggestedPlanTask extends SuggestedTask {
  priorite: PrioriteTache;
}

export interface SuggestedPlan {
  projetNom: string;
  taches: SuggestedPlanTask[];
}

const SYSTEM_PROMPT = `Tu aides une équipe à transformer des notes en vrac (idées, messages de discussion,
tâches mentionnées au fil de l'eau) en une liste de tâches claires et actionnables.

Règles :
- Une tâche = une action concrète, formulée à l'infinitif, courte (moins de 12 mots).
- Reformule proprement : ne recopie jamais le texte brut tel quel. Corrige l'orthographe
  et la grammaire, mets une majuscule en début de phrase.
- Ignore le bavardage, les salutations, ce qui n'est pas une action à faire.
- Ne déduis pas de tâches qui ne sont pas clairement suggérées par le texte.
- Réponds uniquement avec un tableau JSON, sans texte autour, au format :
[{"titre": "...", "description": "..."}]
La description est optionnelle (uniquement si un détail utile existe), sinon omets-la.
Si aucune tâche ne se dégage du texte, réponds avec un tableau vide [].`;

const PLAN_PROMPT = `Tu transformes une conversation en vrac (idées, demandes, discussions) en un plan de
projet structuré et actionnable.

Règles :
- Trouve un nom de projet court (moins de 8 mots) qui résume l'objectif global.
- Découpe le travail en tâches concrètes, formulées à l'infinitif, courtes (moins de 12 mots).
- Reformule proprement : ne recopie jamais le texte brut tel quel. Corrige l'orthographe
  et la grammaire, mets une majuscule en début de phrase.
- Attribue à chaque tâche une priorité parmi BASSE, NORMALE, HAUTE, URGENTE selon l'urgence/l'impact
  perçus dans le texte (par défaut NORMALE si rien ne l'indique).
- Ignore le bavardage, les salutations, ce qui n'est pas une action à faire.
- Réponds uniquement avec un objet JSON, sans texte autour, au format :
{"projetNom": "...", "taches": [{"titre": "...", "description": "...", "priorite": "NORMALE"}]}
La description est optionnelle. Si aucune tâche ne se dégage du texte, réponds avec un tableau "taches" vide.`;

export interface RapportAnalyseInput {
  projetNom: string;
  tachesTotal: number;
  tachesTerminees: number;
  tachesEnRetard: number;
  progression: number | null;
  dureePrevueJours: number | null;
  dureeReelleJours: number | null;
  ecartJours: number | null;
  blocagesCount: number;
  blocagesActifs: number;
  contributionMembres: { nom: string; tachesTerminees: number; tachesAssignees: number }[];
}

export interface RapportAnalyse {
  narrative: string;
  pointsPositifs: string[];
  pointsAmelioration: string[];
  recommandations: string[];
}

const RAPPORT_PROMPT = `Tu es un chef de projet qui rédige la synthèse d'un rapport de projet à partir de
données chiffrées.

Règles :
- Reste factuel, basé uniquement sur les chiffres fournis, sans invention.
- "narrative" : 3 à 5 phrases résumant le déroulement du projet (rythme, écart de temps, blocages,
  contribution de l'équipe).
- "pointsPositifs" : jusqu'à 3 points positifs concrets.
- "pointsAmelioration" : jusqu'à 3 points à améliorer.
- "recommandations" : jusqu'à 3 recommandations actionnables pour de prochains projets similaires.
- Réponds uniquement avec un objet JSON, sans texte autour, au format :
{"narrative": "...", "pointsPositifs": ["..."], "pointsAmelioration": ["..."], "recommandations": ["..."]}`;

const MAX_ATTEMPTS = 3;
const RETRY_DELAY_MS = 1500;

/** Erreurs transitoires côté Google — Gemini invite explicitement à réessayer. */
function isRetryable(error: unknown): boolean {
  const message = error instanceof Error ? error.message : String(error);
  return /\b(503|429)\b|overloaded|high demand|unavailable/i.test(message);
}

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

@Injectable()
export class AiService {
  private readonly logger = new Logger(AiService.name);
  private readonly client: GoogleGenerativeAI | null;
  private readonly model: string;

  constructor(private readonly config: ConfigService) {
    const apiKey = this.config.get<string>('GOOGLE_AI_API_KEY');
    this.client = apiKey ? new GoogleGenerativeAI(apiKey) : null;
    this.model = this.config.get<string>('GOOGLE_AI_MODEL', 'gemini-flash-latest');

    if (!this.client) {
      this.logger.warn(
        'GOOGLE_AI_API_KEY non configurée — la génération de tâches par IA est désactivée.',
      );
    }
  }

  /** Appelle Gemini avec quelques tentatives (backoff) sur les erreurs transitoires (503/429). */
  private async generateWithRetry(prompt: string): Promise<string> {
    const model = this.client!.getGenerativeModel({
      model: this.model,
      generationConfig: { responseMimeType: 'application/json' },
    });

    let lastError: unknown;
    for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
      try {
        const result = await model.generateContent(prompt);
        return result.response.text();
      } catch (error) {
        lastError = error;
        if (attempt < MAX_ATTEMPTS && isRetryable(error)) {
          this.logger.warn(
            `Appel IA échoué (tentative ${attempt}/${MAX_ATTEMPTS}), nouvel essai: ${error}`,
          );
          await sleep(RETRY_DELAY_MS * attempt);
          continue;
        }
        throw error;
      }
    }
    throw lastError;
  }

  /**
   * Génère des tâches depuis un Subject. Contrairement aux autres méthodes de ce
   * service, ceci relance l'erreur après épuisement des tentatives (au lieu de
   * rendre un tableau vide) : l'appelant (OrganizerProcessor) doit distinguer
   * "aucune tâche trouvée" (résultat légitime) d'un échec IA, pour ne jamais
   * marquer des messages comme traités alors qu'ils ne l'ont pas vraiment été.
   */
  async suggestTasks(texte: string): Promise<SuggestedTask[]> {
    if (!this.client) return [];
    if (!texte.trim()) return [];

    const raw = await this.generateWithRetry(`${SYSTEM_PROMPT}\n\nTexte :\n${texte}`);
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];

    return (parsed as unknown[])
      .filter(
        (item): item is { titre: string; description?: unknown } =>
          typeof item === 'object' &&
          item !== null &&
          typeof (item as Record<string, unknown>).titre === 'string' &&
          ((item as Record<string, unknown>).titre as string).trim().length > 0,
      )
      .map((item) => ({
        titre: item.titre.trim(),
        description:
          typeof item.description === 'string' ? item.description.trim() || undefined : undefined,
      }));
  }

  async suggestPlan(texte: string): Promise<SuggestedPlan> {
    const empty: SuggestedPlan = { projetNom: '', taches: [] };
    if (!this.client) return empty;
    if (!texte.trim()) return empty;

    const priorites = new Set(Object.values(PrioriteTache));

    try {
      const raw = await this.generateWithRetry(`${PLAN_PROMPT}\n\nTexte :\n${texte}`);
      const parsed: unknown = JSON.parse(raw);
      if (typeof parsed !== 'object' || parsed === null) return empty;

      const projetNom =
        typeof (parsed as Record<string, unknown>).projetNom === 'string'
          ? ((parsed as Record<string, unknown>).projetNom as string).trim()
          : '';
      const rawTaches = (parsed as Record<string, unknown>).taches;
      if (!projetNom || !Array.isArray(rawTaches)) return empty;

      const taches = rawTaches
        .filter(
          (item): item is { titre: string; description?: unknown; priorite?: unknown } =>
            typeof item === 'object' &&
            item !== null &&
            typeof (item as Record<string, unknown>).titre === 'string' &&
            ((item as Record<string, unknown>).titre as string).trim().length > 0,
        )
        .map((item) => ({
          titre: item.titre.trim(),
          description:
            typeof item.description === 'string' ? item.description.trim() || undefined : undefined,
          priorite: priorites.has(item.priorite as PrioriteTache)
            ? (item.priorite as PrioriteTache)
            : PrioriteTache.NORMALE,
        }));

      return { projetNom, taches };
    } catch (error) {
      this.logger.warn(`Échec de la génération de plan par IA: ${error}`);
      return empty;
    }
  }

  async genererAnalyseRapport(data: RapportAnalyseInput): Promise<RapportAnalyse | null> {
    if (!this.client) return null;

    try {
      const raw = await this.generateWithRetry(
        `${RAPPORT_PROMPT}\n\nDonnées :\n${JSON.stringify(data)}`,
      );
      const parsed: unknown = JSON.parse(raw);
      if (typeof parsed !== 'object' || parsed === null) return null;

      const obj = parsed as Record<string, unknown>;
      const narrative = typeof obj.narrative === 'string' ? obj.narrative.trim() : '';
      if (!narrative) return null;

      const toStringArray = (value: unknown): string[] =>
        Array.isArray(value)
          ? value.filter(
              (item): item is string => typeof item === 'string' && item.trim().length > 0,
            )
          : [];

      return {
        narrative,
        pointsPositifs: toStringArray(obj.pointsPositifs),
        pointsAmelioration: toStringArray(obj.pointsAmelioration),
        recommandations: toStringArray(obj.recommandations),
      };
    } catch (error) {
      this.logger.warn(`Échec de la génération d'analyse de rapport par IA: ${error}`);
      return null;
    }
  }
}
