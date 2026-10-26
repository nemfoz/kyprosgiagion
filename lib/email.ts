import "server-only"

// Transactional e-mail through Resend's HTTP API (RESEND_API_KEY + EMAIL_FROM).
// Without a key in development, the message (and its link) is printed to the server console instead.

const FROM = process.env.EMAIL_FROM || "Κύπρος – Αγίων Γη <onboarding@resend.dev>"

export async function sendEmail({ to, subject, html, text }: { to: string; subject: string; html: string; text: string }) {
  const key = process.env.RESEND_API_KEY
  if (!key) {
    if (process.env.VERCEL) throw new Error("Η αποστολή e-mail δεν έχει ρυθμιστεί (RESEND_API_KEY).")
    console.log(`\n✉️  [dev e-mail] to: ${to}\n   subject: ${subject}\n   ${text}\n`)
    return
  }
  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
    body: JSON.stringify({ from: FROM, to, subject, html, text }),
  })
  if (!res.ok) {
    console.error("Resend error", res.status, await res.text())
    throw new Error("Η αποστολή του e-mail απέτυχε. Δοκιμάστε ξανά σε λίγο.")
  }
}

const esc = (s: string) => s.replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]!)

/** Simple, readable message with one button (Greek first, English below). */
export function actionEmail(o: { name: string; intro: [string, string]; button: [string, string]; url: string; outro: [string, string] }) {
  const html = `<!doctype html><html><body style="margin:0;background:#f4f2eb;font-family:Arial,Helvetica,sans-serif;color:#293c33">
  <div style="max-width:520px;margin:0 auto;padding:32px 20px">
    <p style="font-family:Georgia,serif;font-size:20px;font-weight:bold;margin:0 0 24px">☦ Κύπρος – Αγίων Γη</p>
    <div style="background:#fffef9;border:1px solid #e4dccb;border-radius:12px;padding:24px">
      <p style="margin:0 0 12px">Γεια σας ${esc(o.name)},</p>
      <p style="margin:0 0 20px;line-height:1.6">${o.intro[0]}</p>
      <p style="margin:0 0 20px"><a href="${o.url}" style="display:inline-block;background:#385846;color:#fff;text-decoration:none;padding:12px 20px;border-radius:8px;font-weight:bold">${o.button[0]}</a></p>
      <p style="margin:0 0 20px;font-size:13px;color:#71766b;line-height:1.6">${o.outro[0]}</p>
      <hr style="border:0;border-top:1px solid #e4dccb;margin:20px 0">
      <p style="margin:0 0 8px;font-size:13px;color:#71766b;line-height:1.6">${o.intro[1]} <a href="${o.url}" style="color:#385846">${o.button[1]}</a>. ${o.outro[1]}</p>
      <p style="margin:12px 0 0;font-size:12px;color:#71766b;word-break:break-all">${esc(o.url)}</p>
    </div>
  </div></body></html>`
  const text = `${o.intro[0]}\n${o.url}\n\n${o.outro[0]}\n\n${o.intro[1]} ${o.url}`
  return { html, text }
}
