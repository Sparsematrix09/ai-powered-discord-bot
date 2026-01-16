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
  const [memoryStats, setMemoryStats] = useState(null)
  const [selectedUser, setSelectedUser] = useState('')
  const [selectedChannel, setSelectedChannel] = useState('')
  const [memoryLoading, setMemoryLoading] = useState(false)
  const [conversations, setConversations] = useState([])
  const [filteredConversations, setFilteredConversations] = useState([])
  const [conversationLoading, setConversationLoading] = useState(false)
  const [selectedConversation, setSelectedConversation] = useState(null)
  const [searchTerm, setSearchTerm] = useState('')
  const [dateFilter, setDateFilter] = useState('all')
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [uniqueUsers, setUniqueUsers] = useState([])
  const [uniqueChannels, setUniqueChannels] = useState([])
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [conversationToDelete, setConversationToDelete] = useState(null)
  const router = useRouter()
  const saveTimeoutRef = useRef(null)
  const ITEMS_PER_PAGE = 10

  useEffect(() => {
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
      router.push('/')
      return
    }
    
    loadSettings()
    loadMemoryStats()
    loadConversations()
    loadUniqueFilters()
  }, [router, page])

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
      // Default settings will be used
    }
    setIsLoading(false)
  }

  const loadMemoryStats = async () => {
    setMemoryLoading(true)
    try {
      const { data: conversations, error: convError } = await supabase
        .from('conversations')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(100)
      
      if (convError) throw convError
      
      const { data: usersData } = await supabase
        .from('conversations')
        .select('user_id')
      
      const { data: channelsData } = await supabase
        .from('conversations')
        .select('channel_id')
      
      const formattedConversations = conversations?.map(conv => ({
        id: conv.id,
        user_id: conv.user_id,
        channel_id: conv.channel_id,
        user_message: conv.user_message,
        bot_response: conv.ai_response,
        created_at: conv.created_at
      })) || []
      
      const stats = {
        totalConversations: formattedConversations.length || 0,
        uniqueUsers: new Set(usersData?.map(c => c.user_id)).size,
        uniqueChannels: new Set(channelsData?.map(c => c.channel_id)).size,
        newestConversation: formattedConversations?.[0]?.created_at,
        recentConversations: formattedConversations?.slice(0, 5) || []
      }
      
      setMemoryStats(stats)
    } catch (error) {
      setMemoryStats({
        totalConversations: 0,
        uniqueUsers: 0,
        uniqueChannels: 0,
        newestConversation: null,
        recentConversations: []
      })
    } finally {
      setMemoryLoading(false)
    }
  }

  const loadConversations = async () => {
    setConversationLoading(true)
    try {
      const from = (page - 1) * ITEMS_PER_PAGE
      const to = from + ITEMS_PER_PAGE - 1
      
      let query = supabase
        .from('conversations')
        .select('*', { count: 'exact' })
        .order('created_at', { ascending: false })
        .range(from, to)

      // Apply filters
      if (selectedUser) {
        query = query.eq('user_id', selectedUser)
      }
      if (selectedChannel) {
        query = query.eq('channel_id', selectedChannel)
      }
      if (searchTerm) {
        query = query.or(`user_message.ilike.%${searchTerm}%,ai_response.ilike.%${searchTerm}%`)
      }
      if (dateFilter !== 'all') {
        const now = new Date()
        let startDate = new Date()
        
        switch (dateFilter) {
          case 'today':
            startDate.setHours(0, 0, 0, 0)
            break
          case 'week':
            startDate.setDate(now.getDate() - 7)
            break
          case 'month':
            startDate.setMonth(now.getMonth() - 1)
            break
        }
        
        query = query.gte('created_at', startDate.toISOString())
      }

      const { data, error, count } = await query
      
      if (error) throw error
      
      const formattedData = data?.map(conv => ({
        id: conv.id,
        user_id: conv.user_id,
        channel_id: conv.channel_id,
        user_message: conv.user_message,
        bot_response: conv.ai_response,
        created_at: conv.created_at
      })) || []
      
      setConversations(formattedData)
      setFilteredConversations(formattedData)
      setTotalPages(Math.ceil((count || 0) / ITEMS_PER_PAGE))
    } catch (error) {
      console.error('Error loading conversations:', error)
      setConversations([])
      setFilteredConversations([])
    } finally {
      setConversationLoading(false)
    }
  }

  const loadUniqueFilters = async () => {
    try {
      const { data: users } = await supabase
        .from('conversations')
        .select('user_id')
        .order('user_id')
      
      const { data: channels } = await supabase
        .from('conversations')
        .select('channel_id')
        .order('channel_id')
      
      setUniqueUsers([...new Set(users?.map(u => u.user_id) || [])])
      setUniqueChannels([...new Set(channels?.map(c => c.channel_id) || [])])
    } catch (error) {
      console.error('Error loading filters:', error)
    }
  }

  const saveSettings = async () => {
    if (isSaving) return
    
    setIsSaving(true)
    setSaveStatus(null)
    
    try {
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
        message: 'Settings saved successfully.'
      })
      
      if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current)
      saveTimeoutRef.current = setTimeout(() => {
        setSaveStatus(null)
      }, 3000)
      
    } catch (error) {
      setSaveStatus({
        type: 'error',
        message: error.message || 'Error saving settings'
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
      loadMemoryStats()
      loadConversations()
      loadUniqueFilters()
    } catch (error) {
      alert('Error resetting memory')
    }
  }

  const clearUserMemory = async () => {
    if (!selectedUser) {
      alert('Please select a user first')
      return
    }
    
    if (!window.confirm(`Clear all conversation memory for user ${selectedUser}?`)) {
      return
    }
    
    try {
      const { error } = await supabase
        .from('conversations')
        .delete()
        .eq('user_id', selectedUser)
      
      if (error) throw error
      
      alert(`Conversation history cleared for user ${selectedUser}`)
      loadMemoryStats()
      loadConversations()
      loadUniqueFilters()
      setSelectedUser('')
    } catch (error) {
      alert('Error clearing user memory')
    }
  }

  const clearChannelMemory = async () => {
    if (!selectedChannel) {
      alert('Please select a channel first')
      return
    }
    
    if (!window.confirm(`Clear all conversation memory for channel ${selectedChannel}?`)) {
      return
    }
    
    try {
      const { error } = await supabase
        .from('conversations')
        .delete()
        .eq('channel_id', selectedChannel)
      
      if (error) throw error
      
      alert(`Conversation history cleared for channel ${selectedChannel}`)
      loadMemoryStats()
      loadConversations()
      loadUniqueFilters()
      setSelectedChannel('')
    } catch (error) {
      alert('Error clearing channel memory')
    }
  }

  const deleteSingleConversation = async () => {
    if (!conversationToDelete) return
    
    try {
      const { error } = await supabase
        .from('conversations')
        .delete()
        .eq('id', conversationToDelete.id)
      
      if (error) throw error
      
      // Remove from local state
      setConversations(conversations.filter(c => c.id !== conversationToDelete.id))
      setFilteredConversations(filteredConversations.filter(c => c.id !== conversationToDelete.id))
      setSelectedConversation(null)
      setShowDeleteConfirm(false)
      setConversationToDelete(null)
      
      // Reload stats
      loadMemoryStats()
      
      setSaveStatus({
        type: 'success',
        message: 'Conversation deleted successfully.'
      })
      
      setTimeout(() => setSaveStatus(null), 3000)
    } catch (error) {
      setSaveStatus({
        type: 'error',
        message: 'Error deleting conversation'
      })
    }
  }

  const viewConversation = (conversation) => {
    setSelectedConversation(conversation)
  }

  const handleFilter = () => {
    setPage(1) // Reset to first page when filters change
    loadConversations()
  }

  const clearFilters = () => {
    setSelectedUser('')
    setSelectedChannel('')
    setSearchTerm('')
    setDateFilter('all')
    setPage(1)
    loadConversations()
  }

  const exportConversations = () => {
    const data = JSON.stringify(conversations, null, 2)
    const blob = new Blob([data], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `conversations_${new Date().toISOString().split('T')[0]}.json`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }

  // Add missing logout function
  const logout = () => {
    localStorage.removeItem('isAuthenticated')
    localStorage.removeItem('user')
    router.push('/')
  }

  // Add missing addChannel function
  const addChannel = () => {
    const channel = newChannel.trim()
    if (!channel) return
    
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

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A'
    const date = new Date(dateString)
    return date.toLocaleDateString() + ' ' + date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
  }

  const truncateText = (text, length = 100) => {
    if (!text) return ''
    return text.length > length ? text.substring(0, length) + '...' : text
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-950 flex flex-col items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-indigo-500 mb-4"></div>
        <p className="text-gray-400">Loading dashboard...</p>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-950 text-gray-100">
      {/* Top Navigation */}
      <header className="sticky top-0 z-50 bg-gray-900 border-b border-gray-800">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            {/* Logo with Image */}
            <div className="flex items-center space-x-3">
              <div className="flex items-center justify-center w-10 h-10 bg-transparent rounded-lg overflow-hidden">
                <img 
                  src="/logo.png" 
                  alt="Discord Copilot Logo"
                  className="w-full h-full object-contain"
                  onError={(e) => {
                    e.target.style.display = 'none'
                    e.target.parentElement.innerHTML = `
                      <div class="w-full h-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center">
                        <span class="font-bold text-white">DC</span>
                      </div>
                    `
                  }}
                />
              </div>
              <div>
                <h1 className="text-xl font-bold">Discord Copilot</h1>
                <p className="text-sm text-gray-400">Admin Console</p>
              </div>
            </div>

            {/* Stats */}
            <div className="flex items-center space-x-4 md:space-x-6">
              <div className="text-center">
                <p className="text-xs text-gray-400 uppercase">Channels</p>
                <p className="text-lg font-semibold">{channelList.length}</p>
              </div>
              <div className="text-center">
                <p className="text-xs text-gray-400 uppercase">Status</p>
                <div className="flex items-center space-x-1">
                  <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                  <span className="text-green-400 text-sm">Active</span>
                </div>
              </div>
              <div className="text-center">
                <p className="text-xs text-gray-400 uppercase">Role</p>
                <span className="text-sm text-indigo-400">{currentUser?.role || 'admin'}</span>
              </div>
            </div>

            {/* Actions */}
            <div className="flex items-center space-x-3">
              <button
                onClick={saveSettings}
                disabled={isSaving}
                className="px-4 py-2 bg-indigo-600 text-white font-medium rounded-lg hover:bg-indigo-700 transition disabled:opacity-50"
              >
                {isSaving ? 'Saving...' : 'Save'}
              </button>
              <button
                onClick={logout}
                className="px-4 py-2 border border-gray-700 text-gray-300 font-medium rounded-lg hover:bg-gray-800 transition"
              >
                Logout
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Status Toast */}
      {saveStatus && (
        <div className={`fixed top-20 right-4 z-50 px-4 py-3 rounded-lg border shadow-lg ${saveStatus.type === 'success' ? 'bg-green-500/10 border-green-500/20 text-green-400' : 'bg-red-500/10 border-red-500/20 text-red-400'}`}>
          <div className="flex items-center space-x-2">
            <span>{saveStatus.type === 'success' ? '✓' : '⚠'}</span>
            <span className="text-sm">{saveStatus.message}</span>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-gray-900 border border-gray-800 rounded-lg p-6 max-w-md w-full">
            <h3 className="text-lg font-semibold text-red-400 mb-2">Delete Conversation</h3>
            <p className="text-gray-300 mb-4">
              Are you sure you want to delete this conversation? This action cannot be undone.
            </p>
            <div className="flex space-x-3">
              <button
                onClick={deleteSingleConversation}
                className="flex-1 py-2 bg-red-600 text-white rounded font-medium hover:bg-red-700 transition"
              >
                Delete
              </button>
              <button
                onClick={() => setShowDeleteConfirm(false)}
                className="flex-1 py-2 border border-gray-700 text-gray-300 rounded font-medium hover:bg-gray-800 transition"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="flex flex-col lg:flex-row gap-8">
          {/* Sidebar Navigation */}
          <aside className="lg:w-64">
            <div className="bg-gray-900 border border-gray-800 rounded-lg p-4">
              <h3 className="text-sm font-medium text-gray-400 mb-3">Configuration</h3>
              <div className="space-y-1">
                <button
                  onClick={() => setActiveSection('instructions')}
                  className={`w-full text-left px-3 py-2 rounded text-sm ${activeSection === 'instructions' ? 'bg-indigo-500/10 text-indigo-400' : 'text-gray-400 hover:bg-gray-800 hover:text-gray-300'}`}
                >
                  Instructions
                </button>
                <button
                  onClick={() => setActiveSection('channels')}
                  className={`w-full text-left px-3 py-2 rounded text-sm ${activeSection === 'channels' ? 'bg-indigo-500/10 text-indigo-400' : 'text-gray-400 hover:bg-gray-800 hover:text-gray-300'}`}
                >
                  Channels
                </button>
                <button
                  onClick={() => setActiveSection('commands')}
                  className={`w-full text-left px-3 py-2 rounded text-sm ${activeSection === 'commands' ? 'bg-indigo-500/10 text-indigo-400' : 'text-gray-400 hover:bg-gray-800 hover:text-gray-300'}`}
                >
                  Commands
                </button>
                <button
                  onClick={() => setActiveSection('memory')}
                  className={`w-full text-left px-3 py-2 rounded text-sm ${activeSection === 'memory' ? 'bg-indigo-500/10 text-indigo-400' : 'text-gray-400 hover:bg-gray-800 hover:text-gray-300'}`}
                >
                  Memory
                </button>
              </div>
            </div>

            {/* User Info */}
            <div className="mt-4 p-4 bg-gray-900 border border-gray-800 rounded-lg">
              <div className="flex items-center space-x-3">
                <div className="w-8 h-8 bg-gradient-to-br from-purple-500 to-pink-500 rounded-full flex items-center justify-center font-bold text-white text-sm">
                  {currentUser?.username?.charAt(0)?.toUpperCase() || 'A'}
                </div>
                <div>
                  <p className="font-medium text-sm">{currentUser?.username || 'Admin'}</p>
                  <p className="text-xs text-gray-400">{currentUser?.role || 'admin'}</p>
                </div>
              </div>
            </div>
          </aside>

          {/* Main Content */}
          <main className="flex-1">
            {/* Instructions Section */}
            {activeSection === 'instructions' && (
              <div className="space-y-6">
                <div>
                  <h2 className="text-2xl font-bold">Bot Instructions</h2>
                  <p className="text-gray-400">Define how your bot should behave and respond</p>
                </div>

                <div className="bg-gray-900 border border-gray-800 rounded-lg p-6">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-semibold">System Prompt</h3>
                    <span className={`text-sm ${instructions.length > 4000 ? 'text-red-400' : 'text-gray-400'}`}>
                      {instructions.length}/4000
                    </span>
                  </div>
                  <textarea
                    value={instructions}
                    onChange={(e) => setInstructions(e.target.value)}
                    placeholder="Example: You are a helpful assistant for our development team. Be concise, technical, and professional."
                    className="w-full h-48 bg-gray-950 border border-gray-800 rounded-lg p-4 text-gray-200 font-mono text-sm focus:outline-none focus:border-indigo-500 resize-none"
                    maxLength={4000}
                  />
                  
                  <div className="mt-6">
                    <h4 className="text-gray-400 mb-3">Quick Presets</h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      <button
                        onClick={() => setInstructions('You are a professional assistant for a tech team. Provide accurate, concise answers. Focus on technical accuracy.')}
                        className="text-left p-3 bg-gray-950 border border-gray-800 rounded-lg hover:border-gray-700 transition"
                      >
                        <h5 className="font-medium text-gray-100 mb-1">Technical Assistant</h5>
                        <p className="text-xs text-gray-400">Accurate, concise, technical</p>
                      </button>
                      <button
                        onClick={() => setInstructions('You are a helpful team assistant. Be friendly and encouraging. Help with brainstorming and problem solving.')}
                        className="text-left p-3 bg-gray-950 border border-gray-800 rounded-lg hover:border-gray-700 transition"
                      >
                        <h5 className="font-medium text-gray-100 mb-1">Team Helper</h5>
                        <p className="text-xs text-gray-400">Friendly, encouraging, creative</p>
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Channels Section */}
            {activeSection === 'channels' && (
              <div className="space-y-6">
                <div>
                  <h2 className="text-2xl font-bold">Channel Access</h2>
                  <p className="text-gray-400">Control which Discord channels the bot can respond in</p>
                </div>

                <div className="bg-gray-900 border border-gray-800 rounded-lg p-6">
                  <h3 className="text-lg font-semibold mb-4">Add New Channel</h3>
                  <div className="flex gap-3 mb-3">
                    <input
                      type="text"
                      value={newChannel}
                      onChange={(e) => setNewChannel(e.target.value)}
                      placeholder="Enter Discord Channel ID"
                      className="flex-1 bg-gray-950 border border-gray-800 rounded-lg px-4 py-3 text-gray-200 focus:outline-none focus:border-indigo-500"
                    />
                    <button
                      onClick={addChannel}
                      disabled={!newChannel.trim()}
                      className="px-4 py-3 bg-gray-800 text-gray-200 font-medium rounded-lg hover:bg-gray-700 transition disabled:opacity-50"
                    >
                      Add
                    </button>
                  </div>
                  <p className="text-sm text-gray-500">Right-click a Discord channel → "Copy ID" (Developer mode required)</p>

                  <div className="my-6 border-t border-gray-800"></div>

                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-semibold">Allowed Channels</h3>
                    <span className="px-3 py-1 bg-gray-800 text-gray-400 text-sm rounded-full">{channelList.length} channels</span>
                  </div>

                  {channelList.length === 0 ? (
                    <div className="text-center py-8">
                      <p className="text-gray-400">No channels added yet</p>
                      <p className="text-sm text-gray-500 mt-1">Add channel IDs to restrict bot access</p>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {channelList.map((channel, index) => (
                        <div key={index} className="flex items-center justify-between p-4 bg-gray-950 border border-gray-800 rounded-lg">
                          <div className="space-y-1">
                            <code className="text-gray-200 font-mono text-sm block">{channel}</code>
                            <div className="flex items-center space-x-2">
                              <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                              <span className="text-xs text-green-400">Active</span>
                            </div>
                          </div>
                          <button
                            onClick={() => removeChannel(index)}
                            className="px-3 py-1.5 text-red-400 hover:bg-red-500/10 transition rounded text-sm"
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

            {/* Commands Section */}
            {activeSection === 'commands' && (
              <div className="space-y-6">
                <div>
                  <h2 className="text-2xl font-bold">Bot Commands</h2>
                  <p className="text-gray-400">Available commands for your Discord bot</p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Basic Commands */}
                  <div className="bg-gray-900 border border-gray-800 rounded-lg p-6">
                    <h3 className="text-lg font-semibold mb-4">Basic Commands</h3>
                    <div className="space-y-4">
                      {[
                        { command: '!help', description: 'Show available commands and bot information' },
                        { command: '!ping', description: 'Check if the bot is online and responsive' },
                        { command: '!ask [question]', description: 'Ask the AI a question' },
                        { command: '!clear', description: 'Clear conversation history for current channel' },
                      ].map((cmd, idx) => (
                        <div key={idx} className="p-3 bg-gray-950 border border-gray-800 rounded">
                          <div className="flex items-center justify-between mb-1">
                            <code className="text-gray-200 font-mono text-sm">{cmd.command}</code>
                            <span className="text-xs px-2 py-0.5 bg-green-500/10 text-green-400 rounded">User</span>
                          </div>
                          <p className="text-sm text-gray-400">{cmd.description}</p>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Image Commands */}
                  <div className="bg-gray-900 border border-gray-800 rounded-lg p-6">
                    <h3 className="text-lg font-semibold mb-4">Image Commands</h3>
                    <div className="space-y-4">
                      {[
                        { command: '!image [prompt]', description: 'Generate image from text description' },
                        { command: '!gen [prompt]', description: 'Alias for !image command' },
                        { command: '!imagine [prompt]', description: 'Another alias for !image' },
                      ].map((cmd, idx) => (
                        <div key={idx} className="p-3 bg-gray-950 border border-gray-800 rounded">
                          <div className="flex items-center justify-between mb-1">
                            <code className="text-gray-200 font-mono text-sm">{cmd.command}</code>
                            <span className="text-xs px-2 py-0.5 bg-green-500/10 text-green-400 rounded">User</span>
                          </div>
                          <p className="text-sm text-gray-400">{cmd.description}</p>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Admin Commands */}
                  <div className="md:col-span-2 bg-gray-900 border border-gray-800 rounded-lg p-6">
                    <h3 className="text-lg font-semibold mb-4">Admin Commands</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {[
                        { command: '!admin stats', description: 'Show bot statistics and usage data' },
                        { command: '!admin help', description: 'Show admin-only commands' },
                        { command: '!admin restart', description: 'Restart the bot (soft restart)' },
                        { command: '!admin channels', description: 'List all channels where bot is active' },
                      ].map((cmd, idx) => (
                        <div key={idx} className="p-3 bg-gray-950 border border-gray-800 rounded">
                          <div className="flex items-center justify-between mb-1">
                            <code className="text-gray-200 font-mono text-sm">{cmd.command}</code>
                            <span className="text-xs px-2 py-0.5 bg-red-500/10 text-red-400 rounded">Admin</span>
                          </div>
                          <p className="text-sm text-gray-400">{cmd.description}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Memory Section */}
            {activeSection === 'memory' && (
              <div className="space-y-6">
                <div>
                  <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div>
                      <h2 className="text-2xl font-bold">Memory Management</h2>
                      <p className="text-gray-400">Monitor and control conversation history</p>
                    </div>
                    <div className="flex items-center space-x-3">
                      <button
                        onClick={exportConversations}
                        className="px-4 py-2 border border-gray-700 text-gray-300 text-sm rounded-lg hover:bg-gray-800 transition"
                      >
                        Export JSON
                      </button>
                      <button
                        onClick={loadConversations}
                        disabled={conversationLoading}
                        className="px-4 py-2 bg-gray-800 text-gray-200 text-sm rounded-lg hover:bg-gray-700 transition disabled:opacity-50"
                      >
                        {conversationLoading ? 'Loading...' : 'Refresh'}
                      </button>
                    </div>
                  </div>
                </div>

                {/* Stats Grid */}
                <div className="bg-gray-900 border border-gray-800 rounded-lg p-6">
                  <div className="flex items-center justify-between mb-6">
                    <h3 className="text-lg font-semibold">Memory Statistics</h3>
                    <div className="text-sm text-gray-400">
                      Page {page} of {totalPages}
                    </div>
                  </div>

                  {memoryStats ? (
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                      <div className="p-4 bg-gray-950 border border-gray-800 rounded">
                        <p className="text-2xl font-bold">{memoryStats.totalConversations}</p>
                        <p className="text-sm text-gray-400">Total Conversations</p>
                      </div>
                      <div className="p-4 bg-gray-950 border border-gray-800 rounded">
                        <p className="text-2xl font-bold">{memoryStats.uniqueUsers}</p>
                        <p className="text-sm text-gray-400">Unique Users</p>
                      </div>
                      <div className="p-4 bg-gray-950 border border-gray-800 rounded">
                        <p className="text-2xl font-bold">{memoryStats.uniqueChannels}</p>
                        <p className="text-sm text-gray-400">Active Channels</p>
                      </div>
                      <div className="p-4 bg-gray-950 border border-gray-800 rounded">
                        <p className="text-lg font-semibold">{memoryStats.newestConversation ? formatDate(memoryStats.newestConversation) : 'N/A'}</p>
                        <p className="text-sm text-gray-400">Last Activity</p>
                      </div>
                    </div>
                  ) : (
                    <div className="text-center py-6">
                      <p className="text-gray-400">No conversation data available</p>
                    </div>
                  )}

                  {/* Filters */}
                  <div className="mb-6 p-4 bg-gray-950 border border-gray-800 rounded-lg">
                    <h4 className="text-gray-400 mb-3">Filter Conversations</h4>
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
                      <div>
                        <label className="block text-xs text-gray-500 mb-1">User ID</label>
                        <select
                          value={selectedUser}
                          onChange={(e) => setSelectedUser(e.target.value)}
                          className="w-full bg-gray-900 border border-gray-800 rounded px-3 py-2 text-sm text-gray-200 focus:outline-none focus:border-indigo-500"
                        >
                          <option value="">All Users</option>
                          {uniqueUsers.map(userId => (
                            <option key={userId} value={userId}>{userId}</option>
                          ))}
                        </select>
                      </div>
                      <div>
                        <label className="block text-xs text-gray-500 mb-1">Channel ID</label>
                        <select
                          value={selectedChannel}
                          onChange={(e) => setSelectedChannel(e.target.value)}
                          className="w-full bg-gray-900 border border-gray-800 rounded px-3 py-2 text-sm text-gray-200 focus:outline-none focus:border-indigo-500"
                        >
                          <option value="">All Channels</option>
                          {uniqueChannels.map(channelId => (
                            <option key={channelId} value={channelId}>{channelId}</option>
                          ))}
                        </select>
                      </div>
                      <div>
                        <label className="block text-xs text-gray-500 mb-1">Time Range</label>
                        <select
                          value={dateFilter}
                          onChange={(e) => setDateFilter(e.target.value)}
                          className="w-full bg-gray-900 border border-gray-800 rounded px-3 py-2 text-sm text-gray-200 focus:outline-none focus:border-indigo-500"
                        >
                          <option value="all">All Time</option>
                          <option value="today">Today</option>
                          <option value="week">Last 7 Days</option>
                          <option value="month">Last 30 Days</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-xs text-gray-500 mb-1">Search Text</label>
                        <input
                          type="text"
                          value={searchTerm}
                          onChange={(e) => setSearchTerm(e.target.value)}
                          placeholder="Search messages..."
                          className="w-full bg-gray-900 border border-gray-800 rounded px-3 py-2 text-sm text-gray-200 focus:outline-none focus:border-indigo-500"
                        />
                      </div>
                    </div>
                    <div className="flex justify-between mt-4">
                      <button
                        onClick={clearFilters}
                        className="px-4 py-2 text-sm text-gray-400 hover:text-gray-300 transition"
                      >
                        Clear Filters
                      </button>
                      <button
                        onClick={handleFilter}
                        disabled={conversationLoading}
                        className="px-4 py-2 bg-indigo-600 text-white text-sm rounded hover:bg-indigo-700 transition disabled:opacity-50"
                      >
                        Apply Filters
                      </button>
                    </div>
                  </div>

                  {/* Conversations List */}
                  <div className="space-y-3">
                    {conversationLoading ? (
                      <div className="text-center py-8">
                        <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-indigo-500 mx-auto mb-4"></div>
                        <p className="text-gray-400">Loading conversations...</p>
                      </div>
                    ) : conversations.length === 0 ? (
                      <div className="text-center py-8">
                        <p className="text-gray-400">No conversations found</p>
                        <p className="text-sm text-gray-500 mt-1">Try adjusting your filters</p>
                      </div>
                    ) : (
                      conversations.map(conv => (
                        <div
                          key={conv.id}
                          className="p-4 bg-gray-950 border border-gray-800 rounded-lg hover:border-gray-700 transition cursor-pointer"
                          onClick={() => viewConversation(conv)}
                        >
                          <div className="flex justify-between items-start mb-2">
                            <div className="space-y-1">
                              <div className="flex items-center space-x-2">
                                <span className="text-sm text-gray-300">User:</span>
                                <code className="text-xs bg-gray-800 px-2 py-1 rounded">{conv.user_id}</code>
                              </div>
                              <div className="flex items-center space-x-2">
                                <span className="text-sm text-gray-300">Channel:</span>
                                <code className="text-xs bg-gray-800 px-2 py-1 rounded">{conv.channel_id}</code>
                              </div>
                            </div>
                            <div className="text-xs text-gray-500">{formatDate(conv.created_at)}</div>
                          </div>
                          <div className="mt-3 space-y-2">
                            <div>
                              <span className="text-xs text-gray-500">User:</span>
                              <p className="text-sm text-gray-300 mt-1">{truncateText(conv.user_message, 150)}</p>
                            </div>
                            <div>
                              <span className="text-xs text-gray-500">Bot:</span>
                              <p className="text-sm text-gray-300 mt-1">{truncateText(conv.bot_response, 150)}</p>
                            </div>
                          </div>
                        </div>
                      ))
                    )}
                  </div>

                  {/* Pagination */}
                  {totalPages > 1 && (
                    <div className="flex justify-center items-center space-x-4 mt-6">
                      <button
                        onClick={() => setPage(p => Math.max(1, p - 1))}
                        disabled={page === 1 || conversationLoading}
                        className="px-4 py-2 border border-gray-800 text-gray-300 rounded hover:bg-gray-800 transition disabled:opacity-50"
                      >
                        Previous
                      </button>
                      <span className="text-sm text-gray-400">
                        Page {page} of {totalPages}
                      </span>
                      <button
                        onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                        disabled={page === totalPages || conversationLoading}
                        className="px-4 py-2 border border-gray-800 text-gray-300 rounded hover:bg-gray-800 transition disabled:opacity-50"
                      >
                        Next
                      </button>
                    </div>
                  )}
                </div>

                {/* Conversation Detail Modal */}
                {selectedConversation && (
                  <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                    <div className="bg-gray-900 border border-gray-800 rounded-lg max-w-4xl w-full max-h-[80vh] overflow-hidden">
                      <div className="flex items-center justify-between p-6 border-b border-gray-800">
                        <div>
                          <h3 className="text-lg font-semibold">Conversation Details</h3>
                          <div className="flex items-center space-x-4 mt-1">
                            <div className="text-sm text-gray-400">
                              <span className="text-gray-300">User:</span>{' '}
                              <code className="ml-1 bg-gray-800 px-2 py-0.5 rounded">{selectedConversation.user_id}</code>
                            </div>
                            <div className="text-sm text-gray-400">
                              <span className="text-gray-300">Channel:</span>{' '}
                              <code className="ml-1 bg-gray-800 px-2 py-0.5 rounded">{selectedConversation.channel_id}</code>
                            </div>
                            <div className="text-sm text-gray-400">
                              {formatDate(selectedConversation.created_at)}
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center space-x-3">
                          <button
                            onClick={() => {
                              setConversationToDelete(selectedConversation)
                              setShowDeleteConfirm(true)
                            }}
                            className="px-3 py-1.5 text-red-400 hover:bg-red-500/10 transition rounded text-sm"
                          >
                            Delete
                          </button>
                          <button
                            onClick={() => setSelectedConversation(null)}
                            className="px-3 py-1.5 text-gray-400 hover:bg-gray-800 transition rounded text-sm"
                          >
                            Close
                          </button>
                        </div>
                      </div>
                      <div className="p-6 overflow-y-auto max-h-[60vh] space-y-6">
                        <div>
                          <div className="flex items-center space-x-2 mb-3">
                            <div className="w-8 h-8 bg-gradient-to-br from-purple-500 to-pink-500 rounded-full flex items-center justify-center font-bold text-white text-sm">
                              U
                            </div>
                            <span className="font-medium text-gray-300">User Message</span>
                          </div>
                          <div className="ml-10 p-4 bg-gray-950 border border-gray-800 rounded-lg">
                            <p className="text-gray-200 whitespace-pre-wrap">{selectedConversation.user_message}</p>
                          </div>
                        </div>
                        <div>
                          <div className="flex items-center space-x-2 mb-3">
                            <div className="w-8 h-8 bg-gradient-to-br from-indigo-500 to-blue-500 rounded-full flex items-center justify-center font-bold text-white text-sm">
                              B
                            </div>
                            <span className="font-medium text-gray-300">Bot Response</span>
                          </div>
                          <div className="ml-10 p-4 bg-gray-950 border border-indigo-500/20 rounded-lg">
                            <p className="text-gray-200 whitespace-pre-wrap">{selectedConversation.bot_response}</p>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* Management Actions */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* User Memory Management */}
                  <div className="bg-gray-900 border border-gray-800 rounded-lg p-6">
                    <h3 className="text-lg font-semibold text-red-400 mb-4">Clear User Memory</h3>
                    <p className="text-gray-300 mb-4 text-sm">
                      Delete all conversation history for a specific user
                    </p>
                    <div className="space-y-3">
                      <select
                        value={selectedUser}
                        onChange={(e) => setSelectedUser(e.target.value)}
                        className="w-full bg-gray-950 border border-gray-800 rounded px-3 py-2 text-gray-200 focus:outline-none focus:border-red-500"
                      >
                        <option value="">Select a user...</option>
                        {uniqueUsers.map(userId => (
                          <option key={userId} value={userId}>{userId}</option>
                        ))}
                      </select>
                      <button
                        onClick={clearUserMemory}
                        disabled={!selectedUser}
                        className="w-full py-3 text-red-400 border-2 border-red-500/30 rounded font-medium hover:bg-red-500/10 transition disabled:opacity-50"
                      >
                        Clear User History
                      </button>
                    </div>
                  </div>

                  {/* Channel Memory Management */}
                  <div className="bg-gray-900 border border-gray-800 rounded-lg p-6">
                    <h3 className="text-lg font-semibold text-red-400 mb-4">Clear Channel Memory</h3>
                    <p className="text-gray-300 mb-4 text-sm">
                      Delete all conversation history for a specific channel
                    </p>
                    <div className="space-y-3">
                      <select
                        value={selectedChannel}
                        onChange={(e) => setSelectedChannel(e.target.value)}
                        className="w-full bg-gray-950 border border-gray-800 rounded px-3 py-2 text-gray-200 focus:outline-none focus:border-red-500"
                      >
                        <option value="">Select a channel...</option>
                        {uniqueChannels.map(channelId => (
                          <option key={channelId} value={channelId}>{channelId}</option>
                        ))}
                      </select>
                      <button
                        onClick={clearChannelMemory}
                        disabled={!selectedChannel}
                        className="w-full py-3 text-red-400 border-2 border-red-500/30 rounded font-medium hover:bg-red-500/10 transition disabled:opacity-50"
                      >
                        Clear Channel History
                      </button>
                    </div>
                  </div>
                </div>

                {/* Danger Zone */}
                <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-6">
                  <h3 className="text-lg font-semibold text-red-400 mb-4">Danger Zone</h3>
                  <p className="text-gray-300 mb-6 text-sm">
                    This will permanently delete ALL conversation history. This action cannot be undone.
                  </p>
                  <button
                    onClick={resetMemory}
                    className="w-full py-3 text-red-400 border-2 border-red-500/30 rounded font-medium hover:bg-red-500/20 transition"
                  >
                    Reset All Conversations
                  </button>
                </div>
              </div>
            )}
          </main>
        </div>
      </div>
    </div>
  )
}