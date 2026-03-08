import { getSupabaseAdmin } from '../../lib/supabase'
import { sendWelcome } from '../../lib/email'

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end()
  const { email, userId } = req.body
  if (!email || !userId) return res.status(400).json({ error: 'Missing email or userId' })

  try {
    const admin = getSupabaseAdmin()

    // Check if we already sent a welcome email for this user
    const { data: user } = await admin.from('users').select('welcome_sent').eq('id', userId).single()
    if (user?.welcome_sent) {
      return res.status(200).json({ ok: true, skipped: true })
    }

    await sendWelcome({ email, appUrl: process.env.NEXT_PUBLIC_APP_URL })

    // Mark welcome as sent so it never fires again
    await admin.from('users').update({ welcome_sent: true }).eq('id', userId)

    res.status(200).json({ ok: true })
  } catch (e) {
    console.error('Welcome email error:', e)
    res.status(500).json({ error: e.message })
  }
}
