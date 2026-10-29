import { regionBoundaries } from "@/lib/regions-server"

// The regions' outlines for the maps (components/map/terrain.ts → setRegion). Cached with the public data.
export async function GET() {
  return Response.json(await regionBoundaries(), { headers: { "Cache-Control": "public, max-age=300" } })
}
