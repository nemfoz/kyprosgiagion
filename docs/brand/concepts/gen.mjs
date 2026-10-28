// Brand concept boards for Odoiporiko: writes all.html (cover, overview, 15 boards).
// PDF: Chrome --headless=new --allow-file-access-from-files --no-pdf-header-footer --print-to-pdf=../Odoiporiko-15-brand-ideas.pdf file://$PWD/all.html
import { writeFileSync } from "node:fs";

const FONTS = new URL("../../../assets/fonts", import.meta.url).pathname;
const C = { crimson: "#6b1d1d", gold: "#ad8840", parchment: "#ece8de", ink: "#2c1010", goldDeep: "#76592a", card: "#f6f4ef" };

// Each mark draws in a 200x200 box. fg = main colour, ac = accent, bg = colour behind it.
const dome = (x, y, w, fill, cut) => {
  // Byzantine church: body with arched door, drum, dome, cross. Centred at x, base at y, width w.
  const bt = y - w * 0.4, dt = bt - w * 0.13, r = w * 0.27, dh = w * 0.3;
  return `<g fill="${fill}">
    <rect x="${x - w / 2}" y="${bt}" width="${w}" height="${y - bt}"/>
    <path d="M${x - w * 0.56} ${bt + 0.5} L${x} ${bt - w * 0.09} L${x + w * 0.56} ${bt + 0.5} Z"/>
    <rect x="${x - r}" y="${dt}" width="${2 * r}" height="${bt - dt + 1}"/>
    <path d="M${x - r * 1.08} ${dt + 0.5} A ${r * 1.08} ${dh} 0 0 1 ${x + r * 1.08} ${dt + 0.5} Z"/>
    <rect x="${x - w * 0.03}" y="${dt - dh - w * 0.2}" width="${w * 0.06}" height="${w * 0.22}"/>
    <rect x="${x - w * 0.1}" y="${dt - dh - w * 0.14}" width="${w * 0.2}" height="${w * 0.055}"/>
  </g>${cut ? `<path d="M${x - w * 0.1} ${y} L${x - w * 0.1} ${y - w * 0.16} A ${w * 0.1} ${w * 0.1} 0 0 1 ${x + w * 0.1} ${y - w * 0.16} L${x + w * 0.1} ${y} Z" fill="${cut}"/>` : ""}`;
};

