import { supabase } from './supabase';

class ContextManager {
  // Get recent conversation history for context
  async getConversationContext(channelId, userId, limit = 5) {
    try {
      const { data, error } = await supabase
        .from('conversations')
        .select('*')
        .eq('channel_id', channelId)
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(limit);
      
      if (error) throw error;
      
      // Return reversed (oldest first)
      return data ? data.reverse() : [];
    } catch (error) {
      console.error('Error getting conversation context:', error);
      return [];
    }
  }

  // Create a rolling summary from conversation history
  createSummary(conversations) {
    if (!conversations || conversations.length === 0) return '';
    
    // Take last 3 exchanges for summary
    const recent = conversations.slice(-3);
    const summary = recent.map(conv => 
      `User: ${conv.user_message.substring(0, 100)} | Bot: ${conv.bot_response.substring(0, 100)}`
    ).join('\n');
    
    return `Recent conversation summary:\n${summary}`;
  }

  // Assemble full context for AI response
  async assembleContext(adminInstructions, channelId, userId, currentMessage) {
    // 1. Get conversation history
    const history = await this.getConversationContext(channelId, userId);
    
    // 2. Create rolling summary
    const summary = this.createSummary(history);
    
    // 3. Format previous exchanges
    const previousExchanges = history.map(conv => 
      `User: ${conv.user_message}\nAssistant: ${conv.bot_response}`
    ).join('\n\n');
    
    // 4. Combine everything
    return {
      systemInstructions: adminInstructions,
      conversationSummary: summary,
      previousConversations: previousExchanges,
      currentMessage: currentMessage,
      fullContext: `
SYSTEM INSTRUCTIONS:
${adminInstructions}

${summary ? `CONVERSATION SUMMARY:\n${summary}\n\n` : ''}
${previousExchanges ? `PREVIOUS CONVERSATION:\n${previousExchanges}\n\n` : ''}
CURRENT MESSAGE:
${currentMessage}

ASSISTANT RESPONSE:`
    };
  }

  // Save conversation to database
  async saveConversation(channelId, userId, userMessage, botResponse) {
    try {
      // Get existing context to update summary
      const history = await this.getConversationContext(channelId, userId);
      const updatedHistory = [...history, { user_message: userMessage, bot_response: botResponse }];
      const newSummary = this.createSummary(updatedHistory);
      
      const { error } = await supabase
        .from('conversations')
        .insert({
          channel_id: channelId,
          user_id: userId,
          user_message: userMessage,
          bot_response: botResponse,
          context_summary: newSummary
        });
      
      if (error) throw error;
      
      // Clean up old conversations (keep last 50 per user per channel)
      await this.cleanupOldConversations(channelId, userId);
      
      return true;
    } catch (error) {
      console.error('Error saving conversation:', error);
      return false;
    }
  }

  // Clean up old conversations
  async cleanupOldConversations(channelId, userId, keepCount = 50) {
    try {
      const { data, error } = await supabase
        .from('conversations')
        .select('id')
        .eq('channel_id', channelId)
        .eq('user_id', userId)
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      
      if (data && data.length > keepCount) {
        const idsToDelete = data.slice(keepCount).map(item => item.id);
        
        const { error: deleteError } = await supabase
          .from('conversations')
          .delete()
          .in('id', idsToDelete);
        
        if (deleteError) throw deleteError;
      }
    } catch (error) {
      console.error('Error cleaning up old conversations:', error);
    }
  }

  // Clear conversations for a specific channel/user
  async clearConversation(channelId, userId) {
    try {
      const { error } = await supabase
        .from('conversations')
        .delete()
        .eq('channel_id', channelId)
        .eq('user_id', userId);
      
      if (error) throw error;
      return true;
    } catch (error) {
      console.error('Error clearing conversation:', error);
      return false;
    }
  }
}

export default new ContextManager();