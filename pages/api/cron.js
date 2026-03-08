import { getSupabaseAdmin } from '../../lib/supabase'
import { sendReminder, CHECK_WINDOWS, REMINDER_TYPES } from '../../lib/email'
import { MODES } from '../../lib/modes'

// ─────────────────────────────────────────────────────────────────────────────
// CRON ENDPOINT
// Called by cronjob.org every minute (or however you configure it).
//
// cronjob.org setup:
//   URL:    https://your-app.vercel.app/api/cron?secret=YOUR_CRON_SECRET
//   Method: GET
//   Every:  1 minute (or 5 min to save quota)
// ─────────────────────────────────────────────────────────────────────────────

export default async function handler(req, res) {
  // Auth check — supports both Authorization header AND ?secret= query param
  // cronjob.org uses the query param approach (easier to configure)
  const authHeader   = req.headers.authorization
  const querySecret  = req.query.secret
  const validBearer  = authHeader === `Bearer ${process.env.CRON_SECRET}`
  const validQuery   = querySecret && querySecret === process.env.CRON_SECRET

  if (!validBearer && !validQuery) {
    return res.status(401).json({ error: 'Unauthorized' })
  }

  let supabaseAdmin
  try {
    supabaseAdmin = getSupabaseAdmin()
  } catch (e) {
    return res.status(500).json({ error: e.message })
  }

  const appUrl     = process.env.NEXT_PUBLIC_APP_URL
  const now        = new Date()
  const results    = { checked: 0, sent: 0, skipped: 0, errors: 0 }

  try {
    const { data: users, error: usersError } = await supabaseAdmin
      .from('users')
      .select('id, email, current_mode, current_step, last_entry_at, remind_window_start, remind_midpoint, remind_overdue')
      .eq('reminders_active', true)
      .not('current_mode', 'is', null)
      .not('last_entry_at', 'is', null)

    if (usersError) throw usersError

    for (const user of users || []) {
      results.checked++

      // Quiet hours removed — reminders fire any time of day

      const mode      = user.current_mode
      const stepIndex = user.current_step || 0
      const windows   = CHECK_WINDOWS[mode]
      if (!windows) { results.skipped++; continue }

      const stepWindow = windows[stepIndex]
      if (!stepWindow) { results.skipped++; continue }

      const [minH, maxH] = stepWindow
      const midH         = (minH + maxH) / 2
      const lastEntry    = new Date(user.last_entry_at)
      const hoursElapsed = (now - lastEntry) / 3600000

      // Determine what reminder to send (if any)
      let reminderType = null
      if (user.remind_window_start !== false && hoursElapsed >= minH && hoursElapsed < midH) {
        reminderType = REMINDER_TYPES.WINDOW_START
      } else if (user.remind_midpoint !== false && hoursElapsed >= midH && hoursElapsed < maxH) {
        reminderType = REMINDER_TYPES.FEED_NOW
      } else if (user.remind_overdue !== false && hoursElapsed >= maxH) {
        reminderType = REMINDER_TYPES.OVERDUE
      }
      if (!reminderType) { results.skipped++; continue }

      // Dedupe: don't resend the same reminder type within the window period
      const windowHours = maxH + 1
      const cutoff = new Date(now.getTime() - windowHours * 3600000).toISOString()
      const { data: recentEmails } = await supabaseAdmin
        .from('reminder_log')
        .select('id')
        .eq('user_id', user.id)
        .eq('reminder_type', reminderType)
        .gte('sent_at', cutoff)
        .limit(1)

      if (recentEmails && recentEmails.length > 0) { results.skipped++; continue }

      // Get step title for email
      const modeData  = MODES[mode]
      const stepData  = modeData?.steps?.[stepIndex]
      const stepTitle = stepData?.title || `Step ${stepIndex + 1}`

      try {
        await sendReminder({
          to: user.email, type: reminderType, mode, stepTitle,
          stepIndex, hoursAgo: Math.round(hoursElapsed), appUrl,
        })
        await supabaseAdmin.from('reminder_log').insert({
          user_id: user.id, reminder_type: reminderType,
          mode, step_index: stepIndex, sent_at: now.toISOString(),
        })
        await supabaseAdmin
          .from('entries')
          .update({ email_sent: true })
          .eq('user_id', user.id)
          .eq('step_index', stepIndex)
          .order('created_at', { ascending: false })
          .limit(1)
        results.sent++
      } catch (emailError) {
        console.error(`Email failed for user ${user.id}:`, emailError)
        results.errors++
      }
    }

    console.log('Cron complete:', results)
    return res.status(200).json({ ok: true, ...results, timestamp: now.toISOString() })
  } catch (err) {
    console.error('Cron error:', err)
    return res.status(500).json({ error: err.message })
  }
}
