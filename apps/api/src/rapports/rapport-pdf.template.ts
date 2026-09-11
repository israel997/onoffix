type RapportPourPdf = {
  nom: string;
  type: 'GENERAL' | 'WEEKLY';
  contenu: string | null;
  createur: { nom: string };
  createdAt: Date;
  images: { url: string; nom: string }[];
  jours: {
    jour: number;
    contenu: string | null;
    bonsPoints: string | null;
    pointsNegatifs: string | null;
    objectifs: string | null;
    images: { url: string; nom: string }[];
  }[];
};

const JOURS_LABEL = ['Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi', 'Dimanche'];

function escapeHtml(input: string): string {
  return input
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function textBlock(label: string, value: string | null) {
  if (!value?.trim()) return '';
  const escaped = escapeHtml(value).replace(/\n/g, '<br>');
  return `<div class="block"><p class="block-label">${label}</p><p class="block-text">${escaped}</p></div>`;
}

function imagesBlock(images: { url: string; nom: string }[]) {
  if (images.length === 0) return '';
  return `<div class="images">${images
    .map((img) => `<img src="${escapeHtml(img.url)}" alt="${escapeHtml(img.nom)}" />`)
    .join('')}</div>`;
}

export function buildRapportHtml(rapport: RapportPourPdf): string {
  const dateStr = rapport.createdAt.toLocaleDateString('fr-FR', {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
  });

  const body =
    rapport.type === 'GENERAL'
      ? `${textBlock('Contenu', rapport.contenu)}${imagesBlock(rapport.images)}`
      : [...rapport.jours]
          .sort((a, b) => a.jour - b.jour)
          .map((j) => {
            const hasContent =
              j.contenu || j.bonsPoints || j.pointsNegatifs || j.objectifs || j.images.length > 0;
            if (!hasContent) return '';
            return `
              <section class="jour">
                <h2>${JOURS_LABEL[j.jour]}</h2>
                ${textBlock('Notes', j.contenu)}
                ${textBlock('Bons points', j.bonsPoints)}
                ${textBlock('Points négatifs', j.pointsNegatifs)}
                ${textBlock('Objectifs', j.objectifs)}
                ${imagesBlock(j.images)}
              </section>`;
          })
          .join('');

  return `<!doctype html>
<html>
<head>
<meta charset="utf-8" />
<style>
  * { box-sizing: border-box; }
  body {
    font-family: -apple-system, 'Segoe UI', Helvetica, Arial, sans-serif;
    color: #0a1440;
    margin: 0;
    padding: 0;
  }
  .page { padding: 12mm 4mm; }
  .header {
    display: flex;
    align-items: baseline;
    justify-content: space-between;
    border-bottom: 3px solid #0b63f6;
    padding-bottom: 10px;
    margin-bottom: 24px;
  }
  .header h1 { font-size: 22px; margin: 0; color: #0a1440; }
  .header .meta { font-size: 11px; color: #5b6178; text-align: right; }
  .jour { margin-bottom: 22px; page-break-inside: avoid; }
  .jour h2 {
    font-size: 14px;
    color: #0b63f6;
    border-bottom: 1px solid #e3e7f0;
    padding-bottom: 4px;
    margin-bottom: 10px;
  }
  .block { margin-bottom: 10px; }
  .block-label { font-size: 10px; font-weight: 600; text-transform: uppercase; letter-spacing: .03em; color: #5b6178; margin: 0 0 3px; }
  .block-text { font-size: 12px; line-height: 1.5; margin: 0; white-space: pre-wrap; }
  .images { display: flex; flex-wrap: wrap; gap: 8px; margin: 10px 0; }
  .images img { max-width: 140px; max-height: 100px; object-fit: cover; border-radius: 6px; border: 1px solid #e3e7f0; }
  .footer {
    margin-top: 32px;
    padding-top: 10px;
    border-top: 1px solid #e3e7f0;
    font-size: 10px;
    color: #5b6178;
    text-align: center;
  }
</style>
</head>
<body>
  <div class="page">
    <div class="header">
      <h1>${escapeHtml(rapport.nom)}</h1>
      <div class="meta">Par ${escapeHtml(rapport.createur.nom)}<br>${dateStr}</div>
    </div>
    ${body}
    <div class="footer">Report from OOffix — The platform that simplifies team work</div>
  </div>
</body>
</html>`;
}
