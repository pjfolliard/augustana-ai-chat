# AI Chat with Folder Organization

A modern AI chat application built with Next.js 15, Supabase, and Google OAuth authentication. Features include hierarchical folder organization, drag-and-drop chat management, and real-time messaging.

## ✨ Features

- **🔐 Google OAuth Authentication** - Secure sign-in with Google
- **📁 Folder Organization** - Create hierarchical folders to organize chats
- **🎯 Drag & Drop** - Move chats between folders effortlessly
- **💬 Real-time Chat** - AI-powered conversations with message persistence
- **🏷️ Chat Management** - Create, rename, delete, and organize chats
- **📱 Responsive Design** - Works on desktop and mobile devices
- **🎨 Modern UI** - Clean, intuitive interface with Tailwind CSS
- **⚡ Performance** - Optimized with database indexing and caching

## 🚀 Tech Stack

- **Frontend**: Next.js 15, React 19, TypeScript
- **Authentication**: Supabase Auth with Google OAuth
- **Database**: PostgreSQL with Supabase
- **Styling**: Tailwind CSS
- **Icons**: Heroicons
- **AI**: OpenAI GPT-4o-mini (configurable)

## 📋 Prerequisites

- Node.js 18+ and npm
- A [Supabase](https://supabase.com) account and project
- An [OpenAI](https://platform.openai.com) API key
- Google OAuth credentials (for authentication)

## 🛠️ Setup Instructions

### 1. Clone and Install

```bash
git clone <repository-url>
cd openai-chatbot-ui
npm install
```

### 2. Environment Variables

Create a `.env.local` file in the root directory:

```bash
# Supabase Configuration
NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key

# OpenAI Configuration
OPENAI_API_KEY=your_openai_api_key

# App Configuration
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

### 3. Supabase Setup

#### A. Configure Google OAuth

1. In your Supabase dashboard, go to **Authentication → Providers**
2. Enable **Google** provider
3. Add your Google OAuth credentials:
   - Get credentials from [Google Cloud Console](https://console.cloud.google.com)
   - Set authorized redirect URI: `https://your-project.supabase.co/auth/v1/callback`

#### B. Run Database Migrations

In your Supabase SQL Editor, run these migrations in order:

1. **001_initial_setup.sql** - Basic setup and user profiles
2. **002_folders.sql** - Folder hierarchy system
3. **003_chats.sql** - Chat management with folder relationships
4. **004_messages.sql** - Message storage with attachments
5. **005_performance_indexes.sql** - Database optimization
6. **006_advanced_rls_policies.sql** - Security policies

Each migration file is located in `supabase/migrations/` directory.

### 4. Run the Application

```bash
npm run dev
```

Visit [http://localhost:3000](http://localhost:3000) to see the application.

## 📊 Database Schema

The application uses the following main tables:

- **profiles** - User profiles with role-based permissions
- **folders** - Hierarchical folder structure for organization
- **chats** - Chat conversations with metadata and sharing
- **messages** - Individual messages with file attachments

## 🎯 Usage

1. **Sign In** - Use Google OAuth to authenticate
2. **Create Folders** - Organize your conversations with folders
3. **Start Chatting** - Create new chats or select existing ones
4. **Organize** - Drag and drop chats between folders
5. **Manage** - Rename, delete, or share your conversations

## 🔧 API Routes

The application includes these API endpoints:

- `GET /api/folders` - Fetch user folders
- `POST /api/folders` - Create new folder
- `PUT /api/folders/[id]` - Update folder
- `DELETE /api/folders/[id]` - Delete folder
- `GET /api/chats` - Fetch user chats
- `POST /api/chats` - Create new chat
- `PUT /api/chats/[id]` - Update chat
- `DELETE /api/chats/[id]` - Delete chat
- `GET /api/chats/[id]/messages` - Fetch chat messages
- `POST /api/chats/[id]/messages` - Create new message

## 🚀 Deployment

### Vercel (Recommended)

1. Push your code to GitHub
2. Import the project in Vercel
3. Add environment variables in Vercel dashboard
4. Deploy automatically on push

### Other Platforms

The app can be deployed on any platform that supports Next.js:

- Netlify
- Railway
- DigitalOcean App Platform
- AWS Amplify

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📝 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- [Next.js](https://nextjs.org) for the amazing React framework
- [Supabase](https://supabase.com) for backend services
- [OpenAI](https://openai.com) for AI capabilities
- [Tailwind CSS](https://tailwindcss.com) for styling
- [Heroicons](https://heroicons.com) for beautiful icons
