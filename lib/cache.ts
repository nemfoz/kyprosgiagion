import "server-only"
import { unstable_cache } from "next/cache"

/**
 * Every cross-request cache of public content carries this tag; admin edits expire it (updateTag in the server
 * actions, revalidateTag in route handlers), so pages show changes at once. The hourly revalidation is only a
 * safety net, e.g. for Metropolis news fetched in the background.
 */
export const PUBLIC_TAG = "public"

// Each deployment starts with fresh caches: the build's migrations may have changed the data.
const BUILD = process.env.VERCEL_DEPLOYMENT_ID ?? process.env.VERCEL_GIT_COMMIT_SHA ?? "local"

/** Caches a read of public data across requests (results must be plain JSON: no Dates, Maps or Sets). */
export function cached<A extends unknown[], R>(name: string, fn: (...args: A) => Promise<R>, revalidate = 3600) {
  return unstable_cache(fn, [BUILD, name], { tags: [PUBLIC_TAG], revalidate })
}
