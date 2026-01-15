import { createClient } from '@supabase/supabase-js'

// Get environment variables
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

// Check if we're in browser environment
const isBrowser = typeof window !== 'undefined'

// Validate environment variables
if (isBrowser && (!supabaseUrl || !supabaseAnonKey)) {
  console.warn('⚠️ Supabase environment variables are missing!')
  console.warn('Make sure .env.local contains:')
  console.warn('NEXT_PUBLIC_SUPABASE_URL')
  console.warn('NEXT_PUBLIC_SUPABASE_ANON_KEY')
  console.warn('Using demo mode...')
}

// Create clients with fallbacks
export const supabaseAdmin = createClient(
  supabaseUrl || 'https://dummy-url.supabase.co',
  supabaseServiceKey || 'dummy-service-key',
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  }
)

// Create regular client for client-side operations
export const supabase = createClient(
  supabaseUrl || 'https://dummy-url.supabase.co',
  supabaseAnonKey || 'dummy-anon-key'
)

// Check if Supabase is properly configured
export const isSupabaseConfigured = () => {
  return !!(supabaseUrl && supabaseAnonKey && supabaseUrl !== 'https://dummy-url.supabase.co')
}

// SIMPLE DEMO VERSION - Always works with admin/admin123
export async function verifyAdminCredentials(username, password) {
  console.log('verifyAdminCredentials called with:', { username, password })
  
  // SIMPLE DEMO - Always accept admin/admin123
  if (username.trim() === 'admin' && password === 'admin123') {
    console.log('✅ Demo credentials accepted')
    return { 
      data: { 
        id: '1', 
        username: 'admin',
        isAdmin: true 
      },
      error: null  // Explicitly set error to null
    }
  }
  
  console.log('❌ Invalid credentials')
  return { 
    data: null, 
    error: 'Invalid credentials' 
  }
}