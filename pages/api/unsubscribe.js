import { getSupabaseAdmin } from '../../lib/supabase'

export default async function handler(req, res) {
  const { uid } = req.query
  if (!uid) return res.status(400).send('Missing uid')
  try {
    const admin = getSupabaseAdmin()
    await admin.from('users').update({ reminders_active: false }).eq('id', uid)
  } catch (e) {
    console.error('Unsubscribe error:', e)
  }
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || ''
  return res.status(200).send(`<!DOCTYPE html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Reminders paused</title></head><body style="font-family:Georgia,serif;background:#f5f0e8;display:flex;align-items:center;justify-content:center;min-height:100vh;margin:0;"><div style="text-align:center;padding:2rem;max-width:400px;"><div style="font-size:2rem;margin-bottom:1rem;">🌾</div><h1 style="color:#7a5c3a;font-size:1.5rem;margin-bottom:.5rem;">Reminders paused</h1><p style="color:#9e8060;line-height:1.6;margin-bottom:1.5rem;">You won't receive reminder emails anymore. Visit the app anytime to re-enable them.</p><a href="${appUrl}" style="background:#7a5c3a;color:#faf7f2;padding:.7rem 1.5rem;text-decoration:none;font-family:'Courier New',monospace;font-size:.85rem;letter-spacing:.1em;text-transform:uppercase;">← Back to app</a></div></body></html>`)
}
