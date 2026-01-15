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
      const fakeEvent = {
        preventDefault: () => {},
        target: { value: '' }
      }
      
      // Create a proper form submit event
      const submitEvent = new Event('submit', {
        bubbles: true,
        cancelable: true
      })
      
      // Call handleLogin with the event
      handleLogin(submitEvent)
    }, 300)
  }

  return (
    <div className="login-container">
      <div className="login-card">
        <div className="login-header">
          <div className="logo">
            <span className="logo-icon">DC</span>
            <div className="logo-text">
              <h1>Discord Copilot</h1>
              <p className="brand-sub">Admin Console</p>
            </div>
          </div>
          
          <div className="welcome-message">
            <p>Sign in to access the admin dashboard</p>
            {supabaseStatus === 'not-configured' && (
              <p className="demo-notice">⚠️ Running in Demo Mode</p>
            )}
          </div>
        </div>
        
        <form onSubmit={handleLogin} className="login-form">
          <div className="form-group">
            <label htmlFor="username" className="form-label">
              Username
            </label>
            <input
              id="username"
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="Enter username"
              className="form-input"
              disabled={isLoading}
              autoComplete="username"
              required
              autoFocus
            />
          </div>
          
          <div className="form-group">
            <label htmlFor="password" className="form-label">
              Password
            </label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Enter password"
              className="form-input"
              disabled={isLoading}
              autoComplete="current-password"
              required
            />
          </div>
          
          {error && (
            <div className="error-message">
              <span className="error-icon">!</span>
              <span>{error}</span>
            </div>
          )}
          
          <button 
            type="submit" 
            className="login-button"
            disabled={isLoading}
          >
            {isLoading ? (
              <span className="loading-text">
                <span className="loading-dots">•</span>
                Authenticating
                <span className="loading-dots">•</span>
              </span>
            ) : (
              'Sign In'
            )}
          </button>
          
          <div className="demo-login-section">
            <button 
              type="button" 
              className="demo-login-button"
              onClick={() => {
                setUsername('admin')
                setPassword('admin123')
                // Directly trigger form submission after a short delay
                setTimeout(() => {
                  // Create and submit the form directly
                  const form = document.querySelector('.login-form')
                  if (form) {
                    // First prevent any default behavior
                    const submitEvent = new Event('submit', {
                      bubbles: true,
                      cancelable: true
                    })
                    form.dispatchEvent(submitEvent)
                  }
                }, 100)
              }}
              disabled={isLoading}
            >
              Use Demo Credentials (admin/admin123)
            </button>
          </div>
        </form>
        
        <div className="login-footer">
          <div className="credentials-hint">
            <div className="hint-header">Available Credentials</div>
            <div className="hint-content">
              <div className="credential-row">
                <span className="credential-label">Demo Admin:</span>
                <div className="credential-group">
                  <code className="credential-value">admin</code>
                  <span className="credential-separator">/</span>
                  <code className="credential-value">admin123</code>
                </div>
              </div>
              {supabaseStatus === 'configured' && (
                <div className="database-notice">
                  <span className="db-icon">🗄️</span>
                  <span>Production database active</span>
                </div>
              )}
            </div>
          </div>
          
          <div className="version-info">
            <span>v1.0.0</span>
            <span className="separator">•</span>
            <span>Admin Console</span>
            <span className="separator">•</span>
            <span className={`auth-badge ${supabaseStatus === 'configured' ? 'production' : 'demo'}`}>
              {supabaseStatus === 'configured' ? 'Production Auth' : 'Demo Mode'}
            </span>
          </div>
        </div>
      </div>
      
      <style jsx>{`
        /* Reset & Base */
        * {
          margin: 0;
          padding: 0;
          box-sizing: border-box;
        }
        
        .login-container {
          min-height: 100vh;
          background: linear-gradient(135deg, #0a0a0a 0%, #1a1a2e 100%);
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 20px;
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, sans-serif;
        }
        
        /* Login Card */
        .login-card {
          width: 100%;
          max-width: 440px;
          background: rgba(17, 17, 17, 0.95);
          backdrop-filter: blur(10px);
          border: 1px solid rgba(255, 255, 255, 0.1);
          border-radius: 12px;
          overflow: hidden;
          box-shadow: 0 20px 60px rgba(0, 0, 0, 0.5);
          animation: cardEntrance 0.6s ease-out;
        }
        
        @keyframes cardEntrance {
          from {
            opacity: 0;
            transform: translateY(20px) scale(0.95);
          }
          to {
            opacity: 1;
            transform: translateY(0) scale(1);
          }
        }
        
        /* Header */
        .login-header {
          padding: 48px 48px 32px;
          border-bottom: 1px solid rgba(255, 255, 255, 0.1);
          background: linear-gradient(135deg, rgba(88, 101, 242, 0.15), rgba(145, 70, 255, 0.1));
        }
        
        .logo {
          display: flex;
          align-items: center;
          gap: 20px;
          margin-bottom: 24px;
        }
        
        .logo-icon {
          width: 56px;
          height: 56px;
          background: linear-gradient(135deg, #5865F2, #9146FF);
          border-radius: 12px;
          display: flex;
          align-items: center;
          justify-content: center;
          font-weight: 700;
          font-size: 20px;
          color: white;
          flex-shrink: 0;
          box-shadow: 0 4px 20px rgba(88, 101, 242, 0.3);
        }
        
        .logo-text h1 {
          font-size: 28px;
          font-weight: 700;
          background: linear-gradient(135deg, #fff 0%, #a0a0ff 100%);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          margin: 0 0 6px 0;
          line-height: 1.2;
        }
        
        .brand-sub {
          font-size: 14px;
          color: #888;
          margin: 0;
          font-weight: 500;
          letter-spacing: 0.5px;
        }
        
        .welcome-message {
          text-align: center;
          color: #aaa;
          font-size: 15px;
          padding: 12px;
          background: rgba(255, 255, 255, 0.03);
          border-radius: 8px;
          border: 1px solid rgba(255, 255, 255, 0.05);
        }
        
        .demo-notice {
          color: #ffc107;
          font-size: 13px;
          margin-top: 8px;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 6px;
        }
        
        /* Form */
        .login-form {
          padding: 40px;
        }
        
        .form-group {
          margin-bottom: 28px;
        }
        
        .form-label {
          display: block;
          font-size: 13px;
          font-weight: 600;
          color: #888;
          margin-bottom: 10px;
          text-transform: uppercase;
          letter-spacing: 0.5px;
        }
        
        .form-input {
          width: 100%;
          background: rgba(10, 10, 10, 0.8);
          border: 1px solid #222;
          border-radius: 8px;
          color: #e0e0e0;
          padding: 16px;
          font-size: 15px;
          transition: all 0.3s ease;
          font-family: inherit;
        }
        
        .form-input:focus {
          outline: none;
          border-color: #5865F2;
          background: rgba(10, 10, 10, 0.9);
          box-shadow: 0 0 0 3px rgba(88, 101, 242, 0.2);
        }
        
        .form-input:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }
        
        /* Error Message */
        .error-message {
          background: linear-gradient(135deg, rgba(231, 76, 60, 0.15), rgba(231, 76, 60, 0.05));
          border: 1px solid rgba(231, 76, 60, 0.3);
          border-radius: 8px;
          padding: 16px;
          display: flex;
          align-items: center;
          gap: 12px;
          margin-bottom: 28px;
          color: #ff6b6b;
          font-size: 14px;
          animation: shake 0.5s ease-in-out;
        }
        
        @keyframes shake {
          0%, 100% { transform: translateX(0); }
          25% { transform: translateX(-5px); }
          75% { transform: translateX(5px); }
        }
        
        .error-icon {
          font-weight: 700;
          font-size: 18px;
          width: 24px;
          height: 24px;
          background: rgba(231, 76, 60, 0.2);
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          flex-shrink: 0;
        }
        
        /* Login Button */
        .login-button {
          width: 100%;
          background: linear-gradient(135deg, #5865F2, #9146FF);
          color: white;
          border: none;
          border-radius: 8px;
          padding: 18px;
          font-size: 16px;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.3s ease;
          margin-top: 8px;
          font-family: inherit;
          position: relative;
          overflow: hidden;
        }
        
        .login-button::before {
          content: '';
          position: absolute;
          top: 0;
          left: -100%;
          width: 100%;
          height: 100%;
          background: linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.2), transparent);
          transition: 0.5s;
        }
        
        .login-button:hover:not(:disabled) {
          transform: translateY(-2px);
          box-shadow: 0 8px 25px rgba(88, 101, 242, 0.4);
        }
        
        .login-button:hover:not(:disabled)::before {
          left: 100%;
        }
        
        .login-button:active:not(:disabled) {
          transform: translateY(0);
        }
        
        .login-button:disabled {
          opacity: 0.6;
          cursor: not-allowed;
          transform: none !important;
        }
        
        .loading-text {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          letter-spacing: 1px;
        }
        
        .loading-dots {
          animation: pulse 1.5s infinite;
          font-size: 24px;
        }
        
        .loading-dots:nth-child(1) {
          animation-delay: 0s;
        }
        
        .loading-dots:nth-child(3) {
          animation-delay: 0.5s;
        }
        
        @keyframes pulse {
          0%, 100% {
            opacity: 0.3;
            transform: scale(0.8);
          }
          50% {
            opacity: 1;
            transform: scale(1.2);
          }
        }
        
        /* Demo Login Button */
        .demo-login-section {
          margin-top: 20px;
          text-align: center;
        }
        
        .demo-login-button {
          background: transparent;
          color: #888;
          border: 1px solid #333;
          border-radius: 6px;
          padding: 12px 24px;
          font-size: 14px;
          cursor: pointer;
          transition: all 0.3s ease;
          font-family: inherit;
          width: 100%;
        }
        
        .demo-login-button:hover:not(:disabled) {
          background: rgba(255, 255, 255, 0.05);
          color: #aaa;
          border-color: #444;
        }
        
        .demo-login-button:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }
        
        /* Footer */
        .login-footer {
          padding: 32px 40px;
          border-top: 1px solid rgba(255, 255, 255, 0.1);
          background: rgba(15, 15, 15, 0.8);
        }
        
        .credentials-hint {
          background: rgba(255, 255, 255, 0.03);
          border: 1px solid rgba(255, 255, 255, 0.1);
          border-radius: 10px;
          overflow: hidden;
          margin-bottom: 24px;
          backdrop-filter: blur(10px);
        }
        
        .hint-header {
          background: linear-gradient(135deg, rgba(88, 101, 242, 0.1), rgba(145, 70, 255, 0.05));
          padding: 14px 20px;
          font-size: 13px;
          font-weight: 600;
          color: #a0a0ff;
          text-transform: uppercase;
          letter-spacing: 1px;
        }
        
        .hint-content {
          padding: 20px;
        }
        
        .credential-row {
          display: flex;
          align-items: center;
          gap: 16px;
          margin-bottom: 12px;
          padding: 12px;
          background: rgba(255, 255, 255, 0.02);
          border-radius: 6px;
          transition: all 0.3s ease;
        }
        
        .credential-row:hover {
          background: rgba(255, 255, 255, 0.05);
        }
        
        .credential-row:last-child {
          margin-bottom: 0;
        }
        
        .credential-label {
          font-size: 14px;
          color: #777;
          min-width: 100px;
          font-weight: 500;
        }
        
        .credential-group {
          display: flex;
          align-items: center;
          gap: 8px;
        }
        
        .credential-value {
          font-family: 'Menlo', 'Monaco', 'Courier New', monospace;
          font-size: 14px;
          color: #e0e0e0;
          background: rgba(255, 255, 255, 0.05);
          padding: 6px 12px;
          border-radius: 4px;
          border: 1px solid rgba(255, 255, 255, 0.1);
        }
        
        .credential-separator {
          color: #666;
          font-size: 18px;
        }
        
        .database-notice {
          display: flex;
          align-items: center;
          gap: 8px;
          background: rgba(46, 204, 113, 0.1);
          border: 1px solid rgba(46, 204, 113, 0.2);
          border-radius: 6px;
          padding: 10px 14px;
          margin-top: 12px;
          font-size: 13px;
          color: #2ecc71;
        }
        
        .db-icon {
          font-size: 16px;
        }
        
        .version-info {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 16px;
          font-size: 13px;
          color: #666;
          flex-wrap: wrap;
        }
        
        .separator {
          opacity: 0.3;
          font-size: 18px;
        }
        
        .auth-badge {
          padding: 4px 12px;
          border-radius: 20px;
          font-size: 12px;
          font-weight: 600;
          border: 1px solid;
        }
        
        .auth-badge.production {
          background: linear-gradient(135deg, rgba(46, 204, 113, 0.2), rgba(39, 174, 96, 0.2));
          color: #2ecc71;
          border-color: rgba(46, 204, 113, 0.3);
        }
        
        .auth-badge.demo {
          background: linear-gradient(135deg, rgba(255, 193, 7, 0.2), rgba(255, 168, 0, 0.2));
          color: #ffc107;
          border-color: rgba(255, 193, 7, 0.3);
        }
        
        /* Responsive */
        @media (max-width: 480px) {
          .login-container {
            padding: 16px;
          }
          
          .login-card {
            max-width: 100%;
          }
          
          .login-header {
            padding: 32px 24px 24px;
          }
          
          .login-form {
            padding: 32px 24px;
          }
          
          .login-footer {
            padding: 24px;
          }
          
          .logo {
            flex-direction: column;
            text-align: center;
            gap: 16px;
          }
          
          .logo-icon {
            width: 48px;
            height: 48px;
          }
          
          .logo-text h1 {
            font-size: 24px;
          }
          
          .credential-row {
            flex-direction: column;
            align-items: flex-start;
            gap: 8px;
          }
          
          .credential-label {
            min-width: auto;
          }
          
          .version-info {
            gap: 8px;
          }
        }
        
        /* Focus Styles for Accessibility */
        .form-input:focus,
        .login-button:focus,
        .demo-login-button:focus {
          outline: 2px solid rgba(88, 101, 242, 0.5);
          outline-offset: 2px;
        }
      `}</style>
    </div>
  )
}