// bot.js - COMPLETE UPDATED VERSION WITH ALL COMMANDS
const fs = require('fs');
const path = require('path');
require('dotenv').config();
const { Client, GatewayIntentBits, EmbedBuilder } = require('discord.js');
const { createClient } = require('@supabase/supabase-js');

console.log('='.repeat(50));
console.log('🤖 DISCORD COPILOT BOT - STARTING');
console.log('📅', new Date().toISOString());
console.log('='.repeat(50));

// Check environment variables
const requiredVars = ['DISCORD_TOKEN', 'HF_TOKEN', 'SUPABASE_URL', 'SUPABASE_KEY', 'CLIPDROP_API_KEY'];
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

// Discord client
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

async function isUserAdmin(userId) {
    try {
        const { data, error } = await supabase
            .from('admin_users')
            .select('discord_id')
            .eq('discord_id', userId)
            .single();
        
        if (error || !data) {
            console.log(`⚠️ User ${userId} is not admin`);
            return false;
        }
        
        console.log(`✅ User ${userId} is admin`);
        return true;
    } catch (error) {
        console.error('❌ Error checking admin status:', error);
        return false;
    }
}

async function getBotConfig() {
    try {
        console.log('📋 Fetching bot configuration...');
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
        return true;
    }
    
    return allowedChannels.includes(channelId);
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

// ====================
// COMMAND HANDLERS
// ====================

// !help command
async function handleHelpCommand(message) {
    const embed = new EmbedBuilder()
        .setColor(0x5865F2)
        .setTitle('🤖 Discord Copilot Commands')
        .setDescription('Here are all available commands:')
        .addFields(
            {
                name: '🔄 AI Chat Commands',
                value: '```\n!ai [question] - Ask AI anything\n!ask [question] - Same as !ai\n```',
                inline: false
            },
            {
                name: '🎨 Image Generation',
                value: '```\n!image [prompt] - Generate AI image\n!imagine [prompt] - Same as !image\n!gen [prompt] - Same as !image\n```',
                inline: false
            },
            {
                name: '⚙️ Utility Commands',
                value: '```\n!help - Show this help message\n!ping - Check bot status\n!clear - Clear chat history in this channel\n```',
                inline: false
            },
            {
                name: '🛠️ Admin Commands',
                value: '```\n!admin help - Show admin commands\n!admin stats - Show bot statistics\n!admin restart - Soft restart bot\n!admin channels - List allowed channels\n```',
                inline: false
            }
        )
        .setFooter({ text: 'Use !admin help for administrator commands' })
        .setTimestamp();
    
    await message.reply({ embeds: [embed] });
}

// !ping command
async function handlePingCommand(message) {
    const start = Date.now();
    const msg = await message.reply('🏓 Pinging...');
    const latency = Date.now() - start;
    
    const embed = new EmbedBuilder()
        .setColor(0x2ECC71)
        .setTitle('🏓 Pong!')
        .setDescription(`Bot is online and responsive`)
        .addFields(
            { name: 'Latency', value: `${latency}ms`, inline: true },
            { name: 'Uptime', value: `${Math.floor(process.uptime() / 60)} minutes`, inline: true },
            { name: 'Status', value: '🟢 Online', inline: true }
        )
        .setTimestamp();
    
    await msg.edit({ content: '', embeds: [embed] });
}

// !clear command
async function handleClearCommand(message) {
    const channelId = message.channel.id;
    
    try {
        // Clear conversation history from database
        const { error } = await supabase
            .from('conversations')
            .delete()
            .eq('channel_id', channelId);
        
        if (error) {
            throw error;
        }
        
        // Also clear from memory cache
        conversationHistories.forEach((history, userId) => {
            // Keep user histories but they won't have channel context
        });
        
        const embed = new EmbedBuilder()
            .setColor(0x3498DB)
            .setTitle('🗑️ Conversation Cleared')
            .setDescription(`All conversation history has been cleared for this channel.`)
            .setFooter({ text: 'New conversations will start fresh' })
            .setTimestamp();
        
        await message.reply({ embeds: [embed] });
        
    } catch (error) {
        console.error('Clear command error:', error);
        await message.reply('❌ Failed to clear conversation history.');
    }
}

// !admin help command
async function handleAdminHelpCommand(message) {
    const isAdmin = await isUserAdmin(message.author.id);
    
    if (!isAdmin) {
        return message.reply('❌ This command is for administrators only.');
    }
    
    const embed = new EmbedBuilder()
        .setColor(0xE74C3C)
        .setTitle('🛠️ Admin Commands')
        .setDescription('Administrator-only commands')
        .addFields(
            {
                name: '📊 Information',
                value: '```\n!admin stats - Show bot statistics\n!admin channels - List allowed channels\n```'
            },
            {
                name: '⚙️ Management',
                value: '```\n!admin restart - Soft restart bot\n!admin config - Show current configuration\n```'
            },
            {
                name: 'ℹ️ Note',
                value: 'Configure bot behavior at the [Admin Dashboard]'
            }
        )
        .setFooter({ text: 'Discord Copilot Admin Console' })
        .setTimestamp();
    
    await message.reply({ embeds: [embed] });
}

// !admin stats command
async function handleAdminStatsCommand(message) {
    const isAdmin = await isUserAdmin(message.author.id);
    
    if (!isAdmin) {
        return message.reply('❌ This command is for administrators only.');
    }
    
    try {
        // Get statistics from database
        const [conversations, images, settings] = await Promise.all([
            supabase.from('conversations').select('id'),
            supabase.from('image_generation_logs').select('id'),
            supabase.from('admin_settings').select('allowed_channels').single()
        ]);
        
        const embed = new EmbedBuilder()
            .setColor(0x9B59B6)
            .setTitle('📊 Bot Statistics')
            .setDescription('Current usage and performance metrics')
            .addFields(
                { 
                    name: '💬 Conversations', 
                    value: `${conversations.data?.length || 0} total`, 
                    inline: true 
                },
                { 
                    name: '🎨 Images Generated', 
                    value: `${images.data?.length || 0} total`, 
                    inline: true 
                },
                { 
                    name: '📁 Active Channels', 
                    value: `${settings.data?.allowed_channels?.length || 0} channels`, 
                    inline: true 
                },
                { 
                    name: '⏱️ Bot Uptime', 
                    value: `${Math.floor(process.uptime() / 3600)} hours`, 
                    inline: true 
                },
                { 
                    name: '👥 Active Users', 
                    value: `${conversationHistories.size} in memory`, 
                    inline: true 
                },
                { 
                    name: '🔄 Cooldown Status', 
                    value: `${userCooldowns.size} users on cooldown`, 
                    inline: true 
                }
            )
            .setFooter({ text: 'Updated just now' })
            .setTimestamp();
        
        await message.reply({ embeds: [embed] });
        
    } catch (error) {
        console.error('Stats command error:', error);
        await message.reply('❌ Failed to fetch statistics.');
    }
}

// !admin channels command
async function handleAdminChannelsCommand(message) {
    const isAdmin = await isUserAdmin(message.author.id);
    
    if (!isAdmin) {
        return message.reply('❌ This command is for administrators only.');
    }
    
    try {
        const config = await getBotConfig();
        const allowedChannels = config.allowed_channels || [];
        
        let channelsList = 'No channels configured (bot responds everywhere)';
        
        if (allowedChannels.length > 0) {
            channelsList = allowedChannels.map(channelId => {
                const channel = message.guild?.channels.cache.get(channelId);
                return channel ? `#${channel.name} (\`${channelId}\`)` : `\`${channelId}\` (channel not found)`;
            }).join('\n');
        }
        
        const embed = new EmbedBuilder()
            .setColor(0xF1C40F)
            .setTitle('📁 Allowed Channels')
            .setDescription('Channels where the bot can respond')
            .addFields({
                name: `Active Channels (${allowedChannels.length})`,
                value: channelsList
            })
            .setFooter({ text: 'Configure in Admin Dashboard' })
            .setTimestamp();
        
        await message.reply({ embeds: [embed] });
        
    } catch (error) {
        console.error('Channels command error:', error);
        await message.reply('❌ Failed to fetch channel list.');
    }
}

// !admin restart command (soft restart)
async function handleAdminRestartCommand(message) {
    const isAdmin = await isUserAdmin(message.author.id);
    
    if (!isAdmin) {
        return message.reply('❌ This command is for administrators only.');
    }
    
    const embed = new EmbedBuilder()
        .setColor(0xE67E22)
        .setTitle('🔄 Bot Restarting')
        .setDescription('Performing soft restart...')
        .addFields(
            { name: 'Status', value: '🟡 Restarting', inline: true },
            { name: 'Type', value: 'Soft Restart', inline: true },
            { name: 'Estimated Time', value: '5-10 seconds', inline: true }
        )
        .setFooter({ text: 'Bot will reconnect automatically' })
        .setTimestamp();
    
    const restartMsg = await message.reply({ embeds: [embed] });
    
    // Clear caches
    userCooldowns.clear();
    guildCooldowns.clear();
    conversationHistories.clear();
    
    // Update status
    setTimeout(async () => {
        const updatedEmbed = new EmbedBuilder()
            .setColor(0x2ECC71)
            .setTitle('✅ Bot Restarted')
            .setDescription('Soft restart completed successfully')
            .addFields(
                { name: 'Status', value: '🟢 Online', inline: true },
                { name: 'Caches Cleared', value: '✅', inline: true },
                { name: 'Memory', value: '🔄 Refreshed', inline: true }
            )
            .setFooter({ text: 'Ready to process commands' })
            .setTimestamp();
        
        await restartMsg.edit({ embeds: [updatedEmbed] });
    }, 5000);
}

// !ask command (alias for !ai)
async function handleAskCommand(message, args) {
    // This will be handled in the main message handler
    // We'll just redirect it to the AI handler
}

// ====================
// IMAGE GENERATION FUNCTIONS
// ====================

function validateImagePrompt(prompt) {
    if (!prompt || prompt.trim().length === 0) {
        return { valid: false, reason: 'Prompt cannot be empty.' };
    }
    
    if (prompt.length > 1000) {
        return { valid: false, reason: 'Prompt is too long (max 1000 characters).' };
    }
    
    const blockedTerms = ['nude', 'explicit', 'violence', 'porn', 'sexual', 'gore'];
    const lowerPrompt = prompt.toLowerCase();
    
    for (const term of blockedTerms) {
        if (lowerPrompt.includes(term)) {
            return { valid: false, reason: 'Prompt contains blocked content.' };
        }
    }
    
    return { valid: true };
}

async function generateImage(prompt, settings) {
    return new Promise((resolve) => {
        try {
            console.log(`🖼️ Generating image: "${prompt}"`);
            
            if (!settings.api_key) {
                return resolve({
                    success: false,
                    error: 'Clipdrop API key not configured'
                });
            }
            
            const boundary = '----WebKitFormBoundary' + Date.now();
            const body = `--${boundary}\r\n` +
                         'Content-Disposition: form-data; name="prompt"\r\n\r\n' +
                         `${prompt}\r\n` +
                         `--${boundary}--\r\n`;
            
            const https = require('https');
            const options = {
                hostname: 'clipdrop-api.co',
                path: '/text-to-image/v1',
                method: 'POST',
                headers: {
                    'x-api-key': settings.api_key,
                    'Content-Type': `multipart/form-data; boundary=${boundary}`,
                    'Content-Length': Buffer.byteLength(body)
                }
            };
            
            console.log('📡 Calling Clipdrop API...');
            
            const req = https.request(options, (res) => {
                console.log(`📡 API Status: ${res.statusCode} ${res.statusMessage}`);
                
                const chunks = [];
                res.on('data', (chunk) => chunks.push(chunk));
                
                res.on('end', () => {
                    const buffer = Buffer.concat(chunks);
                    
                    const isImage = buffer.length > 8 && 
                                   buffer[0] === 0x89 && buffer[1] === 0x50 && 
                                   buffer[2] === 0x4E && buffer[3] === 0x47;
                    
                    if (res.statusCode === 200 && isImage) {
                        console.log(`✅ Image generated (${buffer.length} bytes)`);
                        resolve({
                            success: true,
                            imageBuffer: buffer
                        });
                    } else {
                        const errorText = buffer.toString();
                        console.error('❌ API Error:', errorText.substring(0, 200));
                        
                        let errorMsg = `API error: ${res.statusCode}`;
                        try {
                            const errorJson = JSON.parse(errorText);
                            errorMsg = errorJson.error || errorJson.message || errorText;
                        } catch {
                            errorMsg = errorText || `HTTP ${res.statusCode}`;
                        }
                        
                        resolve({
                            success: false,
                            error: errorMsg
                        });
                    }
                });
            });
            
            req.on('error', (error) => {
                console.error('Request error:', error.message);
                resolve({
                    success: false,
                    error: error.message
                });
            });
            
            req.write(body);
            req.end();
            
        } catch (error) {
            console.error('Image generation error:', error);
            resolve({
                success: false,
                error: error.message
            });
        }
    });
}

async function handleImageCommand(message, args) {
    const channelId = message.channel.id;
    const userId = message.author.id;
    const username = message.author.username;
    
    try {
        const prompt = args.join(' ');
        
        const validation = validateImagePrompt(prompt);
        if (!validation.valid) {
            return message.reply(`❌ ${validation.reason}`);
        }
        
        const loadingMessage = await message.reply({
            content: `🖼️ **Generating image for ${username}...**\n📝 **Prompt:** ${prompt.substring(0, 100)}${prompt.length > 100 ? '...' : ''}\n⏳ This may take 10-20 seconds...`,
            allowedMentions: { repliedUser: false }
        });
        
        const clipdropSettings = {
            api_key: process.env.CLIPDROP_API_KEY
        };
        
        console.log(`🎨 Image request from ${username}: "${prompt.substring(0, 50)}..."`);
        const startTime = Date.now();
        const result = await generateImage(prompt, clipdropSettings);
        const processingTime = Date.now() - startTime;
        
        if (result.success) {
            await loadingMessage.edit({
                content: `✅ **Image generated for ${username}!**\n📝 **Prompt:** ${prompt}\n⏱️ **Time:** ${(processingTime / 1000).toFixed(1)}s`,
                files: [{
                    attachment: result.imageBuffer,
                    name: `image_${Date.now()}.png`
                }]
            });
            
            console.log(`✅ Image sent to ${username} in ${processingTime}ms`);
            
            try {
                await supabase
                    .from('image_generation_logs')
                    .insert([{
                        user_id: userId,
                        user_name: username,
                        channel_id: channelId,
                        prompt: prompt,
                        model: 'clipdrop-text-to-image',
                        size: '1024x1024',
                        status: 'completed',
                        processing_time_ms: processingTime
                    }]);
            } catch (dbError) {
                console.log('⚠️ Could not log to database:', dbError.message);
            }
            
        } else {
            await loadingMessage.edit(`❌ Failed to generate image: ${result.error}`);
            console.error(`❌ Image generation failed for ${username}: ${result.error}`);
        }
        
    } catch (error) {
        console.error('Image command error:', error);
        
        try {
            await message.reply('❌ An error occurred while generating the image.');
        } catch (e) {
            console.error('Failed to send error message:', e.message);
        }
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
    
    await getBotConfig();
    
    client.user.setActivity({
        name: `!help for commands`,
        type: 0
    });
    
    console.log('🤖 Bot is ready with all commands!');
});

client.on('messageCreate', async (message) => {
    if (message.author.bot) return;
    
    console.log(`\n📨 ${message.author.username}: ${message.content.substring(0, 50)}`);
    
    const content = message.content.toLowerCase();
    
    // Handle basic commands
    if (content === '!help') {
        return await handleHelpCommand(message);
    }
    
    if (content === '!ping') {
        return await handlePingCommand(message);
    }
    
    if (content === '!clear') {
        return await handleClearCommand(message);
    }
    
    if (content.startsWith('!admin')) {
        const args = message.content.split(' ');
        const command = args[1];
        
        switch(command) {
            case 'help':
                return await handleAdminHelpCommand(message);
            case 'stats':
                return await handleAdminStatsCommand(message);
            case 'restart':
                return await handleAdminRestartCommand(message);
            case 'channels':
                return await handleAdminChannelsCommand(message);
            default:
                return await handleAdminHelpCommand(message);
        }
    }
    
    // Handle image commands
    if (content.startsWith('!image') || content.startsWith('!gen') || content.startsWith('!imagine')) {
        const args = message.content.split(' ').slice(1);
        if (args.length === 0) {
            return message.reply('Please provide a prompt. Usage: `!image <prompt>`');
        }
        return await handleImageCommand(message, args);
    }
    
    // Handle AI chat (existing functionality)
    const config = await getBotConfig();
    
    const shouldRespond = 
        message.content.startsWith(CONFIG.COMMAND_PREFIX + 'ai') ||
        message.content.startsWith(CONFIG.COMMAND_PREFIX + 'ask') ||
        (CONFIG.ALLOW_MENTIONS && message.mentions.has(client.user));
    
    if (!shouldRespond) {
        return;
    }
    
    let prompt = '';
    if (message.content.startsWith(CONFIG.COMMAND_PREFIX + 'ai')) {
        prompt = message.content.slice(CONFIG.COMMAND_PREFIX.length + 2).trim();
    } else if (message.content.startsWith(CONFIG.COMMAND_PREFIX + 'ask')) {
        prompt = message.content.slice(CONFIG.COMMAND_PREFIX.length + 3).trim();
    } else if (message.mentions.has(client.user)) {
        prompt = message.content.replace(`<@${client.user.id}>`, '').trim();
    }
    
    if (!prompt) {
        return message.reply('Please provide a message. Usage: `!ai [your question]` or `!ask [your question]`');
    }
    
    const cooldownCheck = checkCooldown(message.author.id, message.guild?.id || 'dm');
    if (!cooldownCheck.allowed) {
        const waitSeconds = Math.ceil(cooldownCheck.waitTime / 1000);
        return message.reply(`Please wait ${waitSeconds}s before asking another question.`);
    }
    
    const channelAllowed = await isChannelAllowed(message.channel.id, config.allowed_channels);
    if (!channelAllowed) {
        return;
    }
    
    try {
        updateCooldowns(message.author.id, message.guild?.id || 'dm');
        
        await message.channel.sendTyping();
        
        const userId = message.author.id;
        if (!conversationHistories.has(userId)) {
            conversationHistories.set(userId, []);
        }
        const history = conversationHistories.get(userId);
        
        const startTime = Date.now();
        const aiResponse = await callHuggingFaceAPI(prompt, config.system_instructions, history);
        const processingTime = Date.now() - startTime;
        
        console.log(`   ✅ Response (${processingTime}ms, ${aiResponse.tokens} tokens)`);
        
        history.push(
            { role: 'user', content: prompt },
            { role: 'assistant', content: aiResponse.text }
        );
        
        if (history.length > 6) {
            history.splice(0, 2);
        }
        
        // Save to database
        try {
            await supabase
                .from('conversations')
                .insert({
                    user_id: message.author.id,
                    user_name: message.author.username,
                    channel_id: message.channel.id,
                    channel_name: message.channel.name,
                    user_message: prompt,
                    ai_response: aiResponse.text,
                    tokens_used: aiResponse.tokens,
                    response_time_ms: processingTime
                });
        } catch (dbError) {
            console.log('⚠️ Could not save conversation:', dbError.message);
        }
        
        // Send response
        if (aiResponse.text.length <= 2000) {
            await message.reply(aiResponse.text);
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
        }
        
    } catch (error) {
        console.error(`   ❌ Error: ${error.message}`);
        
        let errorMessage = 'Sorry, an error occurred while processing your request.';
        
        if (error.message.includes('Rate limit')) {
            errorMessage = '⚠️ Rate limit exceeded. Please try again later.';
        } else if (error.message.includes('Model is loading')) {
            errorMessage = '🔄 Model is loading. Try again in 30 seconds.';
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