const concepts = [
  {
    slug: "1-path",
    title: "1 · Το μονοπάτι",
    sub: "The path — a dotted pilgrim's route that ends at a domed map pin.",
    idea: "Ο δρόμος του προσκυνητή καταλήγει σε καρφίτσα-εκκλησία. Λέει «χάρτης» και «οδοιπορικό» με μια ματιά.",
    mark: (fg, ac, bg) => `
      <path d="M14 190 C 40 186, 44 160, 72 160 S 100 178, 116 170" fill="none" stroke="${ac}" stroke-width="7" stroke-linecap="round" stroke-dasharray="0.1 15"/>
      <path d="M128 176 C 128 176 84 120 84 88 A 44 44 0 0 1 172 88 C 172 120 128 176 128 176 Z" fill="${fg}"/>
      ${dome(128, 112, 50, bg, fg)}`,
    wordFont: "serif",
  },
  {
    slug: "2-compass",
    title: "2 · Η πυξίδα",
    sub: "The compass — an old-atlas compass rose with a cross for North and a dome at its heart.",
    idea: "Σφραγίδα παλιού χάρτη: ο Βορράς είναι ο Σταυρός. Επίσημο, «εκκλησιαστικό», ταιριάζει σε συνεργασία με Μητροπόλεις.",
    mark: (fg, ac, bg) => {
      const pts = [];
      for (let i = 0; i < 8; i++) {
        const a = (i * Math.PI) / 4, long = i % 2 === 0 ? 74 : 46, w = 11;
        const p = (r, da) => `${100 + r * Math.sin(a + da)} ${100 - r * Math.cos(a + da)}`;
        pts.push(`<path d="M${p(long, 0)} L${p(w, Math.PI / 4)} L100 100 Z" fill="${i % 2 ? ac : fg}"/>`);
        pts.push(`<path d="M${p(long, 0)} L${p(w, -Math.PI / 4)} L100 100 Z" fill="${i % 2 ? ac : fg}" opacity="0.72"/>`);
      }
      return `
      <circle cx="100" cy="100" r="92" fill="none" stroke="${ac}" stroke-width="3"/>
      <circle cx="100" cy="100" r="84" fill="none" stroke="${ac}" stroke-width="1.2" stroke-dasharray="1 5"/>
      ${pts.slice(2).join("")}
      <g fill="${fg}"><rect x="95" y="2" width="10" height="34"/><rect x="85" y="11" width="30" height="8"/></g>
      <circle cx="100" cy="100" r="30" fill="${bg}" stroke="${ac}" stroke-width="3"/>
      ${dome(100, 118, 34, fg, bg)}`;
    },
    wordFont: "serif",
  },
  {
    slug: "3-lamp",
    title: "3 · Η κανδήλα",
    sub: "The vigil lamp — every church on the map is a lamp; contributors light them.",
    idea: "Κάθε εκκλησία ένα αναμμένο καντήλι. Ζεστό, λαϊκό, συγκινητικό — και η φλόγα είναι σχήμα καρφίτσας ανάποδα.",
    mark: (fg, ac, bg) => `
      <circle cx="100" cy="92" r="58" fill="${ac}" opacity="0.18"/>
      <circle cx="100" cy="92" r="36" fill="${ac}" opacity="0.22"/>
      <g stroke="${ac}" stroke-width="2.2" fill="none">
        <path d="M100 8 L100 20"/><circle cx="100" cy="24" r="4"/>
        <path d="M100 28 L58 126 M100 28 L142 126 M100 28 L100 118"/>
      </g>
      <path d="M100 58 C 112 76, 116 88, 116 98 A 16 16 0 0 1 84 98 C 84 88, 88 76, 100 58 Z" fill="${ac}"/>
      <path d="M100 80 C 105 88, 107 94, 107 99 A 7 7 0 0 1 93 99 C 93 94, 95 88, 100 80 Z" fill="${bg}" opacity="0.9"/>
      <path d="M50 120 L150 120 C 146 150, 126 166, 100 166 C 74 166, 54 150, 50 120 Z" fill="${fg}"/>
      <rect x="46" y="114" width="108" height="10" rx="3" fill="${fg}"/>
      <path d="M92 166 L108 166 L104 182 L96 182 Z" fill="${fg}"/>
      <circle cx="100" cy="188" r="6" fill="${fg}"/>
      <g fill="${ac}"><circle cx="72" cy="140" r="3.2"/><circle cx="100" cy="146" r="3.2"/><circle cx="128" cy="140" r="3.2"/></g>`,
    wordFont: "serif",
  },
  {
    slug: "4-monogram",
    title: "4 · Το αρχικό Ο",
    sub: "The illuminated Ο — the initial letter drawn as a road that circles a church, like a manuscript initial.",
    idea: "Αρχιγράμματο από χειρόγραφο: το «Ο» είναι δρόμος που κάνει κύκλο γύρω από εκκλησία. Λιτό, κομψό, δουλεύει τέλεια σαν εικονίδιο εφαρμογής.",
    mark: (fg, ac, bg) => `
      <rect x="8" y="8" width="184" height="184" fill="none" stroke="${ac}" stroke-width="2.5"/>
      <rect x="15" y="15" width="170" height="170" fill="none" stroke="${ac}" stroke-width="1"/>
      ${[[8, 8], [192, 8], [8, 192], [192, 192]].map(([x, y]) => `<rect x="${x - 6}" y="${y - 6}" width="12" height="12" transform="rotate(45 ${x} ${y})" fill="${ac}"/>`).join("")}
      <ellipse cx="100" cy="102" rx="62" ry="70" fill="none" stroke="${fg}" stroke-width="26"/>
      <ellipse cx="100" cy="102" rx="62" ry="70" fill="none" stroke="${bg}" stroke-width="3" stroke-dasharray="9 9"/>
      ${dome(100, 138, 48, ac, bg)}
      <rect x="64" y="138" width="72" height="4" fill="${ac}"/>`,
    wordFont: "caps",
  },
  {
    slug: "5-bell",
    title: "5 · Το καμπαναριό",
    sub: "The bell tower — the arched belfry seen from every village, with the bell ringing out.",
    idea: "Το καμπαναριό είναι αυτό που βλέπεις πρώτο από μακριά σε κάθε χωριό. Καλεί, μαζεύει, προσανατολίζει.",
    mark: (fg, ac, bg) => `
      <path d="M58 184 L58 82 A42 42 0 0 1 142 82 L142 184 Z" fill="${fg}"/>
      <path d="M76 150 L76 88 A24 24 0 0 1 124 88 L124 150 Z" fill="${bg}"/>
      <path d="M100 90 C88 90 86 104 86 118 C86 126 82 130 79 136 L121 136 C118 130 114 126 114 118 C114 104 112 90 100 90 Z" fill="${ac}"/>
      <circle cx="100" cy="142" r="5" fill="${ac}"/>
      <g fill="${fg}"><rect x="96" y="10" width="8" height="32"/><rect x="86" y="18" width="28" height="7"/><rect x="48" y="182" width="104" height="9"/></g>
      <g fill="none" stroke="${ac}" stroke-width="4" stroke-linecap="round">
        <path d="M154 98 q12 20 0 40"/><path d="M168 88 q22 30 0 60"/><path d="M46 98 q-12 20 0 40"/><path d="M32 88 q-22 30 0 60"/>
      </g>`,
    wordFont: "serif",
  },
  {
    slug: "6-steps",
    title: "6 · Τα βήματα",
    sub: "Footsteps — a pilgrim's steps leading up to a church.",
    idea: "Βήμα-βήμα ως την εκκλησία. Ανθρώπινο και απλό· κάθε συνεισφορά είναι ένα ακόμη βήμα.",
    mark: (fg, ac, bg) => {
      const foot = (x, y, r) => `<g transform="translate(${x} ${y}) rotate(${r})" fill="${ac}"><ellipse cx="0" cy="0" rx="7.5" ry="12"/><ellipse cx="0" cy="17" rx="5.5" ry="6"/></g>`;
      return `${foot(34, 168, 30)}${foot(58, 178, 30)}${foot(64, 136, 34)}${foot(88, 146, 34)}${foot(96, 106, 38)}${foot(118, 116, 38)}
      ${dome(148, 84, 64, fg, bg)}
      <path d="M100 86 L196 86" stroke="${fg}" stroke-width="4"/>`;
    },
    wordFont: "sans",
  },
  {
    slug: "7-east",
    title: "7 · Η ανατολή",
    sub: "Sunrise in the East — every Orthodox church faces the rising sun.",
    idea: "Κάθε ορθόδοξος ναός «βλέπει» ανατολικά. Ο ήλιος που ανατέλλει πίσω από το εκκλησάκι στον λόφο: φως, ελπίδα, προσανατολισμός.",
    mark: (fg, ac, bg) => {
      const rays = [];
      for (let i = 0; i < 9; i++) {
        const a = Math.PI + (i + 0.5) * (Math.PI / 9), c = Math.cos(a), s = Math.sin(a);
        rays.push(`<path d="M${100 + 62 * c} ${132 + 62 * s} L${100 + 84 * c} ${132 + 84 * s}" />`);
      }
      return `<g stroke="${ac}" stroke-width="5" stroke-linecap="round">${rays.join("")}</g>
      <path d="M48 132 A52 52 0 0 1 152 132 Z" fill="${ac}"/>
      <path d="M6 168 Q100 112 194 168 L194 192 L6 192 Z" fill="${fg}"/>
      ${dome(100, 142, 58, fg, ac)}`;
    },
    wordFont: "caps",
  },
  {
    slug: "8-book",
    title: "8 · Το βιβλίο",
    sub: "The open book — the travelogue itself; its pages hold the road and the church.",
    idea: "Οδοιπορικό είναι και κείμενο: ένα ανοιχτό βιβλίο όπου ο δρόμος περνά από τη μια σελίδα στην άλλη. Τονίζει την ιστορία και τις πηγές.",
    mark: (fg, ac, bg) => `
      <path d="M100 58 C78 44 42 44 14 54 L14 172 C42 162 78 162 100 176 C122 162 158 162 186 172 L186 54 C158 44 122 44 100 58 Z" fill="${bg}" stroke="${fg}" stroke-width="7" stroke-linejoin="round"/>
      <path d="M100 58 L100 176" stroke="${fg}" stroke-width="5"/>
      <path d="M30 150 C 50 130, 70 150, 84 124 S 112 120, 122 140" fill="none" stroke="${ac}" stroke-width="5" stroke-linecap="round" stroke-dasharray="0.1 11"/>
      ${dome(150, 146, 44, fg, bg)}
      <g stroke="${ac}" stroke-width="3" opacity=".7"><path d="M30 76 L84 70"/><path d="M30 90 L84 84"/><path d="M30 104 L70 99"/></g>`,
    wordFont: "serif",
  },
  {
    slug: "9-stamp",
    title: "9 · Η σφραγίδα",
    sub: "The pilgrim's stamp — a postmark for every church visited, like a pilgrim passport.",
    idea: "Σφραγίδα ταξιδιού: κάθε εκκλησία που επισκέπτεσαι ή συμπληρώνεις «σφραγίζει» το προσωπικό σου οδοιπορικό. Δένει τέλεια με το παιχνίδι των πόντων.",
    mark: (fg, ac, bg) => `
      <defs><path id="ring" d="M100 100 m-61 0 a61 61 0 1 1 122 0 a61 61 0 1 1 -122 0"/></defs>
      <circle cx="100" cy="100" r="88" fill="none" stroke="${fg}" stroke-width="6"/>
      <circle cx="100" cy="100" r="76" fill="none" stroke="${fg}" stroke-width="2"/>
      <text font-family="Serif" font-size="14" fill="${fg}"><textPath href="#ring" textLength="376" lengthAdjust="spacing">ΟΔΟΙΠΟΡΙΚΟ ✦ ΚΥΠΡΟΣ ✦ ΑΓΙΩΝ ΓΗ ✦</textPath></text>
      <circle cx="100" cy="100" r="46" fill="none" stroke="${ac}" stroke-width="2.5"/>
      ${dome(100, 124, 46, fg, bg)}`,
    wordFont: "caps",
  },
  {
    slug: "10-contours",
    title: "10 · Οι ισοϋψείς",
    sub: "Contour lines — a topographic map, with a cross at the summit.",
    idea: "Οι καμπύλες του τοπογραφικού χάρτη, όπως στον τρισδιάστατο χάρτη μας. Στην κορυφή ο Σταυρός. Σύγχρονο, «χαρτογραφικό».",
    mark: (fg, ac, bg) => {
      const rings = [];
      for (let k = 0; k < 5; k++) {
        const pts = [];
        for (let i = 0; i <= 72; i++) {
          const t = (i / 72) * 2 * Math.PI, r = (26 + k * 16) * (1 + 0.1 * Math.sin(3 * t + k * 0.7) + 0.05 * Math.cos(5 * t - k));
          pts.push(`${(100 + r * Math.cos(t)).toFixed(1)} ${(104 + r * 0.86 * Math.sin(t)).toFixed(1)}`);
        }
        rings.push(`<path d="M${pts.join(" L")} Z" fill="none" stroke="${k === 2 ? ac : fg}" stroke-width="${k === 2 ? 4 : 3}"/>`);
      }
      return `${rings.join("")}<g fill="${fg}"><rect x="95" y="74" width="10" height="46"/><rect x="83" y="86" width="34" height="9"/></g>`;
    },
    wordFont: "sans",
  },
  {
    slug: "11-constellation",
    title: "11 · Ο αστερισμός",
    sub: "The constellation — churches joined into a route, like stars into a figure.",
    idea: "Οι εκκλησίες ενώνονται σε διαδρομή σαν αστέρια σε αστερισμό. Δείχνει το δίκτυο που μεγαλώνει από την Κύπρο σε όλη την Ορθοδοξία.",
    mark: (fg, ac, bg) => {
      const pin = (x, y, s, fill) => `<path transform="translate(${x} ${y}) scale(${s})" d="M0 0 C0 0 -18 -22 -18 -34 A18 18 0 0 1 18 -34 C18 -22 0 0 0 0 Z" fill="${fill}"/>`;
      const P = [[40, 170], [78, 112], [136, 140], [150, 72]];
      return `<path d="M${P.map((p) => p.join(" ")).join(" L")}" fill="none" stroke="${ac}" stroke-width="3.5" stroke-dasharray="3 7" stroke-linecap="round"/>
      ${[[24, 40], [70, 34], [176, 168], [110, 186], [184, 116]].map(([x, y]) => `<circle cx="${x}" cy="${y}" r="3" fill="${ac}"/>`).join("")}
      ${pin(40, 170, 0.9, fg)}${pin(78, 112, 1.05, fg)}${pin(136, 140, 0.95, fg)}${pin(150, 72, 1.7, fg)}
      <g fill="${bg}"><rect x="147" y="2" width="6" height="26" transform="translate(0 10)"/><rect x="140" y="18" width="20" height="5"/></g>`;
    },
    wordFont: "sans",
  },
  {
    slug: "12-halo",
    title: "12 · Το φωτοστέφανο",
    sub: "The halo — a map pin crowned with an icon's golden halo, carrying the Orthodox cross.",
    idea: "Η καρφίτσα με φωτοστέφανο, όπως στις εικόνες, και ο ορθόδοξος σταυρός με τη λοξή κάτω κεραία. Αμέσως αναγνωρίσιμα ορθόδοξο.",
    mark: (fg, ac, bg) => `
      <circle cx="100" cy="80" r="70" fill="${ac}" opacity=".22"/>
      <circle cx="100" cy="80" r="70" fill="none" stroke="${ac}" stroke-width="4"/>
      <circle cx="100" cy="80" r="62" fill="none" stroke="${ac}" stroke-width="2" stroke-dasharray="1 7" stroke-linecap="round"/>
      <path d="M100 190 C100 190 50 126 50 88 A50 50 0 0 1 150 88 C150 126 100 190 100 190 Z" fill="${fg}"/>
      <g fill="${bg}"><rect x="96" y="48" width="8" height="78"/><rect x="88" y="58" width="24" height="6"/><rect x="80" y="72" width="40" height="8"/></g>
      <path d="M84 110 L116 100" stroke="${bg}" stroke-width="7"/>`,
    wordFont: "serif",
  },
  {
    slug: "13-mosaic",
    title: "13 · Το ψηφιδωτό",
    sub: "The mosaic — a map pin built from Byzantine tesserae; every tile is one contribution.",
    idea: "Βυζαντινό ψηφιδωτό σε σχήμα καρφίτσας: κάθε ψηφίδα μια συνεισφορά. Ο χάρτης γεμίζει όπως ένα ψηφιδωτό, κομμάτι-κομμάτι.",
    mark: (fg, ac, bg) => {
      const cells = [];
      let seed = 7;
      const rnd = () => ((seed = (seed * 9301 + 49297) % 233280) / 233280);
      for (let y = 10; y < 196; y += 11) for (let x = 10; x < 196; x += 11) {
        const cx = x + 5, cy = y + 5;
        const inHead = (cx - 100) ** 2 + (cy - 80) ** 2 < 66 ** 2;
        const inTail = cy > 80 && cy < 192 && Math.abs(cx - 100) < 58 * (1 - (cy - 80) / 112) ** 1.15;
        if (!inHead && !inTail) continue;
        const cross = (Math.abs(cx - 100) < 8 && cy > 42 && cy < 124) || (Math.abs(cy - 72) < 8 && Math.abs(cx - 100) < 32);
        const v = rnd();
        cells.push(`<rect x="${x + rnd() * 0.8}" y="${y + rnd() * 0.8}" width="9.6" height="9.6" rx="1.2" fill="${cross ? ac : fg}" opacity="${cross ? 1 : 0.7 + v * 0.3}"/>`);
      }
      return cells.join("");
    },
    wordFont: "caps",
  },
  {
    slug: "14-candle",
    title: "14 · Το κερί",
    sub: "The candle — lighting a candle at every church you visit.",
    idea: "Ανάβεις ένα κερί σε κάθε εκκλησία που περνάς. Τρία κεριά στο μανουάλι: απλό, οικείο σε κάθε ορθόδοξο.",
    mark: (fg, ac, bg) => `
      <circle cx="100" cy="46" r="34" fill="${ac}" opacity=".2"/>
      <path d="M100 18 C110 32 113 42 113 50 A13 13 0 0 1 87 50 C87 42 90 32 100 18 Z" fill="${fg}"/>
      <path d="M100 36 C104 42 105 46 105 50 A5 5 0 0 1 95 50 C95 46 96 42 100 36 Z" fill="${bg}"/>
      <rect x="93" y="66" width="14" height="104" rx="3" fill="${ac}"/>
      <rect x="61" y="104" width="12" height="66" rx="3" fill="${ac}" opacity=".85"/>
      <rect x="127" y="96" width="12" height="74" rx="3" fill="${ac}" opacity=".85"/>
      <path d="M67 90 C71 96 72 99 72 102 A5 5 0 0 1 62 102 C62 99 63 96 67 90 Z" fill="${fg}"/>
      <path d="M133 82 C137 88 138 91 138 94 A5 5 0 0 1 128 94 C128 91 129 88 133 82 Z" fill="${fg}"/>
      <path d="M30 168 L170 168 L158 190 L42 190 Z" fill="${fg}"/>`,
    wordFont: "serif",
  },
  {
    slug: "15-signpost",
    title: "15 · Ο οδοδείκτης",
    sub: "The signpost — a wayside post topped with a cross, pointing to churches in every direction.",
    idea: "Ο πινακοδείκτης στο σταυροδρόμι, με σταυρό στην κορυφή: «από εδώ για την εκκλησία». Φιλικό, πρακτικό, δείχνει τι κάνει η εφαρμογή.",
    mark: (fg, ac, bg) => `
      <g fill="${fg}"><rect x="94" y="40" width="12" height="146"/><rect x="96" y="8" width="8" height="34"/><rect x="85" y="17" width="30" height="7"/></g>
      <path d="M106 62 L166 62 L182 78 L166 94 L106 94 Z" fill="${ac}"/>
      <path d="M94 106 L36 106 L20 122 L36 138 L94 138 Z" fill="${fg}"/>
      ${dome(148, 90, 22, bg)}${dome(52, 134, 22, bg)}
      <path d="M40 188 Q100 178 160 188" stroke="${ac}" stroke-width="5" fill="none" stroke-linecap="round"/>`,
    wordFont: "sans",
  },
];

