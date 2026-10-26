// Server-side rendering of the dedicated page for each church / monastery.

import { regionsConfig } from './db.js';

export const TYPE_LABELS = {
  church: { el: 'Ναός', en: 'Church' },
  monastery: { el: 'Μονή', en: 'Monastery' },
  chapel: { el: 'Εκκλησάκι', en: 'Chapel' },
  basilica: { el: 'Βασιλική / Ερείπια', en: 'Basilica / Ruins' },
};

const T = {
  backToMap: { el: '← Πίσω στον χάρτη', en: '← Back to the map' },
  details: { el: 'Στοιχεία', en: 'Details' },
  location: { el: 'Τοποθεσία', en: 'Location' },
  type: { el: 'Τύπος', en: 'Type' },
  coords: { el: 'Συντεταγμένες', en: 'Coordinates' },
  approx: { el: 'Κατά προσέγγιση θέση – δεν έχει επαληθευτεί ακόμα.', en: 'Approximate location – not yet verified.' },
  openMaps: { el: 'Άνοιγμα στο Google Maps', en: 'Open in Google Maps' },
  photos: { el: 'Φωτογραφίες', en: 'Photographs' },
  sources: { el: 'Πηγές', en: 'Sources' },
  draft: { el: 'Μη δημοσιευμένο – προεπισκόπηση διαχειριστή', en: 'Unpublished – admin preview' },
  edit: { el: 'Επεξεργασία', en: 'Edit' },
};

export const esc = (s) =>
  String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);

function inline(text) {
  return esc(text)
    .replace(/\[([^\]]+)\]\(((?:https?:\/\/|\/)[^\s)]+)\)/g, '<a href="$2" rel="noopener">$1</a>')
    .replace(/(^|[\s(])(https?:\/\/[^\s<)]+)/g, '$1<a href="$2" rel="noopener">$2</a>')
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(/(^|[^*])\*(?!\s)(.+?)\*/g, '$1<em>$2</em>');
}

