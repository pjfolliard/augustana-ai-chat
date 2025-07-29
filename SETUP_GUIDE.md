# Setup Guide for AI Chatbot with Folders

## 1. Environment Variables

Your `.env.local` file has been created. You need to add the following API keys:

### Get Supabase Keys:
1. Go to [supabase.com](https://supabase.com) and create a new project
2. In your project dashboard, go to Settings → API
3. Copy the following values:
   - `NEXT_PUBLIC_SUPABASE_URL` = Your project URL
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY` = Your anon/public key
   - `SUPABASE_SERVICE_ROLE_KEY` = Your service role key

### Get OpenAI API Key:
1. Go to [platform.openai.com](https://platform.openai.com)
2. Create an account or sign in
3. Go to API Keys section
4. Create a new secret key
5. Copy the key for `OPENAI_API_KEY`

## 2. Database Setup

### Run the database migrations in order:
1. In your Supabase dashboard, go to SQL Editor
2. Run each migration file in order:
   
   **001_initial_setup.sql** - Creates user profiles and basic setup:
   ```sql
   [Copy and paste the contents of supabase/migrations/001_initial_setup.sql]
   ```
   
   **002_folders.sql** - Creates hierarchical folder structure:
   ```sql
   [Copy and paste the contents of supabase/migrations/002_folders.sql]
   ```
   
   **003_chats.sql** - Creates chats table with folder relationships:
   ```sql
   [Copy and paste the contents of supabase/migrations/003_chats.sql]
   ```
   
   **004_messages.sql** - Creates messages table with attachments:
   ```sql
   [Copy and paste the contents of supabase/migrations/004_messages.sql]
   ```
   
   **005_performance_indexes.sql** - Adds performance optimizations:
   ```sql
   [Copy and paste the contents of supabase/migrations/005_performance_indexes.sql]
   ```
   
   **006_advanced_rls_policies.sql** - Advanced security policies:
   ```sql
   [Copy and paste the contents of supabase/migrations/006_advanced_rls_policies.sql]
   ```

This will create:
- User profiles table with role-based permissions
- Hierarchical folders for organizing chats
- Chats table with folder relationships and sharing
- Messages table with file attachments support
- Full-text search capabilities
- Performance indexes and security policies

## 3. Update your .env.local file

Replace the placeholder values in `.env.local` with your actual API keys:

```bash
# Supabase
NEXT_PUBLIC_SUPABASE_URL=your_actual_supabase_project_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_actual_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_actual_supabase_service_role_key

# OpenAI
OPENAI_API_KEY=your_actual_openai_api_key

# App
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

## 4. Start the Development Server

```bash
npm run dev
```

The app will be available at [http://localhost:3000](http://localhost:3000)

## Features Included

- ✅ User authentication with Supabase
- ✅ Sidebar with hierarchical folder organization
- ✅ Drag and drop chat management
- ✅ Folder creation, renaming, and deletion
- ✅ Chat creation, renaming, and moving between folders
- ✅ Chat interface with OpenAI integration (GPT-4o-mini)
- ✅ File upload support (PDF, DOCX, images, text files)
- ✅ Web search capabilities with DuckDuckGo integration
- ✅ Canvas mode for content editing and iteration
- ✅ Message persistence in database with full-text search
- ✅ Real-time UI updates
- ✅ Responsive design with Tailwind CSS
- ✅ TypeScript for type safety
- ✅ Row-level security policies

## What's Working

1. **Authentication**: Sign up/sign in functionality with middleware protection
2. **Folder Management**: Create, rename, delete folders with drag-and-drop organization
3. **Chat Management**: Create, rename, delete, and move chats between folders
4. **Chat Interface**: Real-time chat with AI supporting multiple modes:
   - General conversation
   - Web search integration
   - Canvas mode for document editing
   - File upload and analysis
5. **Database**: Full message persistence with file attachments
6. **Search**: Full-text search across all messages
7. **Security**: Comprehensive RLS policies protecting user data
8. **Performance**: Optimized with indexes and materialized views

## UI Features

- **Sidebar Navigation**: Collapsible folder tree with chat organization
- **Inline Editing**: Click to rename folders and chats
- **Visual Indicators**: Chat type icons, pinned status, folder colors
- **Hover Actions**: Clean interface with actions appearing on hover
- **Drag & Drop**: Move chats between folders effortlessly
- **Empty States**: Helpful messages when no content exists

## Database Schema

The application uses a sophisticated database schema with:
- **Users & Profiles**: User management with role-based permissions
- **Folders**: Hierarchical organization with circular reference prevention
- **Chats**: Conversations with metadata, sharing, and statistics
- **Messages**: Full message history with attachments and search
- **Security**: Advanced RLS policies with moderation capabilities