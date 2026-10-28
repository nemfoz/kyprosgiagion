import type { MetadataRoute } from "next"

/** "Add to Home Screen": the Cyprus map opens like an app, in the site's colours. */
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Οδοιπορικό",
    short_name: "Οδοιπορικό",
    description: "Οδοιπορικό στις εκκλησίες και τα μοναστήρια της Ορθοδοξίας. A pilgrim's atlas of Orthodox churches.",
    lang: "el",
    start_url: "/cyprus/map",
    scope: "/",
    display: "standalone",
    background_color: "#ece8de",
    theme_color: "#6b1d1d",
    icons: [
      { src: "/icon-192.png", sizes: "192x192", type: "image/png" },
      { src: "/icon-512.png", sizes: "512x512", type: "image/png" },
      { src: "/icon-maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  }
}
