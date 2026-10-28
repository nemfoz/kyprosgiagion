// The fixed information pages (/about, /contact, /privacy, /cookies, /terms) and the details shown in the
// footer. The texts below are the defaults; superadmins can rewrite them and set the contact e-mail and the
// Foundation's link at /admin/pages (stored in `settings` under the key "pages").
//
// Texts are simple Markdown (lib/content.ts markdown()). {email}, {foundation} and {site} are filled in.
import type { Lang } from "@/lib/content"

export const INFO_PAGES = ["about", "contact", "privacy", "cookies", "terms"] as const
export type InfoPage = (typeof INFO_PAGES)[number]
export const isInfoPage = (v: unknown): v is InfoPage => (INFO_PAGES as readonly string[]).includes(v as string)

/** The interface text key with each page's title. */
export const PAGE_TITLE_KEY = {
  about: "pageAbout", contact: "pageContact", privacy: "pagePrivacy", cookies: "pageCookies", terms: "pageTerms",
} as const satisfies Record<InfoPage, string>

export type SiteInfo = {
  contactEmail: string
  foundationUrl: string
  /** Rewritten page texts (empty = the default below). */
  pages: Partial<Record<InfoPage, Partial<Record<Lang, string>>>>
  updatedAt?: string
}

export const DEFAULT_INFO: SiteInfo = { contactEmail: "contact@odoiporiko.com", foundationUrl: "", pages: {} }

export function normaliseInfo(raw: unknown): SiteInfo {
  const r = (raw && typeof raw === "object" ? raw : {}) as Partial<SiteInfo>
  const str = (v: unknown, max = 300) => (typeof v === "string" ? v.trim().slice(0, max) : "")
  const pages: SiteInfo["pages"] = {}
  for (const p of INFO_PAGES) {
    for (const l of ["el", "en"] as const) {
      const text = str(r.pages?.[p]?.[l], 30000)
      if (text && text !== DEFAULT_PAGES[p][l]) (pages[p] ??= {})[l] = text
    }
  }
  const url = str(r.foundationUrl)
  return {
    contactEmail: /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(str(r.contactEmail)) ? str(r.contactEmail) : DEFAULT_INFO.contactEmail,
    foundationUrl: /^https?:\/\//.test(url) ? url : "",
    pages,
    updatedAt: str(r.updatedAt) || undefined,
  }
}

/** A page's text in Greek or English (other languages read the English one), with the placeholders filled. */
export function pageText(info: SiteInfo, page: InfoPage, lang: Lang) {
  const text = info.pages[page]?.[lang] || DEFAULT_PAGES[page][lang]
  const foundation = info.foundationUrl ? `[El Frank Foundation](${info.foundationUrl})` : "El Frank Foundation"
  return text.replaceAll("{email}", info.contactEmail).replaceAll("{foundation}", foundation).replaceAll("{site}", lang === "el" ? "Οδοιπορικό" : "Odoiporiko")
}

