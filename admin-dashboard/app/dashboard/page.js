// app/dashboard/page.js - Dark Professional UI
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
  const [conversationStats, setConversationStats] = useState({ total: 0, recent: 0 })
  const [activeSection, setActiveSection] = useState('instructions')
  const router = useRouter()
  const saveTimeoutRef = useRef(null)

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const isAdmin = localStorage.getItem('isAdmin')
      if (!isAdmin) {
        router.push('/')
      }
    }
    loadSettings()
    loadStats()
  }, [])

  const loadSettings = async () => {
    try {
      const { data, error } = await supabase
        .from('admin_settings')
        .select('*')
        .limit(1)
        .single()
      
      if (error) throw error
      
      if (data) {
        setInstructions(data.system_instructions || 'You are a helpful assistant. Be concise and professional.')
        setChannelList(data.allowed_channels || [])
      }
    } catch (error) {
      console.log('No settings found, using defaults')
    }
    setIsLoading(false)
  }

  const loadStats = async () => {
    try {
      const { count: total } = await supabase
        .from('conversations')
        .select('*', { count: 'exact', head: true })
      
      const recentCount = await supabase
        .from('conversations')
        .select('id')
        .gte('created_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString())
        .then(({ count }) => count)
      
      setConversationStats({
        total: total || 0,
        recent: recentCount || 0
      })
    } catch (error) {
      console.error('Error loading stats:', error)
    }
  }

  const saveSettings = async () => {
    setIsSaving(true)
    setSaveStatus(null)
    
    try {
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
        message: 'Error saving settings. Please try again.'
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
      loadStats()
    } catch (error) {
      alert('Error resetting memory: ' + error.message)
    }
  }

  const logout = () => {
    localStorage.removeItem('isAdmin')
    router.push('/')
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
            <span className="stat-label">Today</span>
            <span className="stat-value">{conversationStats.recent}</span>
          </div>
          <div className="stat-item">
            <span className="stat-label">Total</span>
            <span className="stat-value">{conversationStats.total}</span>
          </div>
        </div>
        
        <div className="nav-actions">
          <button 
            onClick={saveSettings} 
            disabled={isSaving}
            className="btn-save"
          >
            {isSaving ? 'Saving...' : 'Save Changes'}
          </button>
          <button onClick={logout} className="btn-logout">
            Logout
          </button>
        </div>
      </nav>

      {/* Status Alert */}
      {saveStatus && (
        <div className={`alert ${saveStatus.type}`}>
          <span className="alert-icon">{saveStatus.type === 'success' ? '✓' : '!'}</span>
          <span>{saveStatus.message}</span>
          <button onClick={() => setSaveStatus(null)} className="alert-close">×</button>
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
            >
              <span className="menu-icon">📝</span>
              Instructions
            </button>
            <button 
              className={`menu-item ${activeSection === 'channels' ? 'active' : ''}`}
              onClick={() => setActiveSection('channels')}
            >
              <span className="menu-icon">#️⃣</span>
              Channels
            </button>
            <button 
              className={`menu-item ${activeSection === 'memory' ? 'active' : ''}`}
              onClick={() => setActiveSection('memory')}
            >
              <span className="menu-icon">🧠</span>
              Memory
            </button>
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
                  <div className="char-count">{instructions.length}/4000 chars</div>
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
                    >
                      <h5>Technical Assistant</h5>
                      <p>Accurate, concise, technical</p>
                    </div>
                    <div 
                      className="preset-card"
                      onClick={() => setInstructions('You are a helpful team assistant. Be friendly and encouraging. Help with brainstorming and creative problem solving. Use a casual but professional tone.')}
                    >
                      <h5>Team Helper</h5>
                      <p>Friendly, encouraging, creative</p>
                    </div>
                    <div 
                      className="preset-card"
                      onClick={() => setInstructions('You are a strict documentation assistant. Provide only factual information from known sources. Be concise. No speculation. Use bullet points when appropriate.')}
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
                  />
                  <button 
                    onClick={() => {
                      if (newChannel.trim()) {
                        setChannelList([...channelList, newChannel.trim()])
                        setNewChannel('')
                      }
                    }}
                    className="btn-add"
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

          {/* Memory Section */}
          {activeSection === 'memory' && (
            <div className="section">
              <div className="section-header">
                <h2>Memory Management</h2>
                <p className="section-sub">Control conversation history and data</p>
              </div>
              
              <div className="stats-grid">
                <div className="stat-card">
                  <div className="stat-icon">📊</div>
                  <div className="stat-content">
                    <div className="stat-number">{conversationStats.total}</div>
                    <div className="stat-label">Total Conversations</div>
                  </div>
                </div>
                
                <div className="stat-card">
                  <div className="stat-icon">🔄</div>
                  <div className="stat-content">
                    <div className="stat-number">{conversationStats.recent}</div>
                    <div className="stat-label">Today's Activity</div>
                  </div>
                </div>
                
                <div className="stat-card">
                  <div className="stat-icon">#️⃣</div>
                  <div className="stat-content">
                    <div className="stat-number">{channelList.length}</div>
                    <div className="stat-label">Active Channels</div>
                  </div>
                </div>
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
        
        .nav-actions {
          display: flex;
          gap: 12px;
        }
        
        /* Buttons */
        button {
          font-family: inherit;
          font-size: 14px;
          border: none;
          cursor: pointer;
          transition: all 0.2s;
        }
        
        .btn-save {
          background: #5865F2;
          color: white;
          padding: 8px 20px;
          border-radius: 4px;
          font-weight: 500;
        }
        
        .btn-save:hover {
          background: #4752c4;
        }
        
        .btn-save:disabled {
          background: #333;
          color: #666;
          cursor: not-allowed;
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
        
        .btn-add:hover {
          background: #444;
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
        
        .btn-danger:hover {
          background: rgba(255, 107, 107, 0.1);
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
        }
        
        .menu-item:hover {
          background: #1a1a1a;
          color: #fff;
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
        
        /* Content */
        .content {
          flex: 1;
          padding: 32px;
          overflow-y: auto;
        }
        
        .section {
          max-width: 800px;
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
        }
        
        .textarea:focus {
          outline: none;
          border-color: #444;
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
          border-color: #444;
          background: #141414;
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
        }
        
        .input:focus {
          outline: none;
          border-color: #444;
        }
        
        .input-help {
          font-size: 12px;
          color: #666;
          margin-top: 8px;
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
        }
        
        .channel-item {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 12px;
          background: #0a0a0a;
          border: 1px solid #222;
          border-radius: 4px;
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
        }
        
        .channel-status {
          font-size: 11px;
          color: #2ecc71;
          text-transform: uppercase;
          letter-spacing: 0.5px;
        }
        
        /* Stats Grid */
        .stats-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(180px, 1fr));
          gap: 16px;
          margin-bottom: 32px;
        }
        
        .stat-card {
          background: #111;
          border: 1px solid #222;
          border-radius: 8px;
          padding: 20px;
          display: flex;
          align-items: center;
          gap: 16px;
        }
        
        .stat-icon {
          font-size: 24px;
          opacity: 0.7;
        }
        
        .stat-number {
          font-size: 24px;
          font-weight: 600;
          color: #fff;
        }
        
        .stat-label {
          font-size: 12px;
          color: #666;
          text-transform: uppercase;
          letter-spacing: 0.5px;
        }
        
        /* Danger Zone */
        .danger-zone {
          border-color: #444;
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
          }
          
          .menu-title {
            display: none;
          }
          
          .menu-item {
            white-space: nowrap;
            padding: 8px 16px;
            border-radius: 4px;
          }
          
          .menu-item.active {
            border-left: none;
            background: #1a1a1a;
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
          
          .stats-grid {
            grid-template-columns: 1fr;
          }
        }
      `}</style>
    </div>
  )
}