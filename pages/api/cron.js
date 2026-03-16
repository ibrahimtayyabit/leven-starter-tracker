import { getSupabaseAdmin } from '../../lib/supabase'
import { sendReminder } from '../../lib/email'
import { MODES } from '../../lib/modes'

// ─────────────────────────────────────────────────────────────────────────────
// CRON — reminder schedule for any [minH, maxH] window:
//
//   1. minH            → window opens
//   2. (minH+maxH)/2   → midpoint
//   3. maxH            → deadline
//   4. maxH + 2×scale  → 2× scale after deadline   (scale = windowSize/2)
//   5. maxH + 8×scale  → 8× scale after deadline
//   6. maxH + 24×scale → 24× scale after deadline
//   7. maxH + 48×scale → final notice → STOP
//
// Example [4–6h] scale=1: fires at 4, 5, 6, 8, 14, 30, 54h then stops.
// Example [48–96h] scale=24: fires at 48, 72, 96, 144, 288, 672, 1248h then stops.
//
// Stops automatically when user advances to a step with no check window,
// or completes all steps.
// ─────────────────────────────────────────────────────────────────────────────

const CHECK_WINDOWS = {
  refresh:  { 1: [4,6], 2: [4,8], 3: [4,8], 4: [4,8] },
  counter:  { 1: [4,8], 2: [4,8] },
  fridge:   { 0: [48,96], 2: [2,4], 3: [4,12] },
  longterm: { 0: [4,8], 1: [24,72] },
}

function getThresholds(minH, maxH) {
  const scale = (maxH - minH) / 2
  const mid   = (minH + maxH) / 2
  return [
    minH,
    mid,
    maxH,
    maxH + 2  * scale,
    maxH + 8  * scale,
    maxH + 24 * scale,
    maxH + 48 * scale,   // slot 6 = final, no slot 7 exists → Infinity upper bound → stops here
  ]
}

const SLOT_LABELS = [
  'window_open', 'midpoint', 'deadline',
  'overdue_2x', 'overdue_8x', 'overdue_24x', 'final_notice',
]

function getEmailType(slot) {
  if (slot === 0) return 'window_start'
  if (slot <= 2)  return 'feed_now'
  return 'overdue'
}

export default async function handler(req, res) {
  const secret = req.headers.authorization === `Bearer ${process.env.CRON_SECRET}`
             || req.query.secret === process.env.CRON_SECRET
  if (!secret) return res.status(401).json({ error: 'Unauthorized' })

  let supabaseAdmin
  try { supabaseAdmin = getSupabaseAdmin() }
  catch (e) { return res.status(500).json({ error: e.message }) }

  const appUrl  = process.env.NEXT_PUBLIC_APP_URL
  const now     = new Date()
  const results = { checked: 0, sent: 0, skipped: 0, errors: 0 }

  try {
    const { data: users, error } = await supabaseAdmin
      .from('users')
      .select('id, email, current_mode, current_step, last_entry_at')
      .eq('reminders_active', true)
      .not('current_mode', 'is', null)

    if (error) throw error

    for (const user of users || []) {
      results.checked++

      const mode      = user.current_mode
      const stepIndex = user.current_step || 0
      const windows   = CHECK_WINDOWS[mode]
      if (!windows) { results.skipped++; continue }

      const stepWindow = windows[stepIndex]
      if (!stepWindow) { results.skipped++; continue }  // step has no window, or all done

      // Get most recent entry for reference time
      const { data: recent } = await supabaseAdmin
        .from('entries')
        .select('logged_at, created_at')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(1)
        .single()

      if (!recent) { results.skipped++; continue }

      const refTime     = recent.logged_at || user.last_entry_at || recent.created_at
      const hoursElapsed = (now - new Date(refTime)) / 3600000

      const [minH, maxH] = stepWindow
      const thresholds   = getThresholds(minH, maxH)

      // Which slot are we in?
      let dueSlot = null
      for (let s = 0; s < thresholds.length; s++) {
        const next = s + 1 < thresholds.length ? thresholds[s + 1] : Infinity
        if (hoursElapsed >= thresholds[s] && hoursElapsed < next) {
          dueSlot = s
          break
        }
      }
      if (dueSlot === null) { results.skipped++; continue }

      const label = SLOT_LABELS[dueSlot]

      // Dedupe: skip if this exact slot was already sent after the last log
      const { data: sent } = await supabaseAdmin
        .from('reminder_log')
        .select('id')
        .eq('user_id', user.id)
        .eq('reminder_type', label)
        .eq('step_index', stepIndex)
        .gte('sent_at', new Date(refTime).toISOString())
        .limit(1)

      if (sent && sent.length > 0) { results.skipped++; continue }

      const stepTitle = MODES[mode]?.steps?.[stepIndex]?.title || `Step ${stepIndex + 1}`

      try {
        await sendReminder({
          to: user.email,
          type: getEmailType(dueSlot),
          mode, stepTitle, stepIndex,
          hoursAgo: Math.round(hoursElapsed),
          appUrl,
        })
        await supabaseAdmin.from('reminder_log').insert({
          user_id: user.id, reminder_type: label,
          mode, step_index: stepIndex, sent_at: now.toISOString(),
        })
        results.sent++
      } catch (emailErr) {
        console.error(`Email failed for ${user.id}:`, emailErr)
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
