import { createClient } from '@supabase/supabase-js'

export const supabase = createClient(
  'https://nzbgirduegrfbuoxpaiq.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im56YmdpcmR1ZWdyZmJ1b3hwYWlxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzI5OTcyMDQsImV4cCI6MjA4ODU3MzIwNH0.8-poPEhft6dzaILmXDss2KC6yKn9YTvJlkjfp2eNToo'
)

export const supabaseAdmin = createClient(
  'https://nzbgirduegrfbuoxpaiq.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im56YmdpcmR1ZWdyZmJ1b3hwYWlxIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3Mjk5NzIwNCwiZXhwIjoyMDg4NTczMjA0fQ.5GGX3x4c-QqDuUZMUAHJOoGoViNaC6CNfp0gEN2yYXY'
)
