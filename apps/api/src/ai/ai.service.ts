import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { GoogleGenerativeAI } from '@google/generative-ai';

export interface SuggestedTask {
  titre: string;
  description?: string;
}

const SYSTEM_PROMPT = `Tu aides une équipe à transformer des notes en vrac (idées, messages de discussion,
tâches mentionnées au fil de l'eau) en une liste de tâches claires et actionnables.

Règles :
- Une tâche = une action concrète, formulée à l'infinitif, courte (moins de 12 mots).
- Ignore le bavardage, les salutations, ce qui n'est pas une action à faire.
- Ne déduis pas de tâches qui ne sont pas clairement suggérées par le texte.
- Réponds uniquement avec un tableau JSON, sans texte autour, au format :
[{"titre": "...", "description": "..."}]
La description est optionnelle (uniquement si un détail utile existe), sinon omets-la.
Si aucune tâche ne se dégage du texte, réponds avec un tableau vide [].`;

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

  async suggestTasks(texte: string): Promise<SuggestedTask[]> {
    if (!this.client) return [];
    if (!texte.trim()) return [];

    try {
      const model = this.client.getGenerativeModel({
        model: this.model,
        generationConfig: { responseMimeType: 'application/json' },
      });
      const result = await model.generateContent(`${SYSTEM_PROMPT}\n\nTexte :\n${texte}`);
      const raw = result.response.text();
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
    } catch (error) {
      this.logger.warn(`Échec de la suggestion de tâches par IA: ${error}`);
      return [];
    }
  }
}
