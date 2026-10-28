import type { NextConfig } from "next";

// Language prefixes used by proxy.ts (Greek has none).
const LANG = ":lang(en|ru|uk|ro|bg|sr|ka)";

const nextConfig: NextConfig = {
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
      ...moved("/site/:slug*", "/cyprus/site/:slug*"),
      ...moved("/metropolis/:slug*", "/cyprus/metropolis/:slug*"),
      ...moved("/metropolis", "/cyprus/metropolis"),
      ...oldMap,
    ];
  },
};

export default nextConfig;
