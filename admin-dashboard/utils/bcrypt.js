// Simple bcrypt wrapper for browser compatibility
export async function hashPassword(password) {
  // In a real app, use a proper hashing library on the server
  // This is a simplified version for demo purposes
  const encoder = new TextEncoder()
  const data = encoder.encode(password + process.env.JWT_SECRET)
  const hashBuffer = await crypto.subtle.digest('SHA-256', data)
  const hashArray = Array.from(new Uint8Array(hashBuffer))
  const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('')
  return hashHex
}

export async function verifyPassword(password, hashedPassword) {
  const newHash = await hashPassword(password)
  return newHash === hashedPassword
}