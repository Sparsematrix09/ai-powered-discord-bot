import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

// Context manager class (you can move this to a separate file later)
class ContextManager {
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
      return data ? data.reverse() : [];
    } catch (error) {
      console.error('Error getting conversation context:', error);
      return [];
    }
  }

  createSummary(conversations) {
    if (!conversations || conversations.length === 0) return '';
    
    const recent = conversations.slice(-3);
    const summary = recent.map(conv => 
      `User: ${conv.user_message.substring(0, 100)} | Bot: ${conv.bot_response.substring(0, 100)}`
    ).join('\n');
    
    return `Recent conversation summary:\n${summary}`;
  }

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

  async saveConversation(channelId, userId, userMessage, botResponse) {
    try {
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
}

// Create singleton instance
const contextManager = new ContextManager();

// GET handler for retrieving context
export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const channelId = searchParams.get('channelId');
    const userId = searchParams.get('userId');
    const instructions = searchParams.get('instructions');
    const message = searchParams.get('message');
    
    if (!channelId || !userId || !message || !instructions) {
      return NextResponse.json(
        { success: false, error: 'Missing required parameters' },
        { status: 400 }
      );
    }
    
    const context = await contextManager.assembleContext(
      instructions,
      channelId,
      userId,
      message
    );
    
    return NextResponse.json({ 
      success: true, 
      context: context.fullContext,
      summary: context.conversationSummary,
      historyLength: context.previousConversations ? context.previousConversations.split('\n\n').length : 0
    });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}

// POST handler for saving conversations and getting context
export async function POST(request) {
  try {
    const { 
      action, 
      channelId, 
      userId, 
      message, 
      instructions, 
      botResponse 
    } = await request.json();
    
    if (!action) {
      return NextResponse.json(
        { success: false, error: 'Action parameter is required' },
        { status: 400 }
      );
    }
    
    switch (action) {
      case 'getContext':
        if (!channelId || !userId || !message || !instructions) {
          return NextResponse.json(
            { success: false, error: 'Missing required parameters for getContext' },
            { status: 400 }
          );
        }
        
        const context = await contextManager.assembleContext(
          instructions,
          channelId,
          userId,
          message
        );
        
        return NextResponse.json({ 
          success: true, 
          context: context.fullContext,
          summary: context.conversationSummary 
        });
        
      case 'saveConversation':
        if (!channelId || !userId || !message || !botResponse) {
          return NextResponse.json(
            { success: false, error: 'Missing required parameters for saveConversation' },
            { status: 400 }
          );
        }
        
        const saveResult = await contextManager.saveConversation(
          channelId,
          userId,
          message,
          botResponse
        );
        
        return NextResponse.json({ 
          success: saveResult,
          message: saveResult ? 'Conversation saved successfully' : 'Failed to save conversation'
        });
        
      case 'clearConversations':
        if (!channelId || !userId) {
          return NextResponse.json(
            { success: false, error: 'Missing channelId or userId' },
            { status: 400 }
          );
        }
        
        // Note: You'll need to implement the clear method in ContextManager
        return NextResponse.json({ 
          success: false, 
          error: 'Clear method not implemented' 
        });
        
      default:
        return NextResponse.json(
          { success: false, error: 'Invalid action' },
          { status: 400 }
        );
    }
  } catch (error) {
    console.error('API Error:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}