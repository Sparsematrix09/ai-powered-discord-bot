# Discord Copilot - AI-Powered Discord Bot with Admin Dashboard

A production-ready Discord bot that brings AI chat and image generation capabilities to your server, paired with a comprehensive admin dashboard for complete control and monitoring. Built as a full-stack AI integration project. This was made only for my use.

## Live Demo
| **Admin Dashboard (Vercel)** | [https://ai-powered-discord-bot.vercel.app/](https://ai-powered-discord-bot.vercel.app/) |
| **Discord Bot (Railway)** | Note: My railway free tier expired recently
| **Database (Supabase)** | PostgreSQL with Row Level Security |

**Note**: The bot may take 30-60 seconds to respond on first interaction if deployed on free tier (Render/Railway spins down after inactivity). The admin dashboard uses demo credentials `admin` / `admin123` for quick access.

## Core Features Implemented

### 🤖 Discord Bot Features
- **AI Chat with Context Memory** - Maintains conversation history per user per channel (last 50 messages)
- **Rolling Conversation Summaries** - Compresses long conversations while preserving context
- **Image Generation** - Create AI images using ClipDrop API with prompt validation
- **Smart Rate Limiting** - User cooldown (3s) and guild cooldown (1s)
- **Admin Command System** - Real-time stats, soft restart, channel management
- **Automatic Memory Cleanup** - Keeps last 50 conversations per user-channel pair

### 🎛️ Admin Dashboard Features
- **Live Conversation Viewer** - Search, filter by user/channel/date, pagination
- **System Prompt Editor** - Real-time bot behavior customization with presets
- **Channel Whitelist Management** - Control exactly where bot responds
- **Memory Analytics** - Total conversations, unique users, active channels
- **Bulk Delete Operations** - Clear user history, channel history, or full reset
- **Conversation Export** - JSON export for backup and analysis
- **Conversation Detail Modal** - View full exchanges with clean UI

### 🛡️ Safety & Moderation
- **Prompt Validation** - Blocks inappropriate content for both chat and images
- **Admin-Only Commands** - Protected by database whitelist
- **Channel Access Control** - Configurable allowed channels list
- **Rate Limiting** - Prevents spam and API abuse

## Tech Stack

| Layer | Technology | Purpose |
|-------|-----------|---------|
| **Frontend** | Next.js 15 (App Router) | Admin dashboard with server components |
| **Styling** | Tailwind CSS v4 | Modern, responsive UI |
| **Discord Bot** | Discord.js v14 | Discord API integration |
| **LLM Provider** | Hugging Face API | Llama-3.1-8B-Instruct model |
| **Image Generation** | ClipDrop API | Text-to-image generation |
| **Database** | Supabase (PostgreSQL) | Data persistence and real-time |
| **Health Server** | Express.js | Uptime monitoring for deployment |


## System Architecture

### Data Flow Explanation

| Layer | Technology | Responsibility |
|-------|-----------|----------------|
| **Discord Client** | Discord.js | Receives messages, sends responses, handles commands |
| **HTTP Layer** | Express.js (health check) | Provides uptime monitoring for deployment platforms |
| **Context Management** | ContextManager Class | Fetches history, creates summaries, assembles prompts |
| **AI Services** | Hugging Face / ClipDrop APIs | Process chat requests, generate images |
| **Database** | Supabase PostgreSQL | Stores conversations, settings, logs |
| **Admin Dashboard** | Next.js React | Provides management interface |

### Key Entities

| Entity | Description | Key Fields |
|--------|-------------|------------|
| **Conversations** | Chat history with context | id, channel_id, user_id, user_message, ai_response, context_summary, created_at |
| **Admin Settings** | Bot configuration singleton | id, system_instructions, allowed_channels[] |
| **Admin Users** | Whitelisted Discord admins | discord_id |
| **Image Logs** | Image generation audit trail | id, user_id, prompt, status, processing_time_ms |

### Database Constraints

| Constraint Type | Implementation | Purpose |
|----------------|---------------|---------|
| **Primary Keys** | UUID for conversations, SERIAL for settings | Unique identification |
| **Foreign Keys** | N/A (loose coupling for Discord IDs) | Flexibility across servers |
| **Array Type** | allowed_channels TEXT[] | Store multiple channel IDs |
| **Default Values** | created_at = NOW() | Automatic timestamping |
| **Check Constraints** | MAX 4000 chars for instructions | API limit compliance |

### AI Chat Flow
1. User sends message in Discord (!ai "What is React?")
2. Bot checks rate limits and channel permissions
3. ContextManager fetches last 5 conversations from DB
4. Creates rolling summary of last 3 exchanges
5. Assembles full system prompt + history + current message
6. Calls Hugging Face API with context
7. Saves new exchange to database
8. Auto-cleans old conversations (keeps last 50)
9. Sends response back to Discord channel

### Image Generation Flow
1. User types !image "cat wearing sunglasses"
2. Bot validates prompt (length, blocked terms)
3. Sends typing indicator
4. Calls ClipDrop API with prompt
5. Receives image buffer (PNG format)
6. Uploads file to Discord message
7. Logs generation to database
8. Error handling for rate limits/invalid prompts

### Admin Dashboard Flow
1. Admin logs in (demo auth: admin/admin123)
2. Fetches bot settings from Supabase
3. Edits system instructions or allowed channels
4. Saves changes → upsert to database
5. Bot picks up new settings on next command
6. Views conversations with filters (Date/User/Channel/Search)
7. Deletes individual conversations or bulk operations
8. Exports data as JSON backup

## Setup Instructions
### Clone Repository
```bash
git clone https://github.com/Sparsematrix09/ai-powered-discord-bot.git
cd discord-copilot
```
### Supabase Database Setup - run this in sql editor
```
-- Conversations table
CREATE TABLE conversations (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    channel_id TEXT NOT NULL,
    user_id TEXT NOT NULL,
    user_message TEXT NOT NULL,
    ai_response TEXT NOT NULL,
    context_summary TEXT,
    created_at TIMESTAMP DEFAULT NOW()
);

-- Admin settings table
CREATE TABLE admin_settings (
    id INTEGER PRIMARY KEY DEFAULT 1,
    system_instructions TEXT DEFAULT 'You are a helpful assistant. Be concise and professional.',
    allowed_channels TEXT[] DEFAULT '{}'
);

-- Insert default settings
INSERT INTO admin_settings (id, system_instructions, allowed_channels)
VALUES (1, 'You are a helpful assistant. Be concise and professional.', '{}')
ON CONFLICT (id) DO NOTHING;

-- Admin users table
CREATE TABLE admin_users (
    discord_id TEXT PRIMARY KEY
);

-- Insert your Discord ID as admin
INSERT INTO admin_users (discord_id) VALUES ('YOUR_DISCORD_USER_ID');

-- Image generation logs
CREATE TABLE image_generation_logs (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id TEXT NOT NULL,
    user_name TEXT,
    channel_id TEXT,
    prompt TEXT,
    model TEXT,
    size TEXT,
    status TEXT,
    processing_time_ms INTEGER,
    created_at TIMESTAMP DEFAULT NOW()
);

-- Performance indexes
CREATE INDEX idx_conversations_channel_user ON conversations(channel_id, user_id);
CREATE INDEX idx_conversations_created_at ON conversations(created_at DESC);
CREATE INDEX idx_image_logs_user ON image_generation_logs(user_id);
```
### Admin Dashboard Setup

```
cd admin-dashboard
npm install
cp .env.example .env.local
--
NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key
JWT_SECRET=your_jwt_secret_min_32_chars
JWT_REFRESH_SECRET=your_refresh_secret_min_32_chars

then
npm run dev
# Dashboard: http://localhost:3000
# Login: admin / admin123 (demo auth)
```

### Discord Bot Setup

```
cd discord-bot
npm install
cp .env.example .env
--
DISCORD_TOKEN=your_discord_bot_token
SUPABASE_URL=your_supabase_project_url
SUPABASE_KEY=your_supabase_anon_key
HF_TOKEN=your_huggingface_api_token
CLIPDROP_API_KEY=your_clipdrop_api_key
PORT=3000
```
### Discord Developer Portal Settings:
- Enable MESSAGE_CONTENT intent (required for reading messages)
- Enable GUILD_MESSAGES intent
- Invite bot with permissions: Send Messages, Read Messages, Attach Files, Embed Links
- node bot.js
