// bot.js - COMPLETE UPDATED VERSION WITH ANALYTICS
const fs = require('fs');
const path = require('path');
require('dotenv').config();
const { Client, GatewayIntentBits } = require('discord.js');
const { createClient } = require('@supabase/supabase-js');

console.log('='.repeat(50));
console.log('🤖 DISCORD COPILOT BOT - STARTING');
console.log('📅', new Date().toISOString());
console.log('='.repeat(50));

// Check environment variables
const requiredVars = ['DISCORD_TOKEN', 'HF_TOKEN', 'SUPABASE_URL', 'SUPABASE_KEY'];
let missingVars = [];
requiredVars.forEach(varName => {
    if (!process.env[varName]) {
        missingVars.push(varName);
        console.error(`❌ Missing: ${varName}`);
    } else {
        console.log(`✅ ${varName}: Present`);
    }
});

if (missingVars.length > 0) {
    console.error('❌ Missing required environment variables. Bot cannot start.');
    process.exit(1);
}

// Initialize Supabase
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

console.log('🛢️  Supabase initialized');

// ✅ CORRECT INTENTS FOR DISCORD.JS v14
const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent,
        GatewayIntentBits.GuildMessageReactions
    ]
});

// Bot configuration
const CONFIG = {
    HF_API_URL: 'https://router.huggingface.co/v1/chat/completions',
    HF_MODEL: 'meta-llama/Llama-3.1-8B-Instruct',
    COMMAND_PREFIX: '!',
    ALLOW_MENTIONS: true,
    USER_COOLDOWN_MS: 3000,
    GUILD_COOLDOWN_MS: 1000,
};

// Storage for runtime data
const userCooldowns = new Map();
const guildCooldowns = new Map();
const conversationHistories = new Map();

// ====================
// HELPER FUNCTIONS
// ====================

async function getBotConfig() {
    try {
        console.log('📋 Fetching bot configuration from Supabase...');
        const { data, error } = await supabase
            .from('admin_settings')
            .select('*')
            .limit(1)
            .single();
        
        if (error) {
            console.error('❌ Error fetching config:', error.message);
            return {
                system_instructions: 'You are a helpful assistant. Respond professionally.',
                allowed_channels: []
            };
        }
        
        console.log('✅ Config loaded');
        return {
            system_instructions: data.system_instructions || 'You are a helpful assistant.',
            allowed_channels: data.allowed_channels || []
        };
    } catch (error) {
        console.error('❌ Failed to load config:', error.message);
        return {
            system_instructions: 'You are a helpful assistant.',
            allowed_channels: []
        };
    }
}

async function isChannelAllowed(channelId, allowedChannels) {
    if (!allowedChannels || allowedChannels.length === 0) {
        console.log(`⚠️  No channel restrictions - allowing ${channelId}`);
        return true;
    }
    
    const isAllowed = allowedChannels.includes(channelId);
    console.log(`🔍 Channel ${channelId} allowed? ${isAllowed ? '✅' : '❌'}`);
    return isAllowed;
}

function checkCooldown(userId, guildId) {
    const now = Date.now();
    
    const userCooldown = userCooldowns.get(userId);
    if (userCooldown && (now - userCooldown) < CONFIG.USER_COOLDOWN_MS) {
        return {
            allowed: false,
            type: 'user',
            waitTime: CONFIG.USER_COOLDOWN_MS - (now - userCooldown)
        };
    }
    
    const guildCooldown = guildCooldowns.get(guildId);
    if (guildCooldown && (now - guildCooldown) < CONFIG.GUILD_COOLDOWN_MS) {
        return {
            allowed: false,
            type: 'guild',
            waitTime: CONFIG.GUILD_COOLDOWN_MS - (now - guildCooldown)
        };
    }
    
    return { allowed: true };
}

function updateCooldowns(userId, guildId) {
    const now = Date.now();
    userCooldowns.set(userId, now);
    guildCooldowns.set(guildId, now);
}

