// Sign-up spam checks that run before any e-mail is sent (alongside the CAPTCHA and rate limits in lib/auth.ts).

// Common throwaway-address providers. Extend as needed.
const DISPOSABLE = new Set([
  "mailinator.com", "guerrillamail.com", "guerrillamail.net", "sharklasers.com", "grr.la", "10minutemail.com",
  "10minutemail.net", "tempmail.com", "temp-mail.org", "temp-mail.io", "tempmailo.com", "yopmail.com", "yopmail.net",
  "trashmail.com", "trashmail.de", "getnada.com", "nada.email", "dispostable.com", "maildrop.cc", "throwawaymail.com",
  "fakeinbox.com", "moakt.com", "emailondeck.com", "mohmal.com", "mintemail.com", "spamgourmet.com", "mailnesia.com",
  "mytemp.email", "tempinbox.com", "burnermail.io", "discard.email", "mailpoof.com", "spam4.me", "tmail.ws", "tmpmail.org",
  "tmpmail.net", "emailfake.com", "fakemail.net", "inboxkitten.com", "1secmail.com", "1secmail.org", "1secmail.net",
  "byom.de", "dropmail.me", "linshiyouxiang.net", "mail.tm", "mailcatch.com", "spambox.us", "getairmail.com",
])

export function isDisposableEmail(email: string) {
  const domain = email.split("@")[1]?.toLowerCase().trim() ?? ""
  return DISPOSABLE.has(domain) || [...DISPOSABLE].some((d) => domain.endsWith(`.${d}`))
}

/** Hidden form field humans never see; bots that fill every input reveal themselves. */
export const HONEYPOT_FIELD = "website"

/** Bots tend to submit instantly; a real person needs a few seconds to fill in the form. */
export const MIN_FORM_SECONDS = 3