const svg =(c, fg, ac, bg, size, extra = "") =>
  `<svg viewBox="0 0 200 200" width="${size}" height="${size}" ${extra}>${c.mark(fg, ac, bg)}</svg>`;

const css = `
@font-face{font-family:Serif;src:url("file://${FONTS}/NotoSerif-Bold.ttf")}
@font-face{font-family:Sans;src:url("file://${FONTS}/NotoSans-Medium.ttf")}
@page{size:1600px 1000px;margin:0}
*{box-sizing:border-box;margin:0;-webkit-print-color-adjust:exact;print-color-adjust:exact}
body{background:${C.parchment};color:${C.ink};font-family:Sans}
.page{width:1600px;height:1000px;overflow:hidden;background:${C.parchment};padding:56px 64px;display:grid;grid-template-rows:auto 1fr auto;gap:28px;break-after:page}
.top{display:flex;justify-content:space-between;align-items:baseline;border-bottom:1.5px solid ${C.gold};padding-bottom:16px}
.top h1{font-family:Serif;font-size:34px;color:${C.crimson}}
.top p{font-size:19px;color:${C.goldDeep};max-width:960px;text-align:right}
.main{display:grid;grid-template-columns:auto 1fr;gap:64px;align-items:center}
.lock{display:flex;flex-direction:column;gap:10px}
.el{font-family:Serif;font-size:96px;color:${C.crimson};line-height:1}
.lat{font-family:Serif;font-size:30px;letter-spacing:.42em;color:${C.goldDeep}}
.caps .el{font-size:78px;letter-spacing:.08em}
.sans .el{font-family:Sans;font-size:92px;letter-spacing:-.01em}
.sans .lat{font-family:Sans;letter-spacing:.5em}
.tag{font-size:21px;color:${C.ink};opacity:.8;margin-top:14px;line-height:1.5}
.idea{font-size:19px;line-height:1.5;margin-top:22px;max-width:760px;color:${C.ink};border-left:3px solid ${C.gold};padding-left:16px}
.row{display:grid;grid-template-columns:auto auto 1fr auto;gap:28px;align-items:end}
.cap{font-size:14px;color:${C.goldDeep};margin-top:8px;text-transform:uppercase;letter-spacing:.12em}
.icon{width:150px;height:150px;border-radius:34px;background:${C.crimson};display:grid;place-items:center}
.dark{height:150px;padding:0 34px;border-radius:14px;background:${C.crimson};display:flex;align-items:center;gap:18px}
.dark span{font-family:Serif;font-size:44px;color:${C.parchment}}
.ed{height:150px;padding:0 30px;border-radius:14px;background:${C.card};border:1px solid ${C.gold};display:flex;align-items:center;gap:16px}
.ed b{font-family:Serif;font-size:34px;color:${C.crimson};font-weight:normal}
.ed i{font-style:normal;font-size:26px;color:${C.goldDeep}}
.sw{display:flex;gap:10px}.sw div{width:46px;height:150px;border-radius:10px;border:1px solid #0002}
.cover{display:flex;flex-direction:column;justify-content:center;align-items:center;text-align:center;gap:18px;background:${C.crimson};color:${C.parchment}}
.cover .el{color:${C.parchment};font-size:140px}.cover .lat{color:${C.gold};font-size:36px}
.cover p{font-size:24px;opacity:.85;line-height:1.6;margin-top:30px}
.grid{display:grid;grid-template-columns:repeat(5,1fr);gap:18px;align-content:center}
.grid div{background:${C.card};border:1px solid ${C.gold};border-radius:14px;padding:16px 10px 14px;display:flex;flex-direction:column;align-items:center;gap:8px}
.grid span{font-family:Serif;font-size:19px;color:${C.crimson}}
`;

