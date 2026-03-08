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
//
// TIMING: Uses the user's inputted logged_time (e.g. "14:00") combined with
// the entry's created_at date to calculate elapsed time — not the server
// timestamp. So if someone fed at 2pm but logged it at 6pm, reminders fire
// relative to 2pm, not 6pm.
// ─────────────────────────────────────────────────────────────────────────────

// Reconstruct a real Date from a logged_time string ("HH:MM") and a created_at
// timestamp. Uses the date portion of created_at but substitutes the HH:MM
// the user actually entered. Falls back to created_at if logged_time is missing.
function getActualEntryTime(loggedTime, createdAt) {
  if (!loggedTime || !/^\d{2}:\d{2}$/.test(loggedTime)) {
    return new Date(createdAt)
  }
  const base = new Date(createdAt)
  const [hours, minutes] = loggedTime.split(':').map(Number)

  // Build a date using the UTC date from created_at but with the user's HH:MM.
  // We treat logged_time as local time (it was entered in the user's browser),
  // so we use local date math here.
  const result = new Date(createdAt)
  result.setHours(hours, minutes, 0, 0)

  // Edge case: if the logged time is significantly ahead of created_at (e.g.
  // user set time to 11pm but it's actually past midnight now), roll back a day.
  if (result.getTime() - base.getTime() > 6 * 3600000) {
    result.setDate(result.getDate() - 1)
  }

  return result
}

export default async function handler(req, res) {
  const authHeader  = req.headers.authorization
  const querySecret = req.query.secret
  const validBearer = authHeader === `Bearer ${process.env.CRON_SECRET}`
  const validQuery  = querySecret && querySecret === process.env.CRON_SECRET

  if (!validBearer && !validQuery) {
    return res.status(401).json({ error: 'Unauthorized' })
  }

  let supabaseAdmin
  try {
    supabaseAdmin = getSupabaseAdmin()
  } catch (e) {
    return res.status(500).json({ error: e.message })
  }

  const appUrl  = process.env.NEXT_PUBLIC_APP_URL
  const now     = new Date()
  const results = { checked: 0, sent: 0, skipped: 0, errors: 0 }

  try {
    const { data: users, error: usersError } = await supabaseAdmin
      .from('users')
      .select('id, email, current_mode, current_step, remind_window_start, remind_midpoint, remind_overdue')
      .eq('reminders_active', true)
      .not('current_mode', 'is', null)

    if (usersError) throw usersError

    for (const user of users || []) {
      results.checked++

      const mode      = user.current_mode
      const stepIndex = user.current_step || 0
      const windows   = CHECK_WINDOWS[mode]
      if (!windows) { results.skipped++; continue }

      const stepWindow = windows[stepIndex]
      if (!stepWindow) { results.skipped++; continue }

      // Fetch the most recent entry for this user at this step
      // to get the user-inputted logged_time
      const { data: latestEntries } = await supabaseAdmin
        .from('entries')
        .select('logged_time, created_at')
        .eq('user_id', user.id)
        .eq('step_index', stepIndex - 1 < 0 ? 0 : stepIndex - 1)
        .order('created_at', { ascending: false })
        .limit(1)

      // Actually we want the entry for the step the user just completed
      // (stepIndex - 1), since current_step is already incremented after logging
      const { data: recentEntry } = await supabaseAdmin
        .from('entries')
        .select('logged_time, created_at')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(1)
        .single()

      if (!recentEntry) { results.skipped++; continue }

      // Use the user's inputted time, not server receipt time
      const actualEntryTime = getActualEntryTime(recentEntry.logged_time, recentEntry.created_at)
      const hoursElapsed    = (now - actualEntryTime) / 3600000

      const [minH, maxH] = stepWindow
      const midH         = (minH + maxH) / 2

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
      const cutoff = new Date(now.getTime() - (maxH + 1) * 3600000).toISOString()
      const { data: recentEmails } = await supabaseAdmin
        .from('reminder_log')
        .select('id')
        .eq('user_id', user.id)
        .eq('reminder_type', reminderType)
        .gte('sent_at', cutoff)
        .limit(1)

      if (recentEmails && recentEmails.length > 0) { results.skipped++; continue }

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
    return res.status(500).json({ error: err.message })\
  }
}
