'use client';

import { IBM_Plex_Mono, IBM_Plex_Sans, Space_Grotesk } from 'next/font/google';
import Image from 'next/image';
import Link from 'next/link';
import { LandingFooter } from '@/components/landing/landing-footer';
import { LandingHeader } from '@/components/landing/landing-header';
import { useAuth } from '@/lib/auth-context';
import '../landing.css';

const spaceGrotesk = Space_Grotesk({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700'],
  variable: '--font-display-src',
});
const ibmPlexSans = IBM_Plex_Sans({
  subsets: ['latin'],
  weight: ['400', '500', '600'],
  variable: '--font-body-src',
});
const ibmPlexMono = IBM_Plex_Mono({
  subsets: ['latin'],
  weight: ['400', '500', '600'],
  variable: '--font-mono-src',
});

export default function LandingPageFr() {
  const { user, loading } = useAuth();
  const authed = !loading && !!user;

  return (
    <div
      className={`${spaceGrotesk.variable} ${ibmPlexSans.variable} ${ibmPlexMono.variable} landing`}
    >
      <LandingHeader />

      <section className="hero">
        <div className="wrap hero-grid">
          <div>
            <h1>
              Sachez exactement où en est votre équipe, <span className="u">chaque jour</span>.
            </h1>
            <p className="hero-sub">
              Organisez votre équipe en bureaux et voyez, chaque soir, qui a vraiment avancé.
            </p>
            <div className="hero-ctas">
              <Link href={authed ? '/dashboard' : '/register'} className="btn btn-primary">
                {authed ? 'Aller au tableau de bord' : 'Essayer OOffix'}
              </Link>
              <a href="#how" className="btn btn-ghost">
                Voir comment ça marche
              </a>
            </div>
            <div className="hero-note">
              <span className="dot"></span> Aucune carte bancaire requise pour commencer
            </div>
          </div>

          <div className="hero-image">
            <Image
              src="/1.png"
              alt="Vue d'un bureau OOffix : les postes s'allument à mesure que les collaborateurs déclarent leur avancement"
              width={1536}
              height={1024}
              priority
            />
          </div>
        </div>
      </section>

      <section id="scattered" className="band">
        <div className="wrap">
          <div className="section-head">
            <h2>Des idées éparses deviennent un plan.</h2>
            <p>
              Notez ce qu&apos;il y a à faire, dans le désordre, au fil de vos idées. Ça se
              transforme en tâches, avec un responsable suggéré selon les rôles du bureau (à vous
              de confirmer ou d&apos;ajuster).
            </p>
          </div>

          <div className="scattered-banner">
            <Image
              src="/3.png"
              alt="Des post-it éparpillés se transformant en cartes de tâches organisées"
              width={1536}
              height={1024}
            />
          </div>

          <div className="demo-grid">
            <div className="demo-panel">
              <h4>Saisie libre</h4>
              <div className="scrawl">
                revoir la page contact du site, corriger le bug du formulaire, et faire un point
                avec le client Assogba sur la maquette avant vendredi. aussi penser à préparer la
                facture de septembre
              </div>
            </div>

            <div className="demo-arrow">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
                <path
                  d="M5 12h14M13 6l6 6-6 6"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </div>

            <div className="demo-panel">
              <h4>Tâches suggérées</h4>
              <div className="task-card">
                <div className="chk"></div>
                <div className="tc-body">
                  <div className="tc-title">Corriger le bug du formulaire de contact</div>
                  <span className="tc-tag">Développeur</span>
                </div>
              </div>
              <div className="task-card">
                <div className="chk"></div>
                <div className="tc-body">
                  <div className="tc-title">Envoyer la maquette au client Assogba</div>
                  <span className="tc-tag">Designer · à rendre ven.</span>
                </div>
              </div>
              <div className="task-card">
                <div className="chk"></div>
                <div className="tc-body">
                  <div className="tc-title">Préparer la facture de septembre</div>
                  <span className="tc-tag">Comptabilité</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section id="how">
        <div className="wrap">
          <div className="section-head">
            <h2>Quatre étapes pour faire avancer votre bureau.</h2>
          </div>
          <div className="steps">
            <div className="step">
              <div className="step-n">01</div>
              <h3>Créer un bureau</h3>
              <p>Une équipe, un espace. Marketing, ingénierie, ventes : chacune a le sien.</p>
            </div>
            <div className="step">
              <div className="step-n">02</div>
              <h3>Ajouter votre équipe</h3>
              <p>Le manager invite les collaborateurs et leur attribue un rôle dans le bureau.</p>
            </div>
            <div className="step">
              <div className="step-n">03</div>
              <h3>Décrire le travail</h3>
              <p>Grossier ou détaillé : OOffix structure et pré-assigne les tâches.</p>
            </div>
            <div className="step">
              <div className="step-n">04</div>
              <h3>Suivre chaque soir</h3>
              <p>Déclarez l&apos;avancement, puis validez-le le lendemain. La progression se construit d&apos;elle-même.</p>
            </div>
          </div>
        </div>
      </section>

      <section id="ritual" className="band">
        <div className="wrap">
          <div className="section-head">
            <h2>Chaque soir, vous savez qui a avancé.</h2>
            <p>
              L&apos;heure de déclaration est fixée par chaque manager pour son bureau. Ce qui est
              déclaré n&apos;est officiel qu&apos;une fois vérifié (le lendemain, en personne).
            </p>
          </div>

          <div className="ritual">
            <div className="ritual-track">
              <div className="ritual-item done">
                <div className="ritual-time">8h00</div>
                <h4>Les tâches du jour sont visibles</h4>
                <p>Chaque collaborateur voit ce qui lui est assigné pour la journée.</p>
              </div>
              <div className="ritual-item done">
                <div className="ritual-time">18h30 · heure du bureau</div>
                <h4>Déclaration</h4>
                <p>
                  Le collaborateur coche ce qu&apos;il a réellement accompli. Son avancement du
                  jour apparaît.
                </p>
              </div>
              <div className="ritual-item">
                <div className="ritual-time">Le lendemain matin</div>
                <h4>Point avec le manager</h4>
                <p>Le manager passe en revue chaque élément déclaré, en discute si besoin, et valide.</p>
              </div>
              <div className="ritual-item">
                <div className="ritual-time">Après validation</div>
                <h4>L&apos;avancement devient officiel</h4>
                <p>Seules les tâches validées comptent dans la barre de progression du projet.</p>
              </div>
            </div>

            <div className="ritual-visual">
              <div className="ritual-image">
                <Image
                  src="/2.png"
                  alt="Manager et collaborateur passant en revue ensemble une checklist de validation de tâches"
                  width={1536}
                  height={1024}
                />
              </div>
              <div className="config-card">
              <h3 style={{ fontSize: '15px', marginBottom: '4px' }}>Réglages du bureau</h3>
              <p style={{ fontSize: '13px', color: 'var(--slate)', marginBottom: '16px' }}>
                Définis par le manager, pour son équipe.
              </p>
              <div className="config-row">
                <div>
                  <div className="config-label">Heure de déclaration</div>
                  <div className="config-hint">Peut varier selon le jour</div>
                </div>
                <span className="config-value">18h30</span>
              </div>
              <div className="config-row">
                <div>
                  <div className="config-label">Rappel si pas déclaré</div>
                  <div className="config-hint">Notification + alerte au manager</div>
                </div>
                <span className="config-value">+1h</span>
              </div>
              <div className="config-row">
                <div>
                  <div className="config-label">Classement de fiabilité</div>
                  <div className="config-hint">Visible par l&apos;équipe, peut être masqué</div>
                </div>
                <span className="config-value">Visible</span>
              </div>
              <div className="config-row">
                <div>
                  <div className="config-label">Résumé quotidien</div>
                  <div className="config-hint">Envoyé au manager chaque soir</div>
                </div>
                <span className="config-value">Activé</span>
              </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section id="features">
        <div className="wrap">
          <div className="section-head">
            <h2>Tout ce qu&apos;il faut pour documenter le travail, rien de plus.</h2>
          </div>

          <div className="feat-grid">
            <div className="feat">
              <div className="feat-icon">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
                  <rect x="3" y="4" width="7" height="7" rx="1.5" stroke="currentColor" strokeWidth="2" />
                  <rect x="14" y="4" width="7" height="7" rx="1.5" stroke="currentColor" strokeWidth="2" />
                  <rect x="3" y="13" width="7" height="7" rx="1.5" stroke="currentColor" strokeWidth="2" />
                  <rect x="14" y="13" width="7" height="7" rx="1.5" stroke="currentColor" strokeWidth="2" />
                </svg>
              </div>
              <h3>Bureaux</h3>
              <p>Une équipe par bureau, avec ses propres membres, rôles et réglages horaires.</p>
            </div>
            <div className="feat">
              <div className="feat-icon">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
                  <path d="M4 6h16M4 12h16M4 18h10" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                </svg>
              </div>
              <h3>Projets &amp; tâches</h3>
              <p>Des objectifs avec échéances, découpés en tâches assignées et, si besoin, en sous-tâches.</p>
            </div>
            <div className="feat">
              <div className="feat-icon">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
                  <path
                    d="M12 3v4M12 17v4M3 12h4M17 12h4M6 6l2.5 2.5M17.5 17.5L15 15M6 18l2.5-2.5M17.5 6.5L15 9"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                  />
                </svg>
              </div>
              <h3>Suggestions IA</h3>
              <p>Un texte brut devient des tâches structurées, pré-assignées selon les rôles du bureau.</p>
            </div>
            <div className="feat">
              <div className="feat-icon">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
                  <path
                    d="M4 19V5M4 19h16M8 15l3-4 3 3 4-6"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              </div>
              <h3>Barres de progression</h3>
              <p>Basées uniquement sur les tâches validées, pas sur ce qui a simplement été coché.</p>
            </div>
            <div className="feat">
              <div className="feat-icon">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
                  <path d="M12 8v4l3 2" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                  <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="2" />
                </svg>
              </div>
              <h3>Résumés quotidiens</h3>
              <p>Un bilan clair chaque soir : ce qui a été déclaré, validé, ou manqué dans le bureau.</p>
            </div>
            <div className="feat">
              <div className="feat-icon">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
                  <path
                    d="M12 2l2.4 6.6L21 11l-6.6 2.4L12 20l-2.4-6.6L3 11l6.6-2.4L12 2z"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinejoin="round"
                  />
                </svg>
              </div>
              <h3>Score de fiabilité</h3>
              <p>Ponctualité et régularité des déclarations, pas seulement le volume de tâches cochées.</p>
            </div>
          </div>
        </div>
      </section>

      <section className="band">
        <div className="wrap">
          <div className="section-head">
            <h2>Coché devient vérifié.</h2>
            <p>
              Cocher une tâche ne prouve pas qu&apos;elle est faite. C&apos;est pour ça
              qu&apos;on ajoute une étape : la validation.
            </p>
          </div>

          <div className="ctable">
            <div className="ctable-row ctable-head">
              <div className="ctable-crit"></div>
              <div className="ctable-cell">Sans validation</div>
              <div className="ctable-cell win">Avec validation</div>
            </div>
            <div className="ctable-row">
              <div className="ctable-crit">Heure de déclaration</div>
              <div className="ctable-cell muted">Aléatoire, si ça arrive</div>
              <div className="ctable-cell win">Fixée par le manager</div>
            </div>
            <div className="ctable-row">
              <div className="ctable-crit">Qui vérifie</div>
              <div className="ctable-cell muted">Personne</div>
              <div className="ctable-cell win">Le manager, le lendemain</div>
            </div>
            <div className="ctable-row">
              <div className="ctable-crit">Ce qui compte dans la progression</div>
              <div className="ctable-cell muted">Tout ce qui est coché</div>
              <div className="ctable-cell win">Seulement ce qui est validé</div>
            </div>
            <div className="ctable-row">
              <div className="ctable-crit">Si c&apos;est manqué</div>
              <div className="ctable-cell muted">Rien ne se passe</div>
              <div className="ctable-cell win">Rappel automatique</div>
            </div>
          </div>
        </div>
      </section>

      <section id="cta">
        <div className="wrap">
          <div className="cta-final">
            <h2>Faites entrer votre équipe au bureau.</h2>
            <p>Gratuit pour les petites équipes. Essai gratuit de 7 jours sur les plans payants, sans carte bancaire.</p>
            <div className="hero-ctas" style={{ justifyContent: 'center' }}>
              <Link href={authed ? '/dashboard' : '/register'} className="btn btn-primary">
                {authed ? 'Aller au tableau de bord' : 'Essayer OOffix'}
              </Link>
              <Link href="/fr/pricing" className="btn btn-ghost">
                Voir les tarifs
              </Link>
            </div>
          </div>
        </div>
      </section>

      <LandingFooter />
    </div>
  );
}