async function callHuggingFaceAPI(prompt, systemInstructions, history = []) {
    try {
        console.log(`🤖 Calling Hugging Face API...`);
        
        const messages = [
            { role: 'system', content: systemInstructions },
            ...history.slice(-6),
            { role: 'user', content: prompt }
        ];
        
        const response = await fetch(CONFIG.HF_API_URL, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${process.env.HF_TOKEN}`,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                model: CONFIG.HF_MODEL,
                messages: messages,
                max_tokens: 500,
                temperature: 0.7,
                top_p: 0.9
            })
        });
        
        console.log(`📡 API Status: ${response.status}`);
        
        if (!response.ok) {
            const errorText = await response.text();
            console.error('❌ API Error:', errorText);
            
            if (response.status === 429) {
                throw new Error('Rate limit exceeded');
            } else if (response.status === 503) {
                throw new Error('Model is loading');
            } else {
                throw new Error(`API error: ${response.status}`);
            }
        }
        
        const data = await response.json();
        
        if (!data.choices || !data.choices[0]) {
            throw new Error('No response from AI');
        }
        
        return {
            text: data.choices[0].message.content,
            tokens: data.usage?.total_tokens || 0
        };
        
    } catch (error) {
        console.error('❌ API Call Failed:', error.message);
        throw error;
    }
}

async function saveConversation(userId, channelId, userMessage, aiResponse, tokensUsed = 0, responseTime = 0) {
    try {
        // Get additional context
        let user = null;
        let channel = null;
        let guild = null;
        
        try {
            // Get user info
            user = await client.users.fetch(userId).catch(() => null);
            
            // Get channel info
            channel = await client.channels.fetch(channelId).catch(() => null);
            
            // Get guild info if available
            if (channel && channel.guild) {
                guild = channel.guild;
            }
        } catch (fetchError) {
            console.log('⚠️ Could not fetch Discord data:', fetchError.message);
        }
        
        // Save to database with analytics
        const { error } = await supabase
            .from('conversations')
            .insert({
                user_id: userId,
                user_name: user?.username || 'Unknown',
                channel_id: channelId,
                channel_name: channel?.name || 'Unknown',
                guild_id: guild?.id || null,
                guild_name: guild?.name || null,
                user_message: userMessage,
                ai_response: aiResponse,
                tokens_used: tokensUsed,
                response_time_ms: responseTime,
                created_at: new Date().toISOString()
            });
        
        if (error) {
            console.error('❌ Failed to save conversation:', error.message);
        } else {
            console.log('💾 Conversation saved with analytics data');
        }
    } catch (error) {
        console.error('❌ Database error:', error.message);
    }
}

// ====================
// DISCORD EVENT HANDLERS
// ====================

client.once('ready', async () => {
    console.log('='.repeat(50));
    console.log(`✅ Logged in as ${client.user.tag}!`);
    console.log(`👥 Servers: ${client.guilds.cache.size}`);
    console.log(`👤 Users: ${client.users.cache.size}`);
    console.log('='.repeat(50));
    
    const config = await getBotConfig();
    
    client.user.setActivity({
        name: `in ${client.guilds.cache.size} servers`,
        type: 0 // PLAYING
    });
});

client.on('messageCreate', async (message) => {
    if (message.author.bot) return;
    
    console.log(`\n📨 ${message.author.username}: ${message.content.substring(0, 50)}`);
    
    const config = await getBotConfig();
    
    const shouldRespond = 
        message.content.startsWith(CONFIG.COMMAND_PREFIX + 'ai') ||
        (CONFIG.ALLOW_MENTIONS && message.mentions.has(client.user));
    
    if (!shouldRespond) {
        console.log('   ⏩ Not addressed to bot');
        return;
    }
    
    let prompt = '';
    if (message.content.startsWith(CONFIG.COMMAND_PREFIX + 'ai')) {
        prompt = message.content.slice(CONFIG.COMMAND_PREFIX.length + 2).trim();
    } else if (message.mentions.has(client.user)) {
        prompt = message.content.replace(`<@${client.user.id}>`, '').trim();
    }
    
    if (!prompt) {
        return message.reply('Please provide a message.');
    }
    
    const cooldownCheck = checkCooldown(message.author.id, message.guild?.id || 'dm');
    if (!cooldownCheck.allowed) {
        const waitSeconds = Math.ceil(cooldownCheck.waitTime / 1000);
        return message.reply(`Please wait ${waitSeconds}s`);
    }
    
    const channelAllowed = await isChannelAllowed(message.channel.id, config.allowed_channels);
    if (!channelAllowed) {
        return;
    }
    
    try {
        updateCooldowns(message.author.id, message.guild?.id || 'dm');
        
        await message.channel.sendTyping();
        console.log(`   ⌨️  Typing...`);
        
        const userId = message.author.id;
        if (!conversationHistories.has(userId)) {
            conversationHistories.set(userId, []);
        }
        const history = conversationHistories.get(userId);
        
        console.log(`   🤖 Processing...`);
        const startTime = Date.now();
        
        const aiResponse = await callHuggingFaceAPI(prompt, config.system_instructions, history);
        const endTime = Date.now();
        const processingTime = endTime - startTime;
        
        console.log(`   ✅ Response (${processingTime}ms, ${aiResponse.tokens} tokens)`);
        
        history.push(
            { role: 'user', content: prompt },
            { role: 'assistant', content: aiResponse.text }
        );
        
        if (history.length > 6) {
            history.splice(0, 2);
        }
        
        // ✅ UPDATED: Save with analytics data
        await saveConversation(
            message.author.id,
            message.channel.id,
            prompt,
            aiResponse.text,
            aiResponse.tokens,
            processingTime
        );
        
        if (aiResponse.text.length <= 2000) {
            await message.reply(aiResponse.text);
            console.log(`   📤 Sent`);
        } else {
            const chunks = [];
            let remaining = aiResponse.text;
            
            while (remaining.length > 0) {
                const chunk = remaining.substring(0, 1997);
                const lastPeriod = chunk.lastIndexOf('.');
                const splitAt = lastPeriod > 1500 ? lastPeriod + 1 : 1997;
                chunks.push(chunk.substring(0, splitAt));
                remaining = remaining.substring(splitAt);
            }
            
            await message.reply(chunks[0]);
            for (let i = 1; i < chunks.length; i++) {
                await message.channel.send(chunks[i]);
            }
            
            console.log(`   📤 Sent in ${chunks.length} parts`);
        }
        
    } catch (error) {
        console.error(`   ❌ Error: ${error.message}`);
        
        let errorMessage = 'Sorry, an error occurred.';
        
        if (error.message.includes('Rate limit')) {
            errorMessage = '⚠️ Rate limit exceeded.';
        } else if (error.message.includes('Model is loading')) {
            errorMessage = '🔄 Model is loading. Try again in 30s.';
        } else if (error.message.includes('API error: 401')) {
            errorMessage = '🔑 API auth error.';
        }
        
        await message.reply(errorMessage);
    }
});

client.on('error', (error) => {
    console.error('❌ Discord Error:', error);
});

process.on('unhandledRejection', (error) => {
    console.error('❌ Unhandled Rejection:', error);
});

// ====================
// START BOT
// ====================

console.log('\n🚀 Connecting to Discord...');
client.login(process.env.DISCORD_TOKEN)
    .then(() => {
        console.log('✅ Discord login successful');
    })
    .catch((error) => {
        console.error('❌ Failed to login:', error.message);
        process.exit(1);
    });

process.on('SIGINT', () => {
    console.log('\n👋 Shutting down...');
    client.destroy();
    process.exit(0);
});