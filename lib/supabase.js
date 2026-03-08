import { createClient } from '@supabase/supabase-js'

// ─────────────────────────────────────────────────────────────────────────────
// SUPABASE CLIENT SETUP
//
// WHY THIS FILE IS WRITTEN THIS WAY:
//
// The "supabaseKey is required" error happens when the Supabase client is
// created at MODULE LOAD TIME (top of file) before Vercel has injected env
// vars. The fix is:
//
//   1. The BROWSER client (supabase) is created lazily — only on first use.
//      It uses NEXT_PUBLIC_ vars which ARE available at build time AND runtime.
//
//   2. The ADMIN client (getSupabaseAdmin) is a function — never a top-level
//      constant. It runs only inside API routes (server-side) where all env
//      vars are always available.
//
// VERCEL ENV VAR NAMES — add these in Vercel → Settings → Environment Variables:
//   NEXT_PUBLIC_SUPABASE_URL        your project URL (e.g. https://xxx.supabase.co)
//   NEXT_PUBLIC_SUPABASE_PUBLIC_KEY your publishable key (was "anon key")
//   SUPABASE_SECRET_KEY             your secret key (was "service_role key")
//   RESEND_API_KEY                  from resend.com → API Keys
//   NEXT_PUBLIC_APP_URL             your Vercel URL (no trailing slash)
//   CRON_SECRET                     any random string you make up
//
// After adding or changing env vars in Vercel you MUST redeploy.
// ─────────────────────────────────────────────────────────────────────────────

let _supabase = null

export function getSupabase() {
  if (_supabase) return _supabase
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLIC_KEY
  if (!url || !key) {
    console.error(
      '[Leven] Browser Supabase client: missing env vars.\n' +
      '  NEXT_PUBLIC_SUPABASE_URL:', url ? '✓' : '✗ MISSING',
      '\n  NEXT_PUBLIC_SUPABASE_PUBLIC_KEY:', key ? '✓' : '✗ MISSING'
    )
    // Return a dummy so the app doesn't hard-crash before showing an error
    return null
  }
  _supabase = createClient(url, key)
  return _supabase
}

// Named export for convenience — same lazy singleton
export const supabase = {
  from: (...args) => getSupabase()?.from(...args),
  auth: { getSession: (...args) => getSupabase()?.auth?.getSession(...args) },
}

// Admin client — ONLY call from pages/api/ routes, never from the browser
export function getSupabaseAdmin() {
  const url    = process.env.NEXT_PUBLIC_SUPABASE_URL
  const secret = process.env.SUPABASE_SECRET_KEY
  if (!url || !secret) {
    throw new Error(
      '[Leven] Admin Supabase client: missing env vars.\n' +
      '  NEXT_PUBLIC_SUPABASE_URL: ' + (url    ? '✓' : '✗ MISSING') + '\n' +
      '  SUPABASE_SECRET_KEY: '      + (secret ? '✓' : '✗ MISSING')
    )
  }
  return createClient(url, secret, {
    auth: { autoRefreshToken: false, persistSession: false }
  })
}
