// lib/auth.js - SIMPLIFIED VERSION
// For demo purposes only - NOT for production

// Create session in localStorage
export function createSession(userId, isAdmin) {
  console.log('Creating session for user:', userId)
  localStorage.setItem('userId', userId)
  localStorage.setItem('isAdmin', isAdmin.toString())
  localStorage.setItem('token', 'demo-token-' + Date.now())
  console.log('Session created')
}

// Check if user is authenticated
export function isAuthenticated() {
  if (typeof window === 'undefined') return false
  return localStorage.getItem('userId') !== null
}

// Check if user is admin
export function isAdmin() {
  if (typeof window === 'undefined') return false
  return localStorage.getItem('isAdmin') === 'true'
}

// Get current user from token
export function getCurrentUser() {
  if (typeof window === 'undefined') return null
  
  const token = localStorage.getItem('token')
  const userId = localStorage.getItem('userId')
  const isAdmin = localStorage.getItem('isAdmin')
  
  if (!token) return null
  
  return {
    userId,
    isAdmin: isAdmin === 'true',
    token
  }
}

// Destroy session
export function destroySession() {
  if (typeof window === 'undefined') return
  
  localStorage.removeItem('token')
  localStorage.removeItem('userId')
  localStorage.removeItem('isAdmin')
  console.log('Session destroyed')
}

// These functions are not needed for demo
export function generateToken() { return 'demo-token' }
export function verifyToken() { return { userId: '1', isAdmin: true } }