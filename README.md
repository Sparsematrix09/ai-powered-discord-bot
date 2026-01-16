Discord Copilot 🤖
A powerful AI-powered Discord bot with a modern admin dashboard for complete control and management.

✨ Features
🤖 Discord Bot
AI Chat: Powered by Hugging Face LLMs with conversation context
Image Generation: Create AI images using ClipDrop API
Memory Management: Stores conversation history in Supabase
Smart Commands:
!ai [question] - Ask AI anything
!image [prompt] - Generate images
!help - Show all commands
!clear - Clear conversation history

🎛️ Admin Dashboard
Live Conversation Viewer: Monitor all bot interactions
System Instructions: Customize bot behavior and personality
Channel Management: Control which channels the bot responds in
Memory Management: View, filter, and delete conversation history
Real-time Stats: Monitor bot usage and performance

⚙️ Environment Variables
Admin Dashboard (.env.local)
env
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
JWT_SECRET=your_secret_key
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key
JWT_REFRESH_SECRET=get_key

discord-bot env
DISCORD_TOKEN=your_discord_bot_token
SUPABASE_URL=your_supabase_url
SUPABASE_KEY=your_supabase_anon_key
HF_TOKEN=your_huggingface_token
CLIPDROP_API_KEY=your_clipdrop_api_key

🛠️ Local Development
1. Clone Repository
bash
git clone https://github.com/yourusername/discord-copilot.git
cd discord-copilot

3. Set Up Admin Dashboard
bash
cd admin-dashboard
npm install
cp .env.example .env.local
# Add your Supabase credentials to .env.local
npm run dev

3. Set Up Discord Bot
bash
cd discord-bot
npm install
cp .env.example .env
# Add your API keys to .env
node bot.js