const board = (c) => `<section class="page">
<div class="top"><h1>${c.title}</h1><p>${c.sub}</p></div>
<div class="main">
  ${svg(c, C.crimson, C.gold, C.parchment, 430)}
  <div class="lock ${c.wordFont}">
    <div class="el">${c.wordFont === "caps" ? "ΟΔΟΙΠΟΡΙΚΟ" : "Οδοιπορικό"}</div>
    <div class="lat">ODOIPORIKO</div>
    <div class="tag">Οδοιπορικό στις εκκλησίες και τα μοναστήρια της Ορθοδοξίας<br>A pilgrim's atlas of Orthodox churches</div>
    <div class="idea">${c.idea}</div>
  </div>
</div>
<div class="row">
  <div><div class="icon">${svg(c, C.parchment, C.gold, C.crimson, 116)}</div><div class="cap">App icon</div></div>
  <div><div class="dark">${svg(c, C.parchment, C.gold, C.crimson, 96)}<span>Οδοιπορικό</span></div><div class="cap">On crimson</div></div>
  <div><div class="ed">${svg(c, C.crimson, C.gold, C.card, 92)}<div><b>Οδοιπορικό</b><br><i>Κύπρος – Αγίων Γη</i></div></div><div class="cap">Regional edition</div></div>
  <div><div class="sw"><div style="background:${C.crimson}"></div><div style="background:${C.gold}"></div><div style="background:${C.parchment}"></div></div><div class="cap">Palette</div></div>
</div>
</section>`;

const cover = `<section class="page cover">
  <div class="el">Οδοιπορικό</div><div class="lat">ODOIPORIKO</div>
  <p>15 ιδέες λογοτύπου και ταυτότητας · 15 logo &amp; brand ideas<br>odoiporiko.com · ${new Date().toISOString().slice(0, 10)}</p>
</section>`;

const overview = `<section class="page">
<div class="top"><h1>Όλες οι ιδέες · Overview</h1><p>Crimson, gold and parchment — the site's three colours.</p></div>
<div class="grid">${concepts.map((c) => `<div>${svg(c, C.crimson, C.gold, C.card, 130)}<span>${c.title}</span></div>`).join("")}</div>
<div></div>
</section>`;

const dir = new URL(".", import.meta.url).pathname;
writeFileSync(`${dir}all.html`, `<!doctype html><html><head><meta charset="utf-8"><style>${css}</style></head><body>${cover}${overview}${concepts.map(board).join("")}</body></html>`);
console.log("ok", concepts.length);
