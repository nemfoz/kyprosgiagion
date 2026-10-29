import type { NextConfig } from "next";

// Language prefixes used by proxy.ts (Greek has none).
const LANG = ":lang(en|ru|uk|ro|bg|sr|ka)";

const nextConfig: NextConfig = {
  // Files in public/ are served with max-age=0 by default, so every visit asks for them again. The map data and
  // icons change only with a deploy: keep them a day, then refresh in the background.
  async headers() {
    const day = "public, max-age=86400, stale-while-revalidate=604800";
    return [
      { source: "/data/:path*", headers: [{ key: "Cache-Control", value: day }] },
      { source: "/:icon(icon-[a-z0-9-]+\\.png)", headers: [{ key: "Cache-Control", value: day }] },
    ];
  },
  // The Cyprus pages moved under /cyprus (Οδοιπορικό editions); old links keep working.
  async redirects() {
    const moved = (from: string, to: string) => [
      { source: from, destination: to, permanent: true },
      { source: `/${LANG}${from}`, destination: `/:lang${to}`, permanent: true },
    ];
    // The map used to be the home page: /?site=… /?region=… /?metropolis=… now open /cyprus/map.
    const oldMap = ["site", "region", "metropolis"].flatMap((key) => [
      { source: "/", has: [{ type: "query" as const, key }], destination: "/cyprus/map", permanent: true },
      { source: `/${LANG}`, has: [{ type: "query" as const, key }], destination: "/:lang/cyprus/map", permanent: true },
    ]);
    return [
      // /site/x and /metropolis/x (old links, admin links) find their edition: app/site, app/metropolis.
      ...moved("/metropolis", "/cyprus/metropolis"),
      ...oldMap,
    ];
  },
};

export default nextConfig;
