'use client'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { verifyAdminCredentials, isSupabaseConfigured } from '@/lib/supabase'

export default function Login() {
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [supabaseStatus, setSupabaseStatus] = useState('checking')
  const router = useRouter()

  useEffect(() => {
    // Check if Supabase is configured
    const configured = isSupabaseConfigured()
    setSupabaseStatus(configured ? 'configured' : 'not-configured')
    
    if (!configured) {
      console.warn('⚠️ Supabase is not configured. Using demo mode.')
    }
  }, [])

  const handleLogin = async (e) => {
    e.preventDefault()
    setError('')
    setIsLoading(true)
    
    try {
      // Use the Supabase auth function (handles both demo and production)
      const { data, error: authError } = await verifyAdminCredentials(username.trim(), password)
      
      if (authError) {
        setError(authError)
        setIsLoading(false)
        return
      }
      
      if (!data) {
        setError('Authentication failed')
        setIsLoading(false)
        return
      }
      
      console.log('Login successful...')
      
      // Store basic session info in localStorage
      localStorage.setItem('isAuthenticated', 'true')
      localStorage.setItem('user', JSON.stringify(data))
      
      // Redirect to dashboard
      router.push('/dashboard')
      router.refresh() // Refresh the page to update auth state
      
    } catch (error) {
      setIsLoading(false)
      setError('Login failed. Please try again.')
      console.error('Login error:', error)
    }
  }

  // Handle demo login for quick testing
  const handleDemoLogin = () => {
    setUsername('admin')
    setPassword('admin123')
    
    // Auto-submit after a short delay
    setTimeout(() => {
      // Create a proper form submit event
      const submitEvent = new Event('submit', {
        bubbles: true,
        cancelable: true
      })
      
      // Get the form and dispatch the event
      const form = document.querySelector('form')
      if (form) {
        form.dispatchEvent(submitEvent)
      }
    }, 100)
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-950 via-gray-900 to-gray-950 flex items-center justify-center p-6">
      <div className="w-full max-w-md bg-gray-900/80 backdrop-blur-xl border border-gray-800 rounded-xl shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="p-8 border-b border-gray-800 bg-gradient-to-r from-indigo-500/10 to-purple-500/5">
          <div className="flex flex-col items-center gap-4">
            {/* Logo with Image */}
            <div className="flex items-center justify-center w-16 h-16 bg-transparent rounded-xl overflow-hidden">
              <img 
                src="/logo.png" 
                alt="Discord Copilot Logo"
                className="w-full h-full object-contain"
                onError={(e) => {
                  // Fallback if image doesn't load
                  e.target.style.display = 'none'
                  e.target.parentElement.innerHTML = `
                    <div class="w-full h-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center rounded-xl">
                      <svg class="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"></path>
                      </svg>
                    </div>
                  `
                }}
              />
            </div>
            
            <div className="text-center">
              <h1 className="text-2xl font-bold bg-gradient-to-r from-white to-indigo-200 bg-clip-text text-transparent">
                Discord Copilot
              </h1>
              <p className="text-gray-400 text-sm mt-1">Admin Console</p>
            </div>
          </div>
          
          <div className="mt-6 text-center">
            <p className="text-gray-300">Sign in to access the admin dashboard</p>
            {supabaseStatus === 'not-configured' && (
              <p className="text-amber-400 text-sm mt-2 flex items-center justify-center gap-2">
                <span>⚠️</span>
                <span>Running in Demo Mode</span>
              </p>
            )}
          </div>
        </div>
        
        {/* Login Form */}
        <form onSubmit={handleLogin} className="p-8">
          <div className="space-y-6">
            <div>
              <label htmlFor="username" className="block text-sm font-medium text-gray-400 mb-2">
                Username
              </label>
              <input
                id="username"
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="Enter username"
                className="w-full px-4 py-3 bg-gray-950/50 border border-gray-800 rounded-lg text-gray-200 placeholder-gray-500 focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 transition disabled:opacity-50"
                disabled={isLoading}
                autoComplete="username"
                required
                autoFocus
              />
            </div>
            
            <div>
              <label htmlFor="password" className="block text-sm font-medium text-gray-400 mb-2">
                Password
              </label>
              <input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter password"
                className="w-full px-4 py-3 bg-gray-950/50 border border-gray-800 rounded-lg text-gray-200 placeholder-gray-500 focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 transition disabled:opacity-50"
                disabled={isLoading}
                autoComplete="current-password"
                required
              />
            </div>
            
            {error && (
              <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-lg flex items-center gap-3 text-red-400">
                <div className="w-6 h-6 bg-red-500/20 rounded-full flex items-center justify-center flex-shrink-0">
                  <span className="font-bold">!</span>
                </div>
                <span className="text-sm">{error}</span>
              </div>
            )}
            
            <button 
              type="submit" 
              className="w-full py-3 bg-gradient-to-r from-indigo-500 to-purple-600 text-white font-medium rounded-lg hover:from-indigo-600 hover:to-purple-700 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
              disabled={isLoading}
            >
              {isLoading ? (
                <span className="flex items-center justify-center gap-2">
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                  <span>Authenticating...</span>
                </span>
              ) : (
                'Sign In'
              )}
            </button>
            
            <div className="text-center">
              <button 
                type="button" 
                className="w-full py-3 border border-gray-700 text-gray-400 font-medium rounded-lg hover:bg-gray-800/50 hover:text-gray-300 transition-all duration-200 disabled:opacity-50"
                onClick={handleDemoLogin}
                disabled={isLoading}
              >
                Use Demo Credentials
              </button>
            </div>
          </div>
        </form>
        
        {/* Footer */}
        <div className="p-6 border-t border-gray-800 bg-gray-900/50">
          <div className="space-y-4">
            <div className="text-center">
              <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-gray-800/50 border border-gray-700 rounded-full">
                <span className={`w-2 h-2 rounded-full ${supabaseStatus === 'configured' ? 'bg-emerald-500' : 'bg-amber-500'}`}></span>
                <span className="text-xs font-medium text-gray-300">
                  {supabaseStatus === 'configured' ? 'Production Mode' : 'Demo Mode'}
                </span>
              </div>
            </div>
            
            <div className="text-center text-xs text-gray-500 space-x-3">
              <span>v1.0.0</span>
              <span>•</span>
              <span>Admin Console</span>
              <span>•</span>
              <span className="text-gray-400">Secure Access</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}