// Minimal Markdown: ## / ### headings, "- " lists, paragraphs, **bold**, *italic*, [links](url).
export function markdown(src) {
  return String(src ?? '')
    .replace(/\r\n/g, '\n')
    .split(/\n{2,}/)
    .map((block) => block.trim())
    .filter(Boolean)
    .map((block) => {
      const h = block.match(/^(#{2,3})\s+(.*)$/s);
      if (h) return `<h${h[1].length}>${inline(h[2])}</h${h[1].length}>`;
      const lines = block.split('\n');
      if (lines.every((l) => /^-\s+/.test(l)))
        return `<ul>${lines.map((l) => `<li>${inline(l.replace(/^-\s+/, ''))}</li>`).join('')}</ul>`;
      return `<p>${lines.map(inline).join('<br>')}</p>`;
    })
    .join('\n');
}

// "Label: Value" per line → [[label, value], ...]
export function parseFacts(src) {
  return String(src ?? '')
    .split('\n')
    .map((l) => l.trim())
    .filter(Boolean)
    .map((l) => {
      const i = l.indexOf(':');
      return i > 0 ? [l.slice(0, i).trim(), l.slice(i + 1).trim()] : ['', l];
    });
}

const other = (lang) => (lang === 'el' ? 'en' : 'el');

export function head({ title, description = '', lang, extra = '' }) {
  return `<!doctype html>
<html lang="${lang}">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${esc(title)}</title>
<meta name="description" content="${esc(description)}">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Noto+Sans:wght@400;500;600&family=Noto+Serif:ital,wght@0,500;0,700;1,400&display=swap" rel="stylesheet">
<link rel="stylesheet" href="https://unpkg.com/maplibre-gl@5.24.0/dist/maplibre-gl.css">
<link rel="stylesheet" href="/style.css">
${extra}
</head>`;
}

export function renderSitePage(site, { lang, isAdmin }) {
  const c = site.content[lang].name ? site.content[lang] : site.content[other(lang)];
  const alt = site.content[other(lang)];
  const region = regionsConfig.regions.find((r) => r.id === site.region);
  const siteTitle = regionsConfig.siteTitle[lang];
  const facts = parseFacts(c.facts);
  const sources = c.sources.split('\n').map((s) => s.trim()).filter(Boolean);
  const gmaps = `https://www.google.com/maps/search/?api=1&query=${site.lat}%2C${site.lng}`;
  const cover = site.photos[0];
  const caption = (p) => p[`caption_${lang}`] || p[`caption_${other(lang)}`] || '';

  return `${head({ title: `${c.name} – ${siteTitle}`, description: c.summary, lang })}
<body class="page">
<header class="topbar">
  <a class="brand" href="/?lang=${lang}">${esc(siteTitle)}</a>
  <nav class="topbar-actions">
    ${isAdmin ? `<a class="btn btn-ghost" href="/admin/#/edit/${site.id}">${T.edit[lang]}</a>` : ''}
    <a class="btn btn-ghost lang-toggle" href="?lang=${other(lang)}">${other(lang).toUpperCase()}</a>
  </nav>
</header>

${!site.published ? `<div class="draft-banner">${T.draft[lang]}</div>` : ''}

<section class="hero${cover ? '' : ' hero-plain'}">
  ${cover ? `<img class="hero-img" src="${esc(cover.src)}" alt="${esc(caption(cover) || c.name)}">` : ''}
  <div class="hero-text">
    <a class="back" href="/?lang=${lang}&site=${encodeURIComponent(site.slug)}">${T.backToMap[lang]}</a>
    <span class="type-badge type-${site.type}">${TYPE_LABELS[site.type]?.[lang] ?? site.type}</span>
    <h1>${esc(c.name)}</h1>
    ${alt.name && alt.name !== c.name ? `<p class="alt-name">${esc(alt.name)}</p>` : ''}
    <p class="hero-loc">${esc(c.location)}${region ? ` · ${esc(region.name[lang])}` : ''}</p>
  </div>
</section>

<main class="site-layout">
  <article class="site-body">
    ${c.summary ? `<p class="lead">${inline(c.summary)}</p>` : ''}
    ${markdown(c.body)}

    ${site.photos.length ? `
    <h2>${T.photos[lang]}</h2>
    <div class="gallery">
      ${site.photos.map((p, i) => `
      <figure>
        <button type="button" class="gallery-item" data-index="${i}">
          <img src="${esc(p.src)}" alt="${esc(caption(p) || c.name)}" loading="lazy">
        </button>
        ${caption(p) || p.credit ? `<figcaption>${esc(caption(p))}${p.credit ? ` <span class="credit">© ${esc(p.credit)}</span>` : ''}</figcaption>` : ''}
      </figure>`).join('')}
    </div>` : ''}

    ${sources.length ? `
    <h2>${T.sources[lang]}</h2>
    <ol class="sources">${sources.map((s) => `<li>${inline(s)}</li>`).join('')}</ol>` : ''}
  </article>

  <aside class="site-aside">
    <div class="card">
      <h2>${T.details[lang]}</h2>
      <dl class="facts">
        <dt>${T.type[lang]}</dt><dd>${TYPE_LABELS[site.type]?.[lang] ?? esc(site.type)}</dd>
        ${c.location ? `<dt>${T.location[lang]}</dt><dd>${esc(c.location)}</dd>` : ''}
        ${facts.map(([k, v]) => `<dt>${esc(k)}</dt><dd>${inline(v)}</dd>`).join('')}
        <dt>${T.coords[lang]}</dt><dd><span class="mono">${site.lat.toFixed(6)}, ${site.lng.toFixed(6)}</span></dd>
      </dl>
    </div>
    <div class="card card-map">
      <div id="mini-map" data-lat="${site.lat}" data-lng="${site.lng}" data-type="${site.type}" data-region="${esc(region?.boundary ?? '')}"></div>
      ${!site.coords_verified ? `<p class="approx">${T.approx[lang]}</p>` : ''}
      <a class="btn btn-primary btn-block" href="${gmaps}" target="_blank" rel="noopener">${T.openMaps[lang]} ↗</a>
    </div>
  </aside>
</main>

<dialog id="lightbox" aria-label="${T.photos[lang]}">
  <button type="button" class="lb-close" aria-label="Close">×</button>
  <button type="button" class="lb-prev" aria-label="Previous">‹</button>
  <figure><img alt=""><figcaption></figcaption></figure>
  <button type="button" class="lb-next" aria-label="Next">›</button>
</dialog>

<script>window.PHOTOS = ${JSON.stringify(site.photos.map((p) => ({ src: p.src, caption: caption(p), credit: p.credit }))).replace(/</g, '\\u003c')};</script>
<script src="https://unpkg.com/maplibre-gl@5.24.0/dist/maplibre-gl.js"></script>
<script src="/common.js"></script>
<script src="/terrain.js"></script>
<script src="/site.js"></script>
</body>
</html>`;
}
