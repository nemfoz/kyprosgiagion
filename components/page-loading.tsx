import { Skeleton } from "@/components/ui/skeleton"

// What a page shows for the moment between a click and its content (app/**/loading.tsx). With a loading state,
// Next.js can prefetch the frame of dynamic pages, so links respond at once. It mirrors the real layout (name-day
// bar, header, a banner, cards) so the swap isn't a jump. Server components only: no data, no text.

export function PageLoading({ banner = true }: { banner?: boolean }) {
  return (
    <div className="flex min-h-dvh flex-col bg-background" aria-busy="true">
      <div className="h-8 shrink-0 bg-crimson" />
      <div className="flex h-14 items-center gap-3 border-b bg-card px-4">
        <span className="font-heading text-lg font-bold"><span className="text-primary">☦</span></span>
        <Skeleton className="h-4 w-28" />
        <Skeleton className="ml-auto h-4 w-48 max-md:hidden" />
      </div>
      {banner && <div className="h-44 border-b bg-crimson/90 md:h-52" />}
      <main className="mx-auto grid w-full max-w-6xl gap-4 px-4 py-10">
        <Skeleton className="h-7 w-64" />
        <Skeleton className="h-4 w-full max-w-xl" />
        <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {[0, 1, 2].map((i) => <Skeleton key={i} className="h-56 rounded-xl" />)}
        </div>
      </main>
    </div>
  )
}

/** The map page: header, the list panel and the map area. */
export function MapLoading() {
  return (
    <div className="flex h-dvh flex-col bg-background" aria-busy="true">
      <div className="h-8 shrink-0 bg-crimson" />
      <div className="flex shrink-0 items-center gap-3 border-b bg-card px-4 py-2.5 md:h-22 md:px-7 md:py-0">
        <span className="grid h-9 w-8 place-items-center rounded-t-[22px] rounded-b-[7px] border bg-accent text-[22px] text-primary md:h-12 md:w-[42px]">☦</span>
        <Skeleton className="h-5 w-40" />
      </div>
      <div className="flex min-h-0 flex-1 gap-4 md:p-4">
        <div className="hidden w-[370px] shrink-0 flex-col gap-3 rounded-2xl border bg-card p-6 md:flex">
          <Skeleton className="h-3 w-32" /><Skeleton className="h-8 w-56" /><Skeleton className="h-10 w-full" />
          {[0, 1, 2, 3].map((i) => <Skeleton key={i} className="h-20 w-full" />)}
        </div>
        <div className="flex-1 bg-[#d9cfba] md:rounded-2xl" />
      </div>
    </div>
  )
}

/** Inside the admin area (its sidebar stays): the content only. */
export function AdminLoading() {
  return (
    <div className="grid gap-4" aria-busy="true">
      <Skeleton className="h-8 w-56" />
      <Skeleton className="h-4 w-full max-w-2xl" />
      <Skeleton className="h-72 w-full rounded-xl" />
    </div>
  )
}
