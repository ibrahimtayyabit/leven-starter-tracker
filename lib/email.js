import nodemailer from 'nodemailer'

// ─────────────────────────────────────────────────────────────────────────────
// EMAIL via Gmail SMTP — free, no domain needed
//
// Setup (one time):
//   1. Google Account → Security → turn on 2-Step Verification
//   2. Google Account → Security → App Passwords
//      → name it "Leven" → copy the 16-character password
//   3. Add to Vercel environment variables:
//        GMAIL_USER = your.email@gmail.com
//        GMAIL_PASS = the 16-char app password (no spaces)
// ─────────────────────────────────────────────────────────────────────────────

function getTransporter() {
  return nodemailer.createTransport({
    service: 'gmail',
    auth: {
      user: process.env.GMAIL_USER,
      pass: process.env.GMAIL_PASS,
    },
  })
}

const FROM_NAME = 'Sarver Farms Starter Tracker'

export const REMINDER_TYPES = {
  WINDOW_START: 'window_start',
  FEED_NOW:     'feed_now',
  OVERDUE:      'overdue',
}

const MODE_LABELS = {
  refresh:  'Starter Refresh',
  counter:  'Counter / Daily',
  fridge:   'Fridge Storage',
  longterm: 'Long-Term Dry Storage',
}

export const CHECK_WINDOWS = {
  refresh:  { 1: [4,6], 2: [4,8], 3: [4,8], 4: [4,8] },
  counter:  { 1: [4,8], 2: [4,8] },
  fridge:   { 0: [48,96], 2: [2,4], 3: [4,12] },
  longterm: { 0: [4,8], 1: [24,72] },
}

function emailHtml({ headline, body, nextStep, mode, hoursAgo, ctaUrl }) {
  return `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f5f0e8;font-family:Georgia,serif;">
  <div style="max-width:560px;margin:0 auto;background:#faf7f2;border-top:4px solid #7a5c3a;">
    <div style="background:#2c1f0e;padding:24px 32px;border-bottom:2px solid #7a5c3a;">
      <span style="font-family:Georgia,serif;font-size:28px;font-weight:bold;color:#c9952a;">Leven</span>
      <span style="display:block;font-size:11px;letter-spacing:0.2em;text-transform:uppercase;color:#9e8060;margin-top:2px;">Sarver Farms · Starter Tracker</span>
    </div>
    <div style="padding:32px;">
      <h1 style="font-family:Georgia,serif;font-size:22px;color:#2c1f0e;margin:0 0 12px;font-style:italic;">${headline}</h1>
      <p style="font-size:15px;line-height:1.7;color:#5a4030;margin:0 0 20px;">${body}</p>
      ${nextStep ? `<div style="background:#e8dcc8;border-left:4px solid #7a5c3a;padding:12px 16px;margin:0 0 20px;"><span style="font-size:11px;letter-spacing:0.15em;text-transform:uppercase;color:#9e8060;">Next step</span><p style="margin:4px 0 0;font-size:14px;font-weight:bold;color:#2c1f0e;">${nextStep}</p></div>` : ''}
      <div style="margin:0 0 24px;font-size:13px;color:#9e8060;border-top:1px solid #e8dcc8;padding-top:16px;">
        <span style="display:inline-block;background:#e8dcc8;padding:3px 8px;margin-right:8px;font-size:11px;text-transform:uppercase;letter-spacing:0.1em;">${MODE_LABELS[mode] || mode}</span>
        ${hoursAgo ? `<span>Last logged ${hoursAgo} hours ago</span>` : ''}
      </div>
      <a href="${ctaUrl}" style="display:inline-block;background:#7a5c3a;color:#faf7f2;padding:12px 24px;text-decoration:none;font-family:'Courier New',monospace;font-size:13px;letter-spacing:0.1em;text-transform:uppercase;">→ Log my update</a>
    </div>
    <div style="background:#2c1f0e;padding:16px 32px;font-size:11px;color:#5a4030;text-align:center;">
      Sarver Farms Heirloom Sourdough Starter
    </div>
  </div>
</body>
</html>`
}

export async function sendReminder({ to, type, mode, stepTitle, hoursAgo, appUrl }) {
  const ctaUrl = appUrl || process.env.NEXT_PUBLIC_APP_URL || ''
  const content = {
    [REMINDER_TYPES.WINDOW_START]: {
      subject: '🌾 Time to check your starter',
      headline: 'Your starter is ready to check on.',
      body: "It's been a few hours since your last log. Your starter is entering its active window — look for bubbles, a dome, and rising activity. Pop open the app and log what you see.",
    },
    [REMINDER_TYPES.FEED_NOW]: {
      subject: '⏰ Feed your starter now',
      headline: 'Peak activity window — feed it now.',
      body: "Your starter is likely at or near peak rise right now. If it's risen 2–3× from your marked line, it's ready to use for baking, or feed again to keep it going.",
    },
    [REMINDER_TYPES.OVERDUE]: {
      subject: '🚨 Your starter needs attention',
      headline: 'Feeding overdue.',
      body: "Your check window has passed and your starter hasn't been logged. Check on it as soon as you can — if it's fallen and looks deflated, feed it now.",
    },
  }
  const c = content[type]
  if (!c) return
  const transporter = getTransporter()
  await transporter.sendMail({
    from: `"${FROM_NAME}" <${process.env.GMAIL_USER}>`,
    to,
    subject: c.subject,
    html: emailHtml({ headline: c.headline, body: c.body, nextStep: stepTitle || null, mode, hoursAgo, ctaUrl }),
  })
}

export async function sendWelcome({ email, appUrl }) {
  const ctaUrl = appUrl || process.env.NEXT_PUBLIC_APP_URL || ''
  const transporter = getTransporter()
  await transporter.sendMail({
    from: `"${FROM_NAME}" <${process.env.GMAIL_USER}>`,
    to: email,
    subject: '🌾 Leven is set up — reminders are active',
    html: emailHtml({
      headline: "You're all set up!",
      body: "Your Sarver Farms starter tracker is connected and your email reminders are active. Every time you log a step, the system will automatically remind you when it's time to check back or feed — no input needed from you.",
      nextStep: null, mode: 'counter', hoursAgo: null, ctaUrl,
    }),
  })
}
