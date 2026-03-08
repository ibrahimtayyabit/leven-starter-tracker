import { sendWelcome } from '../../lib/email'

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end()
  const { email } = req.body
  if (!email) return res.status(400).json({ error: 'Missing email' })
  try {
    await sendWelcome({ email, appUrl: process.env.NEXT_PUBLIC_APP_URL })
    res.status(200).json({ ok: true })
  } catch (e) {
    console.error('Welcome email error:', e)
    res.status(500).json({ error: e.message })
  }
}
