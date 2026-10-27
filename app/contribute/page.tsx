import type { Metadata } from "next"
import Link from "next/link"
import { ImagePlus, MapPin, PenLine, Trophy } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { ProgressBar } from "@/components/gamify/completeness-card"
import { MissionList } from "@/components/gamify/mission-list"
import { Leaderboard } from "@/components/gamify/leaderboard"
import { BADGES, BONUSES, levelsFor, PAGE_POINTS, SECTIONS, type BonusKey } from "@/lib/completeness"
import { getPointsConfig } from "@/lib/points"
import { leaderboard, missionBoard } from "@/lib/contributors"
import { langFrom } from "@/lib/i18n"
import { getT } from "@/lib/i18n-server"
import { PublicHeader } from "@/components/public-header"
import { getSession } from "@/lib/session"

export const metadata: Metadata = { title: "Συνεισφέρετε", description: "Βοηθήστε να συμπληρωθούν οι σελίδες των εκκλησιών και μοναστηριών." }

export default async function ContributePage({ searchParams }: PageProps<"/contribute">) {
  const lang = langFrom((await searchParams).lang)
  const el = lang === "el"
  const [board, top, session, cfg, t] = await Promise.all([missionBoard(), leaderboard(10), getSession(), getPointsConfig(), getT()])

  return (
    <div className="min-h-dvh bg-background">
      <PublicHeader lang={lang} otherLangHref={el ? "?lang=en" : "?"} signedIn={!!session}>
        {!session && <Button size="sm" asChild><Link href="/signup">{t("signUp", lang)}</Link></Button>}
      </PublicHeader>

      <section className="border-b bg-crimson bg-[radial-gradient(ellipse_at_top_right,color-mix(in_oklab,var(--gold)_45%,transparent),transparent_70%)] text-parchment">
        <div className="mx-auto grid max-w-6xl gap-6 px-4 py-10 md:grid-cols-[1fr_340px] md:items-end">
          <div>
            <p className="mb-3 text-[11px] font-semibold tracking-[.14em] text-gold">{el ? "ΣΥΛΛΟΓΙΚΗ ΜΝΗΜΗ" : "COLLECTIVE MEMORY"}</p>
            <h1 className="text-[clamp(28px,4.5vw,42px)] leading-tight font-bold">{el ? "Βοηθήστε να ζωντανέψει η ιστορία κάθε ναού" : "Help bring every church's story to life"}</h1>
            <p className="mt-3 max-w-2xl leading-relaxed text-parchment/85">
              {el
                ? "Πολλές σελίδες είναι ακόμα ελλιπείς: λείπουν ιστορικά, φωτογραφίες, πηγές ή η ακριβής θέση. Κάθε προσθήκη ελέγχεται από διαχειριστή και κερδίζει πόντους, τίτλους και διακρίσεις."
                : "Many pages are still incomplete: histories, photos, sources or exact locations are missing. Every addition is reviewed by an admin and earns points, titles and badges."}
            </p>
          </div>
          <div className="rounded-xl bg-parchment/10 p-4 backdrop-blur">
            <p className="flex items-baseline justify-between"><span className="text-sm text-parchment/80">{el ? "Πληρότητα του χάρτη" : "Map completeness"}</span><span className="font-heading text-3xl font-bold">{board.overall}%</span></p>
            <ProgressBar percent={board.overall} className="mt-2 bg-parchment/20" />
            <p className="mt-2 text-xs text-parchment/75">{board.complete} / {board.sites.length} {el ? "σελίδες πλήρεις" : "pages complete"}</p>
          </div>
        </div>
      </section>

      <main className="mx-auto grid max-w-6xl gap-8 px-4 py-8 lg:grid-cols-[minmax(0,1fr)_340px]">
        <div className="grid content-start gap-8">
          <div className="grid gap-3 sm:grid-cols-3">
            {[
              { icon: <PenLine />, title: el ? "Επιλέξτε ναό" : "Pick a church", text: el ? "Διαλέξτε μια σελίδα παρακάτω — ό,τι γνωρίζετε ή μπορείτε να βρείτε." : "Choose a page below — whatever you know or can find out." },
              { icon: <ImagePlus />, title: el ? "Προτείνετε προσθήκες" : "Suggest additions", text: el ? "Κείμενα, φωτογραφίες, πηγές ή διόρθωση της θέσης στον χάρτη." : "Texts, photos, sources or a corrected location on the map." },
              { icon: <Trophy />, title: el ? "Κερδίστε πόντους" : "Earn points", text: el ? `Με την έγκριση: ${cfg.proposal} πόντοι + οι πόντοι κάθε ενότητας που συμπληρώσατε + μπόνους.` : `On approval: ${cfg.proposal} points + the points of each section you completed + bonuses.` },
            ].map((s, i) => (
              <Card key={i} className="gap-2 py-4">
                <CardContent className="grid gap-1.5 px-4">
                  <span className="grid size-9 place-items-center rounded-lg bg-accent text-primary [&_svg]:size-5">{s.icon}</span>
                  <p className="font-semibold">{s.title}</p>
                  <p className="text-sm text-muted-foreground">{s.text}</p>
                </CardContent>
              </Card>
            ))}
          </div>

          <section className="grid gap-3">
            <h2 className="text-2xl font-bold">{el ? "Σελίδες που χρειάζονται βοήθεια" : "Pages that need help"}</h2>
            <p className="text-sm text-muted-foreground">{el ? "Οι λιγότερο ολοκληρωμένες σελίδες πρώτες. Φιλτράρετε ανάλογα με το τι θέλετε να προσφέρετε." : "Least complete pages first. Filter by what you'd like to contribute."}</p>
            <MissionList sites={board.sites} lang={lang} signedIn={!!session} />
          </section>
        </div>

        <aside className="grid content-start gap-4 lg:sticky lg:top-4 lg:max-h-[calc(100dvh-2rem)] lg:self-start lg:overflow-y-auto lg:[scrollbar-width:thin]">
          <Card>
            <CardHeader><CardTitle className="flex items-center gap-2 font-heading text-lg"><Trophy className="size-5 text-gold" />{el ? "Κορυφαίοι συνεισφέροντες" : "Top contributors"}</CardTitle></CardHeader>
            <CardContent><Leaderboard rows={top} lang={lang} highlight={session?.user.id} /></CardContent>
          </Card>
          <Card>
            <CardHeader><CardTitle className="font-heading text-lg">{el ? "Πώς μετρούν οι πόντοι" : "How points work"}</CardTitle></CardHeader>
            <CardContent className="grid gap-4 text-sm">
              <p className="text-muted-foreground">
                {el
                  ? `Κάθε σελίδα αξίζει ${PAGE_POINTS} πόντους στα ελληνικά και ${PAGE_POINTS} στα αγγλικά. Φωτογραφία, θέση και πηγές ισχύουν και για τις δύο γλώσσες, άρα μετρούν διπλά.`
                  : `Every page is worth ${PAGE_POINTS} points in Greek and ${PAGE_POINTS} in English. Photo, location and sources serve both languages, so they count twice.`}
              </p>
              <table className="w-full">
                <thead className="text-xs text-muted-foreground">
                  <tr><th className="pb-1 text-left font-normal">{el ? "Ενότητα" : "Section"}</th><th className="pb-1 text-right font-normal">{el ? "ανά γλώσσα" : "per language"}</th></tr>
                </thead>
                <tbody>
                  {SECTIONS.map((s) => (
                    <tr key={s.key} title={s.hint[lang]}>
                      <td className="py-0.5">{s.label[lang]}{s.shared && <span className="text-xs text-muted-foreground"> · {el ? "και οι δύο" : "both"}</span>}</td>
                      <td className="py-0.5 text-right font-semibold text-primary">{cfg.sections[s.key]}</td>
                    </tr>
                  ))}
                  <tr className="border-t"><td className="pt-1">{el ? "Σύνολο" : "Total"}</td><td className="pt-1 text-right font-semibold">{PAGE_POINTS}</td></tr>
                </tbody>
              </table>
              <div className="grid gap-1.5">
                <p className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">{el ? "Μπόνους" : "Bonus points"}</p>
                {Object.entries(BONUSES).map(([k, b]) => (
                  <p key={k} className="flex justify-between gap-3" title={b.hint[lang]}><span>{b.label[lang]}</span><b className="text-primary">+{cfg.bonuses[k as BonusKey]}</b></p>
                ))}
                <p className="flex justify-between gap-3"><span>{el ? "Κάθε εγκεκριμένη πρόταση" : "Every approved proposal"}</span><b className="text-primary">+{cfg.proposal}</b></p>
                <p className="text-xs text-muted-foreground">{el ? "Τα μπόνους δεν αλλάζουν το ποσοστό πληρότητας της σελίδας." : "Bonuses don't change a page's completeness percentage."}</p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader><CardTitle className="font-heading text-lg">{el ? "Τίτλοι & διακρίσεις" : "Titles & badges"}</CardTitle></CardHeader>
            <CardContent className="grid gap-4 text-sm">
              <ul className="grid gap-1">
                {levelsFor(cfg).map((l) => <li key={l.min} className="flex justify-between"><span>{l[lang]}</span><span className="text-muted-foreground">{l.min}+</span></li>)}
              </ul>
              <ul className="grid gap-1.5">
                {Object.values(BADGES).map((b) => <li key={b.en}><span className="mr-2">{b.icon}</span>{b[lang]} <span className="text-xs text-muted-foreground">— {b.hint[lang]}</span></li>)}
              </ul>
              <p className="flex items-start gap-1.5 text-xs text-muted-foreground"><MapPin className="mt-0.5 size-3.5 shrink-0" />{el ? "Στον πίνακα εμφανίζεται μόνο το όνομα και το αρχικό του επωνύμου σας." : "Only your first name and last initial appear on the board."}</p>
            </CardContent>
          </Card>
        </aside>
      </main>
    </div>
  )
}
