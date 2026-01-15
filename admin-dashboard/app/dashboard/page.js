'use client'
import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'

export default function Dashboard() {
  const [instructions, setInstructions] = useState('')
  const [channelList, setChannelList] = useState([])
  const [newChannel, setNewChannel] = useState('')
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [saveStatus, setSaveStatus] = useState(null)
  const [activeSection, setActiveSection] = useState('instructions')
  const [currentUser, setCurrentUser] = useState(null)
  const router = useRouter()
  const saveTimeoutRef = useRef(null)

  useEffect(() => {
    // Check if user is authenticated (from localStorage)
    const isAuthenticated = localStorage.getItem('isAuthenticated')
    const userData = localStorage.getItem('user')
    
    if (!isAuthenticated || !userData) {
      router.push('/')
      return
    }
    
    try {
      const user = JSON.parse(userData)
      setCurrentUser(user)
    } catch (error) {
      console.error('Error parsing user data:', error)
      router.push('/')
      return
    }
    
    loadSettings()
  }, [router])

  const loadSettings = async () => {
    try {
      const { data, error } = await supabase
        .from('admin_settings')
        .select('*')
        .limit(1)
        .single()
      
      if (error && error.code !== 'PGRST116') throw error
      
      if (data) {
        setInstructions(data.system_instructions || 'You are a helpful assistant. Be concise and professional.')
        setChannelList(data.allowed_channels || [])
      }
    } catch (error) {
      console.log('No settings found, using defaults')
    }
    setIsLoading(false)
  }

  const saveSettings = async () => {
    if (isSaving) return
    
    setIsSaving(true)
    setSaveStatus(null)
    
    try {
      // Validate instructions length
      if (instructions.length > 4000) {
        throw new Error('Instructions exceed 4000 character limit')
      }

      const channelsArray = newChannel 
        ? [...channelList, newChannel.trim()].filter(c => c)
        : channelList
      
      const { error } = await supabase
        .from('admin_settings')
        .upsert({
          id: 1,
          system_instructions: instructions,
          allowed_channels: channelsArray
        }, {
          onConflict: 'id'
        })
      
      if (error) throw error
      
      setChannelList(channelsArray)
      setNewChannel('')
      
      setSaveStatus({
        type: 'success',
        message: 'Settings saved. Bot will update within 30 seconds.'
      })
      
      if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current)
      saveTimeoutRef.current = setTimeout(() => {
        setSaveStatus(null)
      }, 5000)
      
    } catch (error) {
      console.error(error)
      setSaveStatus({
        type: 'error',
        message: error.message || 'Error saving settings. Please try again.'
      })
    } finally {
      setIsSaving(false)
    }
  }

  const removeChannel = (index) => {
    const updatedChannels = [...channelList]
    updatedChannels.splice(index, 1)
    setChannelList(updatedChannels)
  }

  const resetMemory = async () => {
    if (!window.confirm('Reset all conversation memory? This cannot be undone.')) {
      return
    }
    
    try {
      const { error } = await supabase.from('conversations').delete().neq('id', 0)
      if (error) throw error
      
      alert('All conversations have been reset.')
    } catch (error) {
      alert('Error resetting memory: ' + error.message)
    }
  }

  const logout = () => {
    // Clear localStorage
    localStorage.removeItem('isAuthenticated')
    localStorage.removeItem('user')
    router.push('/')
  }

  const addChannel = () => {
    const channel = newChannel.trim()
    if (!channel) return
    
    // Check for duplicates
    if (channelList.includes(channel)) {
      setSaveStatus({
        type: 'error',
        message: 'Channel already exists in the list'
      })
      return
    }
    
    setChannelList([...channelList, channel])
    setNewChannel('')
  }

  if (isLoading) {
    return (
      <div className="loading">
        <div className="loader"></div>
        <p>Loading dashboard...</p>
      </div>
    )
  }

  return (
    <div className="dashboard">
      {/* Navigation */}
      <nav className="nav">
        <div className="nav-brand">
          <div className="logo">
            <span className="logo-icon">DC</span>
            <div className="logo-text">
              <h1>Discord Copilot</h1>
              <p className="brand-sub">Admin Console</p>
            </div>
          </div>
        </div>
        
        <div className="nav-stats">
          <div className="stat-item">
            <span className="stat-label">Channels</span>
            <span className="stat-value">{channelList.length}</span>
          </div>
          <div className="stat-item">
            <span className="stat-label">Status</span>
            <span className="stat-value status-active">● Active</span>
          </div>
          <div className="stat-item">
            <span className="stat-label">Role</span>
            <span className="stat-value role-badge-small">
              {currentUser?.role || 'admin'}
            </span>
          </div>
        </div>
        
        <div className="nav-actions">
          <button 
            onClick={saveSettings}
            disabled={isSaving}
            className="btn-save"
            title="Save current settings"
          >
            {isSaving ? 'Saving...' : 'Save Changes'}
          </button>
          
          <button onClick={logout} className="btn-logout" title="Logout">
            Logout
          </button>
        </div>
      </nav>

      {/* Status Alert */}
      {saveStatus && (
        <div className={`alert ${saveStatus.type}`}>
          <span className="alert-icon">{saveStatus.type === 'success' ? '✓' : '!'}</span>
          <span>{saveStatus.message}</span>
          <button onClick={() => setSaveStatus(null)} className="alert-close" title="Dismiss">
            ×
          </button>
        </div>
      )}

      <div className="container">
        {/* Side Menu */}
        <aside className="menu">
          <div className="menu-section">
            <h3 className="menu-title">Configuration</h3>
            <button 
              className={`menu-item ${activeSection === 'instructions' ? 'active' : ''}`}
              onClick={() => setActiveSection('instructions')}
              title="Bot instructions and behavior"
            >
              <span className="menu-icon">📝</span>
              Instructions
            </button>
            <button 
              className={`menu-item ${activeSection === 'channels' ? 'active' : ''}`}
              onClick={() => setActiveSection('channels')}
              title="Manage allowed channels"
            >
              <span className="menu-icon">#️⃣</span>
              Channels
            </button>
            <button 
              className={`menu-item ${activeSection === 'commands' ? 'active' : ''}`}
              onClick={() => setActiveSection('commands')}
              title="Bot commands and actions"
            >
              <span className="menu-icon">⚡</span>
              Commands
            </button>
            <button 
              className={`menu-item ${activeSection === 'memory' ? 'active' : ''}`}
              onClick={() => setActiveSection('memory')}
              title="Conversation memory management"
            >
              <span className="menu-icon">🧠</span>
              Memory
            </button>
          </div>
          
          {/* Current User Info */}
          <div className="user-info-sidebar">
            <div className="user-avatar-sidebar">
              {currentUser?.username?.charAt(0)?.toUpperCase() || 'A'}
            </div>
            <div className="user-details">
              <div className="user-name">{currentUser?.username || 'Admin'}</div>
              <div className={`user-role role-${currentUser?.role || 'admin'}`}>
                {currentUser?.role || 'admin'}
              </div>
            </div>
          </div>
        </aside>

        {/* Main Content */}
        <main className="content">
          {/* Instructions Section */}
          {activeSection === 'instructions' && (
            <div className="section">
              <div className="section-header">
                <h2>Bot Instructions</h2>
                <p className="section-sub">Define how your bot should behave and respond</p>
              </div>
              
              <div className="card">
                <div className="card-header">
                  <h3>System Prompt</h3>
                  <div className={`char-count ${instructions.length > 4000 ? 'char-count-warning' : ''}`}>
                    {instructions.length}/4000 chars
                  </div>
                </div>
                <textarea
                  value={instructions}
                  onChange={(e) => setInstructions(e.target.value)}
                  placeholder="Example: You are a helpful assistant for our development team. Be concise, technical, and professional. Focus on code-related questions. If unsure, say so. Never share sensitive information."
                  className="textarea"
                  rows={12}
                  maxLength={4000}
                />
                
                <div className="presets">
                  <h4>Quick Presets</h4>
                  <div className="preset-grid">
                    <div 
                      className="preset-card"
                      onClick={() => setInstructions('You are a professional assistant for a tech team. Provide accurate, concise answers. Focus on technical accuracy and clear explanations.')}
                      title="Technical Assistant preset"
                    >
                      <h5>Technical Assistant</h5>
                      <p>Accurate, concise, technical</p>
                    </div>
                    <div 
                      className="preset-card"
                      onClick={() => setInstructions('You are a helpful team assistant. Be friendly and encouraging. Help with brainstorming and creative problem solving. Use a casual but professional tone.')}
                      title="Team Helper preset"
                    >
                      <h5>Team Helper</h5>
                      <p>Friendly, encouraging, creative</p>
                    </div>
                    <div 
                      className="preset-card"
                      onClick={() => setInstructions('You are a strict documentation assistant. Provide only factual information from known sources. Be concise. No speculation. Use bullet points when appropriate.')}
                      title="Documentation Bot preset"
                    >
                      <h5>Documentation Bot</h5>
                      <p>Factual, concise, no-nonsense</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Channels Section */}
          {activeSection === 'channels' && (
            <div className="section">
              <div className="section-header">
                <h2>Channel Access</h2>
                <p className="section-sub">Control which Discord channels the bot can respond in</p>
              </div>
              
              <div className="card">
                <h3>Add Channel</h3>
                <div className="input-group">
                  <input
                    type="text"
                    value={newChannel}
                    onChange={(e) => setNewChannel(e.target.value)}
                    placeholder="Enter Discord Channel ID"
                    className="input"
                    onKeyPress={(e) => {
                      if (e.key === 'Enter') {
                        addChannel()
                      }
                    }}
                  />
                  <button 
                    onClick={addChannel}
                    className="btn-add"
                    disabled={!newChannel.trim()}
                  >
                    Add
                  </button>
                </div>
                <p className="input-help">Right-click a Discord channel → "Copy ID" (Developer mode required)</p>
                
                <div className="divider"></div>
                
                <h3>Allowed Channels ({channelList.length})</h3>
                {channelList.length === 0 ? (
                  <div className="empty-state">
                    <div className="empty-icon">#️⃣</div>
                    <p>No channels added yet</p>
                    <p className="empty-sub">Add channel IDs to restrict bot access</p>
                  </div>
                ) : (
                  <div className="channels-list">
                    {channelList.map((channel, index) => (
                      <div key={index} className="channel-item">
                        <div className="channel-info">
                          <code className="channel-id">{channel}</code>
                          <span className="channel-status">Active</span>
                        </div>
                        <button 
                          onClick={() => removeChannel(index)}
                          className="btn-remove"
                          title="Remove channel"
                        >
                          Remove
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Commands & Actions Section */}
          {activeSection === 'commands' && (
            <div className="section">
              <div className="section-header">
                <h2>Bot Commands & Actions</h2>
                <p className="section-sub">Available commands and actions for your Discord bot</p>
              </div>
              
              {/* Basic Commands Card */}
              <div className="card">
                <h3>Basic Commands</h3>
                <p className="section-description">These commands are always available to users</p>
                
                <div className="commands-list">
                  <div className="command-item">
                    <div className="command-header">
                      <code>!help</code>
                      <span className="command-tag">User</span>
                    </div>
                    <p className="command-description">Show available commands and bot information</p>
                  </div>
                  
                  <div className="command-item">
                    <div className="command-header">
                      <code>!ping</code>
                      <span className="command-tag">User</span>
                    </div>
                    <p className="command-description">Check if the bot is online and responsive</p>
                  </div>
                  
                  <div className="command-item">
                    <div className="command-header">
                      <code>!ask [question]</code>
                      <span className="command-tag">User</span>
                    </div>
                    <p className="command-description">Ask the AI a question. The bot will respond with an intelligent answer based on your instructions.</p>
                  </div>
                  
                  <div className="command-item">
                    <div className="command-header">
                      <code>!clear</code>
                      <span className="command-tag">User</span>
                    </div>
                    <p className="command-description">Clear conversation history for the current channel</p>
                  </div>
                </div>
              </div>
              
              {/* Image Generation Commands Card */}
              <div className="card">
                <h3>Image Generation Commands</h3>
                <p className="section-description">Generate AI images using Clipdrop API</p>
                
                <div className="commands-list">
                  <div className="command-item">
                    <div className="command-header">
                      <code>!image [prompt]</code>
                      <span className="command-tag">User</span>
                    </div>
                    <p className="command-description">Generate an image from text description. Uses Clipdrop API for high-quality images.</p>
                    <div className="command-examples">
                      <strong>Examples:</strong>
                      <ul>
                        <li><code>!image a cute cat wearing a hat</code></li>
                        <li><code>!image futuristic cityscape at night, neon lights</code></li>
                        <li><code>!image fantasy landscape with dragons, digital art</code></li>
                      </ul>
                    </div>
                  </div>
                  
                  <div className="command-item">
                    <div className="command-header">
                      <code>!gen [prompt]</code>
                      <span className="command-tag">User</span>
                    </div>
                    <p className="command-description">Alias for !image command. Generate images from text prompts.</p>
                  </div>
                  
                  <div className="command-item">
                    <div className="command-header">
                      <code>!imagine [prompt]</code>
                      <span className="command-tag">User</span>
                    </div>
                    <p className="command-description">Another alias for !image command.</p>
                  </div>
                </div>
                
                <div className="image-tips">
                  <h4>🎨 Image Generation Tips:</h4>
                  <ul>
                    <li>Be descriptive with details, colors, and lighting</li>
                    <li>Specify art style (photorealistic, digital art, anime, etc.)</li>
                    <li>Keep prompts under 1000 characters</li>
                    <li>Images are generated at 1024x1024 resolution</li>
                    <li>There's a daily limit per user (configured on server)</li>
                  </ul>
                </div>
              </div>
              
              {/* Admin Commands Card */}
              <div className="card">
                <h3>Admin Commands</h3>
                <p className="section-description">Commands available only to admin users</p>
                
                <div className="commands-list">
                  <div className="command-item">
                    <div className="command-header">
                      <code>!admin help</code>
                      <span className="command-tag admin">Admin</span>
                    </div>
                    <p className="command-description">Show admin-only commands</p>
                  </div>
                  
                  <div className="command-item">
                    <div className="command-header">
                      <code>!admin stats</code>
                      <span className="command-tag admin">Admin</span>
                    </div>
                    <p className="command-description">Show bot statistics and usage data</p>
                  </div>
                  
                  <div className="command-item">
                    <div className="command-header">
                      <code>!admin restart</code>
                      <span className="command-tag admin">Admin</span>
                    </div>
                    <p className="command-description">Restart the bot (soft restart)</p>
                  </div>
                  
                  <div className="command-item">
                    <div className="command-header">
                      <code>!admin channels</code>
                      <span className="command-tag admin">Admin</span>
                    </div>
                    <p className="command-description">List all channels where the bot is active</p>
                  </div>
                </div>
              </div>
              
              {/* Command Usage Examples */}
              <div className="card">
                <h3>Usage Examples</h3>
                
                <div className="examples-grid">
                  <div className="example-card">
                    <h4>Basic Questions</h4>
                    <ul>
                      <li><code>!help</code> - See all commands</li>
                      <li><code>!ping</code> - Check bot status</li>
                      <li><code>!ask What is React?</code> - Ask technical questions</li>
                      <li><code>!ask How do I deploy to Vercel?</code> - Get deployment help</li>
                    </ul>
                  </div>
                  
                  <div className="example-card">
                    <h4>Image Generation</h4>
                    <ul>
                      <li><code>!image sunset over mountains</code> - Generate landscape</li>
                      <li><code>!gen cyberpunk city street</code> - Create futuristic scenes</li>
                      <li><code>!imagine cute robot pet</code> - Generate character art</li>
                      <li><code>!image abstract geometric pattern</code> - Create abstract art</li>
                    </ul>
                  </div>
                  
                  <div className="example-card">
                    <h4>Team Collaboration</h4>
                    <ul>
                      <li><code>!ask Brainstorm features for our app</code> - Brainstorming</li>
                      <li><code>!ask Create a meeting agenda</code> - Meeting planning</li>
                      <li><code>!ask Project timeline estimation</code> - Project planning</li>
                      <li><code>!ask Team communication best practices</code> - Team guidance</li>
                    </ul>
                  </div>
                </div>
              </div>
              
              {/* Bot Actions Card */}
              <div className="card">
                <h3>Bot Actions</h3>
                <p className="section-description">Automatic actions the bot performs</p>
                
                <div className="actions-list">
                  <div className="action-item">
                    <div className="action-icon">💬</div>
                    <div className="action-content">
                      <h4>Conversation Memory</h4>
                      <p>The bot remembers conversation context within each channel for 24 hours.</p>
                    </div>
                  </div>
                  
                  <div className="action-item">
                    <div className="action-icon">🖼️</div>
                    <div className="action-content">
                      <h4>Image Generation</h4>
                      <p>AI image generation using Clipdrop API. Daily limits apply per user.</p>
                    </div>
                  </div>
                  
                  <div className="action-item">
                    <div className="action-icon">🔒</div>
                    <div className="action-content">
                      <h4>Channel Restrictions</h4>
                      <p>Bot only responds in configured channels. Use !admin channels to check.</p>
                    </div>
                  </div>
                  
                  <div className="action-item">
                    <div className="action-icon">⚙️</div>
                    <div className="action-content">
                      <h4>Real-time Updates</h4>
                      <p>Configuration changes take effect within 30 seconds.</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Memory Section */}
          {activeSection === 'memory' && (
            <div className="section">
              <div className="section-header">
                <h2>Memory Management</h2>
                <p className="section-sub">Control conversation history and data</p>
              </div>
              
              <div className="card danger-zone">
                <div className="danger-header">
                  <h3>⚠️ Danger Zone</h3>
                  <span className="danger-tag">Irreversible</span>
                </div>
                <p className="danger-desc">
                  This will permanently delete all conversation history. The bot will lose all context.
                </p>
                <button onClick={resetMemory} className="btn-danger">
                  Reset All Conversations
                </button>
                <p className="danger-note">
                  Note: This action cannot be undone. All conversation data will be permanently deleted.
                </p>
              </div>
            </div>
          )}
        </main>
      </div>

      <style jsx>{`
        /* Reset & Base */
        * {
          margin: 0;
          padding: 0;
          box-sizing: border-box;
        }
        
        .dashboard {
          min-height: 100vh;
          background: #0a0a0a;
          color: #e0e0e0;
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, sans-serif;
          line-height: 1.6;
        }
        
        /* Loading */
        .loading {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          height: 100vh;
          color: #666;
        }
        
        .loader {
          width: 40px;
          height: 40px;
          border: 3px solid #333;
          border-top-color: #666;
          border-radius: 50%;
          animation: spin 1s linear infinite;
          margin-bottom: 20px;
        }
        
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
        
        /* Navigation */
        .nav {
          background: #111;
          border-bottom: 1px solid #222;
          padding: 0 24px;
          height: 64px;
          display: flex;
          align-items: center;
          justify-content: space-between;
          position: sticky;
          top: 0;
          z-index: 100;
        }
        
        .nav-brand {
          display: flex;
          align-items: center;
        }
        
        .logo {
          display: flex;
          align-items: center;
          gap: 12px;
        }
        
        .logo-icon {
          width: 36px;
          height: 36px;
          background: linear-gradient(135deg, #5865F2, #9146FF);
          border-radius: 8px;
          display: flex;
          align-items: center;
          justify-content: center;
          font-weight: 600;
          font-size: 14px;
          color: white;
        }
        
        .logo-text h1 {
          font-size: 18px;
          font-weight: 600;
          color: #fff;
          margin: 0;
        }
        
        .brand-sub {
          font-size: 12px;
          color: #888;
          margin: 0;
        }
        
        .nav-stats {
          display: flex;
          gap: 24px;
          align-items: center;
        }
        
        .stat-item {
          display: flex;
          flex-direction: column;
          align-items: center;
        }
        
        .stat-label {
          font-size: 11px;
          text-transform: uppercase;
          color: #888;
          letter-spacing: 0.5px;
        }
        
        .stat-value {
          font-size: 16px;
          font-weight: 600;
          color: #fff;
        }
        
        .status-active {
          color: #2ecc71;
          display: flex;
          align-items: center;
          gap: 4px;
        }
        
        .status-active::before {
          content: '●';
          font-size: 12px;
        }
        
        .role-badge-small {
          padding: 2px 8px;
          border-radius: 12px;
          font-size: 12px;
          font-weight: 500;
          text-transform: uppercase;
          background: rgba(52, 152, 219, 0.1);
          color: #3498db;
          border: 1px solid rgba(52, 152, 219, 0.2);
        }
        
        .nav-actions {
          display: flex;
          gap: 12px;
          align-items: center;
        }
        
        /* Buttons */
        button {
          font-family: inherit;
          font-size: 14px;
          border: none;
          cursor: pointer;
          transition: all 0.2s;
          outline: none;
        }
        
        .btn-save {
          background: #5865F2;
          color: white;
          padding: 8px 20px;
          border-radius: 4px;
          font-weight: 500;
        }
        
        .btn-save:hover:not(:disabled) {
          background: #4752c4;
        }
        
        .btn-save:disabled {
          background: #333;
          color: #666;
          cursor: not-allowed;
          opacity: 0.6;
        }
        
        .btn-logout {
          background: transparent;
          color: #888;
          padding: 8px 16px;
          border: 1px solid #333;
          border-radius: 4px;
        }
        
        .btn-logout:hover {
          background: #222;
          color: #fff;
        }
        
        .btn-add {
          background: #333;
          color: #fff;
          padding: 10px 20px;
          border-radius: 4px;
          font-weight: 500;
        }
        
        .btn-add:hover:not(:disabled) {
          background: #444;
        }
        
        .btn-add:disabled {
          background: #222;
          color: #666;
          cursor: not-allowed;
        }
        
        .btn-remove {
          background: transparent;
          color: #ff6b6b;
          padding: 6px 12px;
          border: 1px solid #333;
          border-radius: 4px;
          font-size: 13px;
        }
        
        .btn-remove:hover {
          background: rgba(255, 107, 107, 0.1);
        }
        
        .btn-danger {
          background: transparent;
          color: #ff6b6b;
          padding: 12px 24px;
          border: 2px solid #ff6b6b;
          border-radius: 4px;
          font-weight: 500;
          font-size: 15px;
        }
        
        .btn-danger:hover:not(:disabled) {
          background: rgba(255, 107, 107, 0.1);
        }
        
        .btn-danger:disabled {
          opacity: 0.5;
          cursor: not-allowed;
          border-color: #666;
          color: #666;
        }
        
        /* Alert */
        .alert {
          padding: 12px 16px;
          margin: 0 24px;
          border-radius: 4px;
          display: flex;
          align-items: center;
          gap: 12px;
          font-size: 14px;
          animation: slideDown 0.3s ease;
        }
        
        @keyframes slideDown {
          from {
            opacity: 0;
            transform: translateY(-20px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        
        .alert.success {
          background: rgba(46, 204, 113, 0.1);
          color: #2ecc71;
          border: 1px solid rgba(46, 204, 113, 0.2);
        }
        
        .alert.error {
          background: rgba(231, 76, 60, 0.1);
          color: #e74c3c;
          border: 1px solid rgba(231, 76, 60, 0.2);
        }
        
        .alert-icon {
          font-weight: 600;
          font-size: 16px;
        }
        
        .alert-close {
          margin-left: auto;
          background: transparent;
          color: inherit;
          font-size: 20px;
          padding: 0;
          width: 24px;
          height: 24px;
          display: flex;
          align-items: center;
          justify-content: center;
          opacity: 0.7;
        }
        
        .alert-close:hover {
          opacity: 1;
        }
        
        /* Container */
        .container {
          display: flex;
          min-height: calc(100vh - 64px);
        }
        
        /* Menu */
        .menu {
          width: 240px;
          background: #111;
          border-right: 1px solid #222;
          padding: 24px 0;
          display: flex;
          flex-direction: column;
          justify-content: space-between;
          flex-shrink: 0;
        }
        
        .menu-section {
          margin-bottom: 32px;
        }
        
        .menu-title {
          font-size: 11px;
          text-transform: uppercase;
          color: #666;
          letter-spacing: 1px;
          margin: 0 24px 12px;
          font-weight: 500;
        }
        
        .menu-item {
          display: flex;
          align-items: center;
          gap: 12px;
          width: 100%;
          padding: 12px 24px;
          background: transparent;
          color: #888;
          text-align: left;
          font-size: 14px;
          border: none;
          transition: all 0.2s;
        }
        
        .menu-item:hover {
          background: #1a1a1a;
          color: #fff;
          cursor: pointer;
        }
        
        .menu-item.active {
          background: #1a1a1a;
          color: #fff;
          border-left: 3px solid #5865F2;
        }
        
        .menu-icon {
          font-size: 16px;
          width: 24px;
          text-align: center;
        }
        
        /* User Info Sidebar */
        .user-info-sidebar {
          padding: 16px 24px;
          border-top: 1px solid #222;
          display: flex;
          align-items: center;
          gap: 12px;
        }
        
        .user-avatar-sidebar {
          width: 40px;
          height: 40px;
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          font-weight: 600;
          font-size: 16px;
          color: #fff;
        }
        
        .user-details {
          flex: 1;
        }
        
        .user-name {
          font-size: 14px;
          font-weight: 500;
          color: #fff;
          margin-bottom: 2px;
        }
        
        .user-role {
          font-size: 11px;
          font-weight: 500;
          text-transform: uppercase;
          letter-spacing: 0.5px;
          padding: 2px 8px;
          border-radius: 10px;
          display: inline-block;
        }
        
        .role-admin {
          background: rgba(231, 76, 60, 0.1);
          color: #e74c3c;
          border: 1px solid rgba(231, 76, 60, 0.2);
        }
        
        .role-moderator {
          background: rgba(52, 152, 219, 0.1);
          color: #3498db;
          border: 1px solid rgba(52, 152, 219, 0.2);
        }
        
        .role-viewer {
          background: rgba(46, 204, 113, 0.1);
          color: #2ecc71;
          border: 1px solid rgba(46, 204, 113, 0.2);
        }
        
        /* Content */
        .content {
          flex: 1;
          padding: 32px;
          overflow-y: auto;
          min-width: 0; /* Prevent flex overflow */
        }
        
        .section {
          max-width: 800px;
          margin: 0 auto;
        }
        
        .section-header {
          margin-bottom: 32px;
        }
        
        .section-header h2 {
          font-size: 24px;
          font-weight: 600;
          color: #fff;
          margin-bottom: 8px;
        }
        
        .section-sub {
          color: #888;
          font-size: 14px;
        }
        
        .section-description {
          color: #888;
          font-size: 14px;
          margin-bottom: 24px;
        }
        
        /* Card */
        .card {
          background: #111;
          border: 1px solid #222;
          border-radius: 8px;
          padding: 24px;
          margin-bottom: 24px;
        }
        
        .card-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 16px;
        }
        
        .card-header h3 {
          font-size: 16px;
          font-weight: 500;
          color: #fff;
        }
        
        .char-count {
          font-size: 12px;
          color: #666;
        }
        
        .char-count-warning {
          color: #ff6b6b;
        }
        
        /* Save Button Container */
        .save-button-container {
          margin-top: 24px;
          padding-top: 20px;
          border-top: 1px solid #222;
        }
        
        /* Textarea */
        .textarea {
          width: 100%;
          background: #0a0a0a;
          border: 1px solid #222;
          border-radius: 4px;
          color: #e0e0e0;
          padding: 16px;
          font-family: 'Menlo', 'Monaco', 'Courier New', monospace;
          font-size: 14px;
          line-height: 1.6;
          resize: vertical;
          margin-bottom: 24px;
          transition: border-color 0.2s;
        }
        
        .textarea:focus {
          outline: none;
          border-color: #5865F2;
        }
        
        /* Presets */
        .presets {
          margin-top: 32px;
        }
        
        .presets h4 {
          font-size: 14px;
          font-weight: 500;
          color: #888;
          margin-bottom: 16px;
        }
        
        .preset-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
          gap: 16px;
        }
        
        .preset-card {
          background: #0a0a0a;
          border: 1px solid #222;
          border-radius: 4px;
          padding: 16px;
          cursor: pointer;
          transition: all 0.2s;
        }
        
        .preset-card:hover {
          border-color: #5865F2;
          background: #141414;
          transform: translateY(-2px);
        }
        
        .preset-card h5 {
          font-size: 14px;
          font-weight: 500;
          color: #fff;
          margin-bottom: 4px;
        }
        
        .preset-card p {
          font-size: 12px;
          color: #666;
          line-height: 1.4;
        }
        
        /* Inputs */
        .form-group {
          margin-bottom: 20px;
        }
        
        .form-label {
          display: block;
          font-size: 14px;
          font-weight: 500;
          color: #fff;
          margin-bottom: 8px;
        }
        
        .input-group {
          display: flex;
          gap: 12px;
          margin-bottom: 8px;
        }
        
        .input {
          flex: 1;
          background: #0a0a0a;
          border: 1px solid #222;
          border-radius: 4px;
          color: #e0e0e0;
          padding: 10px 12px;
          font-size: 14px;
          transition: border-color 0.2s;
        }
        
        .input:focus {
          outline: none;
          border-color: #5865F2;
        }
        
        .input-help {
          font-size: 12px;
          color: #666;
          margin-top: 8px;
          line-height: 1.4;
        }
        
        .input-help a {
          color: #5865F2;
          text-decoration: none;
        }
        
        .input-help a:hover {
          text-decoration: underline;
        }
        
        /* Divider */
        .divider {
          height: 1px;
          background: #222;
          margin: 24px 0;
        }
        
        /* Empty State */
        .empty-state {
          text-align: center;
          padding: 48px 24px;
        }
        
        .empty-icon {
          font-size: 48px;
          opacity: 0.3;
          margin-bottom: 16px;
        }
        
        .empty-state p {
          color: #888;
          margin-bottom: 8px;
        }
        
        .empty-sub {
          font-size: 13px;
          color: #666;
        }
        
        /* Channels List */
        .channels-list {
          display: flex;
          flex-direction: column;
          gap: 8px;
          margin-top: 16px;
        }
        
        .channel-item {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 12px;
          background: #0a0a0a;
          border: 1px solid #222;
          border-radius: 4px;
          transition: border-color 0.2s;
        }
        
        .channel-item:hover {
          border-color: #333;
        }
        
        .channel-info {
          display: flex;
          flex-direction: column;
          gap: 4px;
        }
        
        .channel-id {
          font-family: 'Menlo', 'Monaco', 'Courier New', monospace;
          font-size: 13px;
          color: #888;
          user-select: all;
        }
        
        .channel-status {
          font-size: 11px;
          color: #2ecc71;
          text-transform: uppercase;
          letter-spacing: 0.5px;
        }
        
        /* Commands List */
        .commands-list {
          display: flex;
          flex-direction: column;
          gap: 24px;
          margin-top: 20px;
        }
        
        .command-item {
          background: #0a0a0a;
          border: 1px solid #222;
          border-radius: 8px;
          padding: 20px;
          transition: all 0.2s;
        }
        
        .command-item:hover {
          border-color: #333;
          transform: translateY(-2px);
        }
        
        .command-header {
          display: flex;
          align-items: center;
          gap: 12px;
          margin-bottom: 12px;
        }
        
        .command-header code {
          background: #222;
          padding: 8px 16px;
          border-radius: 4px;
          font-family: 'Menlo', 'Monaco', 'Courier New', monospace;
          font-size: 15px;
          color: #e0e0e0;
          font-weight: 500;
        }
        
        .command-tag {
          padding: 4px 12px;
          border-radius: 12px;
          font-size: 11px;
          font-weight: 600;
          text-transform: uppercase;
          letter-spacing: 0.5px;
        }
        
        .command-tag.user {
          background: rgba(46, 204, 113, 0.1);
          color: #2ecc71;
          border: 1px solid rgba(46, 204, 113, 0.2);
        }
        
        .command-tag.admin {
          background: rgba(231, 76, 60, 0.1);
          color: #e74c3c;
          border: 1px solid rgba(231, 76, 60, 0.2);
        }
        
        .command-description {
          color: #888;
          font-size: 14px;
          line-height: 1.6;
          margin-bottom: 12px;
        }
        
        .command-examples {
          margin-top: 16px;
          padding: 16px;
          background: rgba(0, 0, 0, 0.2);
          border-radius: 6px;
          border: 1px solid #333;
        }
        
        .command-examples strong {
          display: block;
          margin-bottom: 8px;
          color: #e0e0e0;
          font-size: 13px;
        }
        
        .command-examples ul {
          list-style: none;
          padding-left: 0;
          margin: 0;
        }
        
        .command-examples li {
          margin-bottom: 6px;
          color: #888;
          font-size: 13px;
          display: flex;
          align-items: flex-start;
          gap: 8px;
        }
        
        .command-examples li:before {
          content: "›";
          color: #5865F2;
        }
        
        .command-examples code {
          background: #222;
          padding: 2px 6px;
          border-radius: 4px;
          font-family: 'Menlo', 'Monaco', 'Courier New', monospace;
          font-size: 12px;
          color: #e0e0e0;
        }
        
        /* Image Tips */
        .image-tips {
          margin-top: 24px;
          padding: 20px;
          background: rgba(88, 101, 242, 0.05);
          border-radius: 8px;
          border: 1px solid rgba(88, 101, 242, 0.1);
        }
        
        .image-tips h4 {
          font-size: 16px;
          font-weight: 600;
          color: #5865F2;
          margin-bottom: 16px;
          display: flex;
          align-items: center;
          gap: 8px;
        }
        
        .image-tips ul {
          list-style: none;
          padding-left: 0;
        }
        
        .image-tips li {
          margin-bottom: 8px;
          color: #e0e0e0;
          font-size: 14px;
          position: relative;
          padding-left: 20px;
        }
        
        .image-tips li:before {
          content: "✓";
          color: #5865F2;
          position: absolute;
          left: 0;
        }
        
        /* Examples Grid */
        .examples-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(250px, 1fr));
          gap: 20px;
          margin-top: 20px;
        }
        
        .example-card {
          background: #0a0a0a;
          border: 1px solid #222;
          border-radius: 8px;
          padding: 20px;
        }
        
        .example-card h4 {
          font-size: 14px;
          font-weight: 600;
          color: #fff;
          margin-bottom: 12px;
          border-bottom: 1px solid #222;
          padding-bottom: 8px;
        }
        
        .example-card ul {
          list-style: none;
          padding-left: 0;
        }
        
        .example-card li {
          margin-bottom: 8px;
          color: #e0e0e0;
          font-size: 13px;
          display: flex;
          align-items: flex-start;
          gap: 8px;
        }
        
        .example-card li:before {
          content: "•";
          color: #5865F2;
        }
        
        .example-card code {
          background: #222;
          padding: 2px 6px;
          border-radius: 4px;
          font-family: 'Menlo', 'Monaco', 'Courier New', monospace;
          font-size: 12px;
          color: #e0e0e0;
          margin-right: 8px;
        }
        
        /* Actions List */
        .actions-list {
          display: flex;
          flex-direction: column;
          gap: 16px;
          margin-top: 20px;
        }
        
        .action-item {
          display: flex;
          align-items: flex-start;
          gap: 16px;
          padding: 16px;
          background: #0a0a0a;
          border: 1px solid #222;
          border-radius: 8px;
          transition: all 0.2s;
        }
        
        .action-item:hover {
          border-color: #333;
          transform: translateY(-2px);
        }
        
        .action-icon {
          font-size: 24px;
          opacity: 0.7;
          flex-shrink: 0;
        }
        
        .action-content {
          flex: 1;
        }
        
        .action-content h4 {
          font-size: 16px;
          font-weight: 500;
          color: #fff;
          margin-bottom: 8px;
        }
        
        .action-content p {
          color: #888;
          font-size: 14px;
          line-height: 1.6;
        }
        
        /* Danger Zone */
        .danger-zone {
          margin-top: 0;
          padding-top: 0;
          border-top: none;
        }
        
        .danger-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 16px;
        }
        
        .danger-header h3 {
          color: #ff6b6b;
        }
        
        .danger-tag {
          background: rgba(255, 107, 107, 0.1);
          color: #ff6b6b;
          padding: 4px 8px;
          border-radius: 4px;
          font-size: 11px;
          font-weight: 600;
          text-transform: uppercase;
          letter-spacing: 0.5px;
        }
        
        .danger-desc {
          color: #888;
          margin-bottom: 20px;
          font-size: 14px;
        }
        
        .danger-note {
          font-size: 12px;
          color: #666;
          margin-top: 16px;
          line-height: 1.4;
        }
        
        /* Responsive */
        @media (max-width: 1024px) {
          .container {
            flex-direction: column;
          }
          
          .menu {
            width: 100%;
            border-right: none;
            border-bottom: 1px solid #222;
            padding: 16px 0;
          }
          
          .menu-section {
            display: flex;
            overflow-x: auto;
            gap: 8px;
            padding: 0 16px;
            margin-bottom: 0;
          }
          
          .menu-title {
            display: none;
          }
          
          .menu-item {
            white-space: nowrap;
            padding: 8px 16px;
            border-radius: 4px;
            border-left: none !important;
          }
          
          .menu-item.active {
            background: #1a1a1a;
          }
          
          .user-info-sidebar {
            display: none;
          }
        }
        
        @media (max-width: 768px) {
          .nav {
            flex-direction: column;
            height: auto;
            padding: 16px;
            gap: 16px;
          }
          
          .nav-stats {
            order: 3;
            width: 100%;
            justify-content: space-around;
          }
          
          .nav-actions {
            width: 100%;
            justify-content: flex-end;
          }
          
          .content {
            padding: 20px;
          }
          
          .preset-grid {
            grid-template-columns: 1fr;
          }
          
          .examples-grid {
            grid-template-columns: 1fr;
          }
          
          .command-item {
            flex-direction: column;
            align-items: flex-start;
            gap: 8px;
          }
          
          .input-group {
            flex-direction: column;
          }
          
          .btn-add, .btn-save {
            width: 100%;
          }
        }
      `}</style>
    </div>
  )
}