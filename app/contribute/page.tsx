import type { Metadata } from "next"
import Link from "next/link"
import { ImagePlus, MapPin, PenLine, Trophy } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { ProgressBar } from "@/components/gamify/completeness-card"
import { ThemeToggle } from "@/components/theme-toggle"
import { MissionList } from "@/components/gamify/mission-list"
import { Leaderboard } from "@/components/gamify/leaderboard"
import { BADGES, LEVELS, MISSIONS, PROPOSAL_POINTS } from "@/lib/completeness"
import { leaderboard, missionBoard } from "@/lib/contributors"
import { langFrom, t } from "@/lib/i18n"
import { siteTitle } from "@/lib/regions"
import { getSession } from "@/lib/session"

export const metadata: Metadata = { title: "Συνεισφέρετε", description: "Βοηθήστε να συμπληρωθούν οι σελίδες των εκκλησιών και μοναστηριών." }

export default async function ContributePage({ searchParams }: PageProps<"/contribute">) {
  const lang = langFrom((await searchParams).lang)
  const el = lang === "el"
  const [board, top, session] = await Promise.all([missionBoard(), leaderboard(10), getSession()])
  const q = el ? "" : "?lang=en"

  return (
    <div className="min-h-dvh bg-background">
      <header className="flex h-14 items-center gap-3 border-b bg-card px-4">
        <Link href={`/${q}`} className="flex items-center gap-2 font-heading text-lg font-bold"><span className="text-primary">☦</span>{siteTitle[lang]}</Link>
        <div className="ml-auto flex items-center gap-1">
          <Button variant="ghost" size="sm" asChild><Link href={`/${q}`}>{t("map", lang)}</Link></Button>
          <ThemeToggle lang={lang} />
          <Button variant="ghost" size="sm" asChild><Link href={el ? "?lang=en" : "?"}>{el ? "EN" : "ΕΛ"}</Link></Button>
          <Button size="sm" asChild><Link href={session ? "/admin" : "/signup"}>{session ? t("dashboard", lang) : el ? "Εγγραφή" : "Sign up"}</Link></Button>
        </div>
      </header>

      <section className="border-b bg-[#293f33] bg-[radial-gradient(ellipse_at_top_right,#63765a,transparent_70%)] text-white">
        <div className="mx-auto grid max-w-6xl gap-6 px-4 py-10 md:grid-cols-[1fr_340px] md:items-end">
          <div>
            <p className="mb-3 text-[11px] font-semibold tracking-[.14em] text-amber-200">{el ? "ΣΥΛΛΟΓΙΚΗ ΜΝΗΜΗ" : "COLLECTIVE MEMORY"}</p>
            <h1 className="text-[clamp(28px,4.5vw,42px)] leading-tight font-bold">{el ? "Βοηθήστε να ζωντανέψει η ιστορία κάθε ναού" : "Help bring every church's story to life"}</h1>
            <p className="mt-3 max-w-2xl leading-relaxed text-white/85">
              {el
                ? "Πολλές σελίδες είναι ακόμα ελλιπείς: λείπουν ιστορικά, φωτογραφίες, πηγές ή η ακριβής θέση. Κάθε προσθήκη ελέγχεται από διαχειριστή και κερδίζει πόντους, τίτλους και διακρίσεις."
                : "Many pages are still incomplete: histories, photos, sources or exact locations are missing. Every addition is reviewed by an admin and earns points, titles and badges."}
            </p>
          </div>
          <div className="rounded-xl bg-white/10 p-4 backdrop-blur">
            <p className="flex items-baseline justify-between"><span className="text-sm text-white/80">{el ? "Πληρότητα του χάρτη" : "Map completeness"}</span><span className="font-heading text-3xl font-bold">{board.overall}%</span></p>
            <ProgressBar percent={board.overall} className="mt-2 bg-white/20" />
            <p className="mt-2 text-xs text-white/75">{board.complete} / {board.sites.length} {el ? "σελίδες πλήρεις" : "pages complete"}</p>
          </div>
        </div>
      </section>

      <main className="mx-auto grid max-w-6xl gap-8 px-4 py-8 lg:grid-cols-[minmax(0,1fr)_340px]">
        <div className="grid content-start gap-8">
          <div className="grid gap-3 sm:grid-cols-3">
            {[
              { icon: <PenLine />, title: el ? "Επιλέξτε ναό" : "Pick a church", text: el ? "Διαλέξτε μια αποστολή παρακάτω — ό,τι γνωρίζετε ή μπορείτε να βρείτε." : "Choose a mission below — whatever you know or can find out." },
              { icon: <ImagePlus />, title: el ? "Προτείνετε προσθήκες" : "Suggest additions", text: el ? "Κείμενα, φωτογραφίες, πηγές ή διόρθωση της θέσης στον χάρτη." : "Texts, photos, sources or a corrected location on the map." },
              { icon: <Trophy />, title: el ? "Κερδίστε πόντους" : "Earn points", text: el ? `Με την έγκριση: ${PROPOSAL_POINTS} πόντοι + οι πόντοι κάθε αποστολής που ολοκληρώσατε.` : `On approval: ${PROPOSAL_POINTS} points + the points of each mission you completed.` },
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
            <h2 className="text-2xl font-bold">{el ? "Αποστολές" : "Missions"}</h2>
            <p className="text-sm text-muted-foreground">{el ? "Οι λιγότερο ολοκληρωμένες σελίδες πρώτες. Φιλτράρετε ανάλογα με το τι θέλετε να προσφέρετε." : "Least complete pages first. Filter by what you'd like to contribute."}</p>
            <MissionList sites={board.sites} lang={lang} signedIn={!!session} />
          </section>
        </div>

        <aside className="grid content-start gap-4">
          <Card>
            <CardHeader><CardTitle className="flex items-center gap-2 font-heading text-lg"><Trophy className="size-5 text-gold" />{el ? "Κορυφαίοι συνεισφέροντες" : "Top contributors"}</CardTitle></CardHeader>
            <CardContent><Leaderboard rows={top} lang={lang} highlight={session?.user.id} /></CardContent>
          </Card>
          <Card>
            <CardHeader><CardTitle className="font-heading text-lg">{el ? "Πόντοι ανά αποστολή" : "Points per mission"}</CardTitle></CardHeader>
            <CardContent>
              <ul className="grid gap-1.5 text-sm">
                {MISSIONS.map((m) => <li key={m.key} className="flex justify-between gap-3"><span>{m.label[lang]}</span><b className="text-primary">+{m.points}</b></li>)}
              </ul>
            </CardContent>
          </Card>
          <Card>
            <CardHeader><CardTitle className="font-heading text-lg">{el ? "Τίτλοι & διακρίσεις" : "Titles & badges"}</CardTitle></CardHeader>
            <CardContent className="grid gap-4 text-sm">
              <ul className="grid gap-1">
                {LEVELS.map((l) => <li key={l.min} className="flex justify-between"><span>{l[lang]}</span><span className="text-muted-foreground">{l.min}+</span></li>)}
              </ul>
              <ul className="grid gap-1.5">
                {Object.values(BADGES).map((b) => <li key={b.en}><span className="mr-2">{b.icon}</span>{b[lang]}</li>)}
              </ul>
              <p className="flex items-start gap-1.5 text-xs text-muted-foreground"><MapPin className="mt-0.5 size-3.5 shrink-0" />{el ? "Στον πίνακα εμφανίζεται μόνο το όνομα και το αρχικό του επωνύμου σας." : "Only your first name and last initial appear on the board."}</p>
            </CardContent>
          </Card>
        </aside>
      </main>
    </div>
  )
}
