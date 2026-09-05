/**
 * Diagramme de structure pour Getting Started : Organisation contient des Offices (chacun
 * avec ses Tasks/BrainDumper/Chat/Check-In), et directement Members & Roles + My Space
 * (au même niveau que les offices, pas en dessous). Boîtes imbriquées plutôt que des flèches :
 * plus simple à garder juste visuellement, et ça colle à la réalité (un Office est "dans"
 * l'organisation).
 */
export function StructureDiagram({ locale = 'en' }: { locale?: 'en' | 'fr' }) {
  const isFr = locale === 'fr';

  return (
    <div className="docs-structure">
      <span className="docs-structure-label">Organisation</span>
      <div className="docs-structure-connector" />
      <div className="docs-structure-row">
        <div className="docs-structure-office">
          <span className="docs-structure-label">Office</span>
          <p className="docs-structure-office-hint">
            {isFr ? '(autant que votre plan le permet)' : '(as many as your plan allows)'}
          </p>
          <div className="docs-structure-leaves">
            <span className="docs-structure-leaf">Tasks</span>
            <span className="docs-structure-leaf">BrainDumper</span>
            <span className="docs-structure-leaf">Chat</span>
            <span className="docs-structure-leaf">Check-In</span>
          </div>
        </div>
        <div className="docs-structure-side">
          <span className="docs-structure-leaf">{isFr ? 'Members & rôles' : 'Members & roles'}</span>
          <span className="docs-structure-leaf">My Space</span>
        </div>
      </div>
    </div>
  );
}