export const DEFAULT_PAGES: Record<InfoPage, Record<Lang, string>> = {
  about: {
    el: `Το **{site}** είναι ένας ελεύθερος, διαδραστικός χάρτης των ορθόδοξων εκκλησιών και μοναστηριών, με την ιστορία, τις φωτογραφίες και τις πηγές τους. Οδοιπορικό σημαίνει το ταξίδι και μαζί την αφήγησή του: τον χάρτη που ακολουθείτε και τις σελίδες που γράφουμε όλοι μαζί.

## Η πρώτη έκδοση: Κύπρος – Αγίων Γη

Ξεκινάμε από την Εκκλησία της Κύπρου, με την επαρχία Αμμοχώστου και τη χερσόνησο της Καρπασίας. Πολλοί από αυτούς τους ναούς βρίσκονται στις κατεχόμενες περιοχές· η καταγραφή τους κρατά ζωντανή τη μνήμη τους. Ακολουθούν οι υπόλοιπες επαρχίες και, με τον καιρό, και άλλες τοπικές Ορθόδοξες Εκκλησίες.

## Πώς γράφεται

Κάθε σελίδα μπορεί να τη συμπληρώσει όποιος γνωρίζει κάτι: ιστορικά, φωτογραφίες (και παλιές), πηγές, μεταφράσεις ή την ακριβή θέση του ναού. Κάθε πρόταση ελέγχεται από διαχειριστή πριν δημοσιευτεί. Κείμενα και φωτογραφίες από άλλες πηγές δημοσιεύονται πάντα με σύνδεσμο προς την πηγή τους.

## Ποιοι είμαστε

Το {site} είναι ένα έργο του {foundation}, που προσφέρεται δωρεάν στην Εκκλησία. Την τεχνική υλοποίηση έχει το [hnf.sh](https://hnf.sh).

Για ερωτήσεις, διορθώσεις ή συνεργασία: {email}.`,
    en: `**{site}** is a free, interactive map of Orthodox churches and monasteries, with their history, photographs and sources. An *odoiporiko* is a journey and the written account of it: the map you travel and the pages we all write together.

## The first edition: Cyprus – Land of Saints

We are starting with the Church of Cyprus, with Famagusta District and the Karpasia peninsula. Many of these churches are in the occupied areas; recording them keeps their memory alive. The other districts will follow and, in time, other local Orthodox Churches.

## How it is written

Anyone who knows something can help complete a page: history, photographs (old ones too), sources, translations or the church's exact location. Every proposal is reviewed by an admin before it is published. Texts and photographs from other sources are always published with a link to where they came from.

## Who we are

{site} is a project of the {foundation}, offered to the Church free of charge. It is built and run by [hnf.sh](https://hnf.sh).

For questions, corrections or to work with us: {email}.`,
  },
  contact: {
    el: `Θα χαρούμε να ακούσουμε από εσάς — για διορθώσεις, φωτογραφίες, πληροφορίες για έναν ναό, ή αν θέλετε να ξεκινήσει η έκδοση της δικής σας Εκκλησίας ή Μητρόπολης.

Γράψτε μας στο **{email}**.

Για προσθήκες σε μια σελίδα εκκλησίας, ο πιο γρήγορος τρόπος είναι να δημιουργήσετε λογαριασμό και να πατήσετε «Πρόταση αλλαγής» στη σελίδα της: η πρότασή σας πηγαίνει κατευθείαν στους διαχειριστές.`,
    en: `We'd love to hear from you — about corrections, photographs, information on a church, or if you would like an edition for your own Church or Metropolis.

Write to us at **{email}**.

To add to a church's page, the quickest way is to create an account and press "Suggest a change" on that page: your proposal goes straight to the admins.`,
  },
  privacy: {
    el: `Σεβόμαστε την ιδιωτικότητά σας και συλλέγουμε μόνο ό,τι χρειάζεται για να λειτουργήσει ο ιστότοπος. Υπεύθυνος επεξεργασίας είναι το {foundation} (επικοινωνία: {email}).

## Χωρίς λογαριασμό

Μπορείτε να χρησιμοποιήσετε τον χάρτη και όλες τις σελίδες χωρίς λογαριασμό. Δεν χρησιμοποιούμε εργαλεία στατιστικών, διαφημίσεων ή παρακολούθησης. Ο διακομιστής κρατά για λίγες ημέρες τεχνικά αρχεία καταγραφής (διεύθυνση IP, σελίδα, ώρα) για την ασφάλεια και τη διόρθωση σφαλμάτων.

## Με λογαριασμό

Όταν δημιουργείτε λογαριασμό, κρατάμε το όνομα και τη διεύθυνση e-mail σας και τον κωδικό σας σε κρυπτογραφημένη (hashed) μορφή. Κρατάμε επίσης τις προτάσεις σας και τους πόντους τους. Στον πίνακα συνεργατών εμφανίζεται μόνο το μικρό σας όνομα και το αρχικό του επωνύμου σας.

## Επισκέψεις σε εκκλησίες

Αν σημειώσετε ότι επισκεφθήκατε μια εκκλησία, κρατάμε ποια εκκλησία, πότε και αν επιβεβαιώθηκε επί τόπου. Με το «Είμαι εδώ», ο browser σας στέλνει μία φορά τη θέση σας για να ελεγχθεί η απόσταση από τον ναό· **η θέση σας δεν αποθηκεύεται**. Το «Κοντά μου» στον χάρτη χρησιμοποιεί τη θέση σας μόνο μέσα στον browser σας. Οι επισκέψεις σας είναι ιδιωτικές, εκτός αν ενεργοποιήσετε το δημόσιο προφίλ σας (μόνο όνομα, αριθμοί και διακρίσεις — ποτέ ημερομηνίες ή θέση).

## Υπηρεσίες τρίτων

- Ο χάρτης φορτώνει εικόνες εδάφους από το Mapterhorn και δορυφορικές εικόνες από την Esri· οι υπηρεσίες αυτές βλέπουν τη διεύθυνση IP σας.
- Τα βίντεο είναι από το YouTube, με τη λειτουργία βελτιωμένης ιδιωτικότητας (youtube-nocookie.com): τίποτα δεν φορτώνεται από το YouTube πριν πατήσετε αναπαραγωγή.
- Για την προστασία από spam στην εγγραφή μπορεί να χρησιμοποιηθεί το Cloudflare Turnstile, και για την αποστολή e-mail (επιβεβαίωση, κωδικός) η υπηρεσία Resend.

## Τα δικαιώματά σας

Μπορείτε να ζητήσετε αντίγραφο ή διόρθωση των στοιχείων σας, ή τη διαγραφή του λογαριασμού σας (μαζί με τις επισκέψεις σας), γράφοντας στο {email}. Οι εγκεκριμένες συνεισφορές σε σελίδες εκκλησιών παραμένουν, χωρίς το όνομά σας. Έχετε επίσης δικαίωμα καταγγελίας στην αρμόδια Αρχή Προστασίας Δεδομένων.`,
    en: `We respect your privacy and only collect what the site needs to work. The data controller is the {foundation} (contact: {email}).

## Without an account

You can use the map and every page without an account. We use no analytics, advertising or tracking tools. The server keeps technical logs (IP address, page, time) for a few days, for security and to fix errors.

## With an account

When you create an account we keep your name, your e-mail address and your password in hashed (unreadable) form. We also keep your proposals and their points. The contributors' board shows only your first name and last initial.

## Church visits

If you mark a church as visited, we keep which church, when, and whether it was confirmed on location. With "I'm here", your browser sends your location once so the distance to the church can be checked; **your location is not stored**. "Near me" on the map uses your location only inside your browser. Your visits are private unless you turn on your public profile (name, numbers and badges only — never dates or locations).

## Third-party services

- The map loads terrain from Mapterhorn and satellite images from Esri; these services see your IP address.
- Videos come from YouTube in privacy-enhanced mode (youtube-nocookie.com): nothing is loaded from YouTube until you press play.
- Cloudflare Turnstile may be used to stop spam sign-ups, and Resend to send e-mails (confirmation, password reset).

## Your rights

You can ask for a copy or a correction of your data, or for your account to be deleted (together with your visits), by writing to {email}. Approved contributions to church pages stay, without your name. You also have the right to complain to your data protection authority.`,
  },
  cookies: {
    el: `Ο ιστότοπος χρησιμοποιεί **μόνο απαραίτητα cookies** και τοπική αποθήκευση του browser. Δεν υπάρχουν cookies διαφημίσεων, στατιστικών ή τρίτων, γι' αυτό δεν σας ζητάμε συγκατάθεση — σας ενημερώνουμε μόνο.

## Τι αποθηκεύεται

- **Σύνδεση** (cookies "better-auth.*"): κρατούν τη σύνδεσή σας όσο είστε συνδεδεμένοι. Δημιουργούνται μόνο αν συνδεθείτε.
- **Γλώσσα διαχείρισης** ("admin_lang"): η γλώσσα που επιλέξατε στη διαχείριση, για έναν χρόνο.
- **Ρυθμίσεις χάρτη** (τοπική αποθήκευση): 3D/2D και χάρτης/δορυφόρος.
- **Αυτή η ειδοποίηση** (τοπική αποθήκευση): ότι την έχετε ήδη δει.
- **Χρήση χωρίς σύνδεση**: ο browser κρατά αντίγραφα των σελίδων και φωτογραφιών που ανοίξατε, ώστε να ανοίγουν και χωρίς σήμα.

Μπορείτε να τα διαγράψετε όλα από τις ρυθμίσεις του browser σας· θα χρειαστεί μόνο να συνδεθείτε ξανά.`,
    en: `This site uses **only essential cookies** and your browser's local storage. There are no advertising, analytics or third-party cookies, so we don't ask for consent — we only let you know.

## What is stored

- **Signing in** ("better-auth.*" cookies): keep you signed in. Only set if you sign in.
- **Admin language** ("admin_lang"): the language you chose in the admin area, for a year.
- **Map settings** (local storage): 3D/2D and map/satellite.
- **This notice** (local storage): that you have already seen it.
- **Offline use**: your browser keeps copies of the pages and photos you opened, so they open without signal.

You can delete all of it in your browser's settings; you will only need to sign in again.`,
  },
  terms: {
    el: `Χρησιμοποιώντας το {site} συμφωνείτε με τους παρακάτω όρους.

## Περιεχόμενο

Τα κείμενα και οι φωτογραφίες προέρχονται από συνεργάτες και από τις πηγές που αναφέρονται σε κάθε σελίδα. Καταβάλλουμε κάθε προσπάθεια να είναι ακριβή, αλλά μπορεί να περιέχουν λάθη· οι διορθώσεις είναι ευπρόσδεκτες. Οι θέσεις που σημειώνονται «κατά προσέγγιση» δεν έχουν επαληθευτεί.

## Συνεισφορές

Όταν προτείνετε κείμενο ή φωτογραφία, δηλώνετε ότι έχετε το δικαίωμα να το κάνετε (είναι δικό σας ή αναφέρετε την πηγή του με άδεια χρήσης) και μας επιτρέπετε να το δημοσιεύσουμε, να το επεξεργαστούμε και να το μεταφράσουμε στο {site}. Οι διαχειριστές μπορούν να απορρίψουν ή να αλλάξουν οποιαδήποτε πρόταση.

## Επισκέψεις

Οι επισκέψεις σε κατεχόμενες περιοχές ή σε ιδιωτικούς και στρατιωτικούς χώρους γίνονται με δική σας ευθύνη· σεβαστείτε τους χώρους λατρείας και τους κανόνες κάθε τόπου.

## Επικοινωνία

Για οτιδήποτε σχετικό με αυτούς τους όρους: {email}.`,
    en: `By using {site} you agree to the terms below.

## Content

Texts and photographs come from contributors and from the sources named on each page. We do our best to keep them accurate, but they may contain mistakes; corrections are welcome. Locations marked "approximate" have not been verified.

## Contributions

When you propose a text or a photograph, you confirm that you have the right to do so (it is your own, or you name its source and may use it) and allow us to publish, edit and translate it on {site}. Admins may reject or change any proposal.

## Visits

Visits to the occupied areas, or to private or military land, are at your own responsibility; please respect places of worship and the rules of each place.

## Contact

For anything about these terms: {email}.`,
  },
}
