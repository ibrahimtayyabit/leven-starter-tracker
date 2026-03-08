import { supabaseAdmin } from '../../lib/supabase'

export default async function handler(req, res) {
  const { uid } = req.query
  if (!uid) return res.status(400).send('Missing uid')

  await supabaseAdmin
    .from('users')
    .update({ reminders_active: false })
    .eq('id', uid)

  return res.status(200).send(`
    <!DOCTYPE html><html><body style="font-family:Georgia,serif;background:#f5f0e8;display:flex;align-items:center;justify-content:center;min-height:100vh;margin:0;">
    <div style="text-align:center;padding:2rem;">
      <h1 style="color:#7a5c3a;">Reminders paused</h1>
      <p style="color:#9e8060;margin-top:1rem;">You won't receive reminder emails anymore. Visit the app to re-enable them.</p>
      <a href="${process.env.NEXT_PUBLIC_APP_URL}" style="color:#7a5c3a;">← Back to app</a>
    </div></body></html>
  `)
}
