// app/page.js - Dark Professional Login
'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'

export default function Login() {
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const router = useRouter()

  const handleLogin = async (e) => {
    e.preventDefault()
    setError('')
    setIsLoading(true)
    
    // Simple authentication for demo
    if(username === 'admin' && password === 'admin123') {
      // Simulate network delay for realistic feel
      setTimeout(() => {
        localStorage.setItem('isAdmin', 'true')
        router.push('/dashboard')
      }, 300)
    } else {
      setIsLoading(false)
      setError('Invalid credentials')
    }
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
        </form>
        
        <div className="login-footer">
          <div className="credentials-hint">
            <div className="hint-header">Demo Credentials</div>
            <div className="hint-content">
              <div className="credential-row">
                <span className="credential-label">Username:</span>
                <code className="credential-value">admin</code>
              </div>
              <div className="credential-row">
                <span className="credential-label">Password:</span>
                <code className="credential-value">admin123</code>
              </div>
            </div>
          </div>
          
          <div className="version-info">
            <span>v1.0.0</span>
            <span className="separator">•</span>
            <span>Admin Console</span>
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
          background: #0a0a0a;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 20px;
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, sans-serif;
        }
        
        /* Login Card */
        .login-card {
          width: 100%;
          max-width: 420px;
          background: #111;
          border: 1px solid #222;
          border-radius: 8px;
          overflow: hidden;
          box-shadow: 0 8px 32px rgba(0, 0, 0, 0.3);
        }
        
        /* Header */
        .login-header {
          padding: 40px 40px 30px;
          border-bottom: 1px solid #222;
          background: linear-gradient(135deg, rgba(88, 101, 242, 0.1), rgba(145, 70, 255, 0.05));
        }
        
        .logo {
          display: flex;
          align-items: center;
          gap: 16px;
        }
        
        .logo-icon {
          width: 48px;
          height: 48px;
          background: linear-gradient(135deg, #5865F2, #9146FF);
          border-radius: 10px;
          display: flex;
          align-items: center;
          justify-content: center;
          font-weight: 600;
          font-size: 16px;
          color: white;
          flex-shrink: 0;
        }
        
        .logo-text h1 {
          font-size: 22px;
          font-weight: 600;
          color: #fff;
          margin: 0 0 4px 0;
        }
        
        .brand-sub {
          font-size: 13px;
          color: #888;
          margin: 0;
        }
        
        /* Form */
        .login-form {
          padding: 40px;
        }
        
        .form-group {
          margin-bottom: 24px;
        }
        
        .form-label {
          display: block;
          font-size: 13px;
          font-weight: 500;
          color: #888;
          margin-bottom: 8px;
          text-transform: uppercase;
          letter-spacing: 0.5px;
        }
        
        .form-input {
          width: 100%;
          background: #0a0a0a;
          border: 1px solid #222;
          border-radius: 4px;
          color: #e0e0e0;
          padding: 12px 16px;
          font-size: 14px;
          transition: all 0.2s;
        }
        
        .form-input:focus {
          outline: none;
          border-color: #444;
          background: #0f0f0f;
        }
        
        .form-input:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }
        
        /* Error Message */
        .error-message {
          background: rgba(231, 76, 60, 0.1);
          border: 1px solid rgba(231, 76, 60, 0.2);
          border-radius: 4px;
          padding: 12px 16px;
          display: flex;
          align-items: center;
          gap: 12px;
          margin-bottom: 24px;
          color: #e74c3c;
          font-size: 14px;
        }
        
        .error-icon {
          font-weight: 600;
          font-size: 16px;
          width: 20px;
          text-align: center;
        }
        
        /* Login Button */
        .login-button {
          width: 100%;
          background: #5865F2;
          color: white;
          border: none;
          border-radius: 4px;
          padding: 14px;
          font-size: 15px;
          font-weight: 500;
          cursor: pointer;
          transition: all 0.2s;
          margin-top: 8px;
        }
        
        .login-button:hover:not(:disabled) {
          background: #4752c4;
        }
        
        .login-button:disabled {
          opacity: 0.7;
          cursor: not-allowed;
        }
        
        .loading-text {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
        }
        
        .loading-dots {
          animation: pulse 1.5s infinite;
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
          }
          50% {
            opacity: 1;
          }
        }
        
        /* Footer */
        .login-footer {
          padding: 30px 40px;
          border-top: 1px solid #222;
          background: #0f0f0f;
        }
        
        .credentials-hint {
          background: rgba(255, 255, 255, 0.03);
          border: 1px solid #222;
          border-radius: 6px;
          overflow: hidden;
          margin-bottom: 24px;
        }
        
        .hint-header {
          background: rgba(255, 255, 255, 0.05);
          padding: 10px 16px;
          font-size: 12px;
          font-weight: 500;
          color: #888;
          text-transform: uppercase;
          letter-spacing: 0.5px;
        }
        
        .hint-content {
          padding: 16px;
        }
        
        .credential-row {
          display: flex;
          align-items: center;
          gap: 12px;
          margin-bottom: 8px;
        }
        
        .credential-row:last-child {
          margin-bottom: 0;
        }
        
        .credential-label {
          font-size: 13px;
          color: #666;
          min-width: 80px;
        }
        
        .credential-value {
          font-family: 'Menlo', 'Monaco', 'Courier New', monospace;
          font-size: 13px;
          color: #e0e0e0;
          background: rgba(255, 255, 255, 0.05);
          padding: 4px 8px;
          border-radius: 3px;
          border: 1px solid #222;
        }
        
        .version-info {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 12px;
          font-size: 12px;
          color: #666;
        }
        
        .separator {
          opacity: 0.5;
        }
        
        /* Responsive */
        @media (max-width: 480px) {
          .login-container {
            padding: 16px;
          }
          
          .login-header,
          .login-form,
          .login-footer {
            padding: 30px 24px;
          }
          
          .logo {
            flex-direction: column;
            text-align: center;
            gap: 12px;
          }
          
          .logo-text h1 {
            font-size: 20px;
          }
        }
        
        /* Focus Styles for Accessibility */
        .form-input:focus,
        .login-button:focus {
          outline: 2px solid rgba(88, 101, 242, 0.5);
          outline-offset: 2px;
        }
      `}</style>
    </div>
  )
}