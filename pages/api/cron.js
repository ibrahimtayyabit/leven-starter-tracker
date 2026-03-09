import { getSupabaseAdmin } from '../../lib/supabase'
import { sendReminder, CHECK_WINDOWS, REMINDER_TYPES } from '../../lib/email'
import { MODES } from '../../lib/modes'

// ─────────────────────────────────────────────────────────────────────────────
// CRON ENDPOINT
// Called by cronjob.org every minute.
//
// cronjob.org setup:
//   URL:    https://your-app.vercel.app/api/cron?secret=YOUR_CRON_SECRET
//   Method: GET
//   Every:  1 minute (or 5 min to save quota)
//
// TIMING: Uses logged_at — a proper UTC timestamp computed from the user's
// inputted HH:MM in their local timezone. Accurate regardless of where the
// user is located.
// ─────────────────────────────────────────────────────────────────────────────

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
    // 1. Fetch all active users
    const { data: users, error: usersError } = await supabaseAdmin
      .from('users')
      .select('id, email, current_mode, current_step, last_entry_at, remind_window_start, remind_midpoint, remind_overdue')
      .eq('reminders_active', true)
      .not('current_mode', 'is', null)

    if (usersError) throw usersError
    if (!users?.length) return res.status(200).json({ ok: true, ...results, timestamp: now.toISOString() })

    results.checked = users.length

    // 2. Fetch the most recent entry for ALL users in one query
    //    (replaces N individual per-user queries inside the loop)
    const userIds = users.map(u => u.id)
    const { data: recentEntries } = await supabaseAdmin
      .from('entries')
      .select('user_id, logged_at, created_at')
      .in('user_id', userIds)
      .order('created_at', { ascending: false })

    // Build a map: user_id -> most recent entry
    const latestEntryByUser = {}
    for (const entry of recentEntries || []) {
      if (!latestEntryByUser[entry.user_id]) {
        latestEntryByUser[entry.user_id] = entry
      }
    }

    // 3. Determine which users need a reminder
    const candidates = []

    for (const user of users) {
      const mode      = user.current_mode
      const stepIndex = user.current_step || 0
      const windows   = CHECK_WINDOWS[mode]
      if (!windows) { results.skipped++; continue }

      const stepWindow = windows[stepIndex]
      if (!stepWindow) { results.skipped++; continue }

      const recentEntry = latestEntryByUser[user.id]
      if (!recentEntry) { results.skipped++; continue }

      const referenceTime = recentEntry.logged_at || user.last_entry_at || recentEntry.created_at
      const hoursElapsed  = (now - new Date(referenceTime)) / 3600000
      const [minH, maxH]  = stepWindow
      const midH          = (minH + maxH) / 2

      let reminderType = null
      if (user.remind_window_start !== false && hoursElapsed >= minH && hoursElapsed < midH) {
        reminderType = REMINDER_TYPES.WINDOW_START
      } else if (user.remind_midpoint !== false && hoursElapsed >= midH && hoursElapsed < maxH) {
        reminderType = REMINDER_TYPES.FEED_NOW
      } else if (user.remind_overdue !== false && hoursElapsed >= maxH) {
        reminderType = REMINDER_TYPES.OVERDUE
      }

      if (!reminderType) { results.skipped++; continue }
      candidates.push({ user, reminderType, stepIndex, stepWindow })
    }

    if (!candidates.length) {
      return res.status(200).json({ ok: true, ...results, timestamp: now.toISOString() })
    }

    // 4. Dedupe: fetch reminder_log for all candidates in one query
    //    (replaces N individual per-user dedupe queries inside the loop)
    const maxWindowHours = Math.max(...candidates.map(c => c.stepWindow[1]))
    const cutoff = new Date(now.getTime() - (maxWindowHours + 1) * 3600000).toISOString()

    const { data: recentLogs } = await supabaseAdmin
      .from('reminder_log')
      .select('user_id, reminder_type')
      .in('user_id', candidates.map(c => c.user.id))
      .gte('sent_at', cutoff)

    const alreadySent = new Set((recentLogs || []).map(r => `${r.user_id}|${r.reminder_type}`))

    const toSend = candidates.filter(c => {
      if (alreadySent.has(`${c.user.id}|${c.reminderType}`)) {
        results.skipped++
        return false
      }
      return true
    })

    // 5. Send all emails in parallel
    await Promise.all(toSend.map(async ({ user, reminderType, stepIndex }) => {
      const modeData      = MODES[user.current_mode]
      const stepData      = modeData?.steps?.[stepIndex]
      const stepTitle     = stepData?.title || `Step ${stepIndex + 1}`
      const recentEntry   = latestEntryByUser[user.id]
      const referenceTime = recentEntry.logged_at || user.last_entry_at || recentEntry.created_at
      const hoursElapsed  = (now - new Date(referenceTime)) / 3600000

      try {
        await sendReminder({
          to: user.email, type: reminderType, mode: user.current_mode, stepTitle,
          stepIndex, hoursAgo: Math.round(hoursElapsed), appUrl,
        })
        await Promise.all([
          supabaseAdmin.from('reminder_log').insert({
            user_id: user.id, reminder_type: reminderType,
            mode: user.current_mode, step_index: stepIndex, sent_at: now.toISOString(),
          }),
          supabaseAdmin
            .from('entries')
            .update({ email_sent: true })
            .eq('user_id', user.id)
            .eq('step_index', stepIndex)
            .order('created_at', { ascending: false })
            .limit(1),
        ])
        results.sent++
      } catch (emailError) {
        console.error(`Email failed for user ${user.id}:`, emailError)
        results.errors++
      }
    }))

    console.log('Cron complete:', results)
    return res.status(200).json({ ok: true, ...results, timestamp: now.toISOString() })
  } catch (err) {
    console.error('Cron error:', err)
    return res.status(500).json({ error: err.message })
  }
}
