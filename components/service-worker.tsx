"use client"

import { useEffect } from "react"

/** Registers public/sw.js (production only), which keeps visited pages and photos for use without signal. */
export function ServiceWorker() {
  useEffect(() => {
    if (process.env.NODE_ENV !== "production" || !("serviceWorker" in navigator)) return
    navigator.serviceWorker.register("/sw.js").catch(() => {})
  }, [])
  return null
}
