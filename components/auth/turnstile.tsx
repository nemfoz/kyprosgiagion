"use client"

import { useEffect, useRef } from "react"

// Cloudflare Turnstile: a privacy-friendly CAPTCHA that is usually invisible to people.
// Renders nothing when NEXT_PUBLIC_TURNSTILE_SITE_KEY is not set (e.g. local development).

declare global {
  interface Window {
    turnstile?: {
      render: (el: HTMLElement, o: Record<string, unknown>) => string
      reset: (id?: string) => void
      remove: (id: string) => void
    }
  }
}

export const TURNSTILE_SITE_KEY = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY || ""
const SRC = "https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit"

let loader: Promise<void> | undefined
const load = () => (loader ??= new Promise<void>((resolve, reject) => {
  const s = Object.assign(document.createElement("script"), { src: SRC, async: true, defer: true })
  s.onload = () => resolve()
  s.onerror = () => reject(new Error("Turnstile failed to load"))
  document.head.append(s)
}))

/** Calls onToken with a fresh token (or "" when it expires). Call `reset()` via the ref after each submit. */
export function Turnstile({ onToken, resetKey }: { onToken: (t: string) => void; resetKey: number }) {
  const el = useRef<HTMLDivElement>(null)
  const widget = useRef<string | null>(null)
  const cb = useRef(onToken)
  useEffect(() => { cb.current = onToken })

  useEffect(() => {
    if (!TURNSTILE_SITE_KEY) return
    let cancelled = false
    load().then(() => {
      if (cancelled || !el.current || !window.turnstile) return
      widget.current = window.turnstile.render(el.current, {
        sitekey: TURNSTILE_SITE_KEY,
        language: document.documentElement.lang || "el",
        appearance: "interaction-only",
        callback: (t: string) => cb.current(t),
        "expired-callback": () => cb.current(""),
        "error-callback": () => cb.current(""),
      })
    })
    return () => {
      cancelled = true
      if (widget.current) window.turnstile?.remove(widget.current)
      widget.current = null
    }
  }, [])

  // A token can be used only once: get a new one after every attempt.
  useEffect(() => {
    if (resetKey && widget.current) { cb.current(""); window.turnstile?.reset(widget.current) }
  }, [resetKey])

  if (!TURNSTILE_SITE_KEY) return null
  return <div ref={el} className="flex justify-center empty:hidden" />
}
