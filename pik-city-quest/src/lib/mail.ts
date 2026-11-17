// Email delivery adapter. No provider is configured in this environment, so messages are logged.
// Connect Resend / SES / SMTP here; the rest of the app only calls sendMail().
export async function sendMail(to: string, subject: string, text: string) {
  if (process.env.RESEND_API_KEY) {
    await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: `Bearer ${process.env.RESEND_API_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({ from: process.env.MAIL_FROM || "PIK City Quest <noreply@piktourism.com>", to, subject, text }),
    });
    return { delivered: true as const };
  }
  console.log(`[mail:demo] To: ${to}\nSubject: ${subject}\n${text}\n`);
  return { delivered: false as const, demo: true as const };
}
export const mailConfigured = () => Boolean(process.env.RESEND_API_KEY);
