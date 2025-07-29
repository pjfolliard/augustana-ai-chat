-- Migration: 003_chats.sql
-- Description: Create chats table with folder relationships
-- Created: 2025-01-24

-- Create chats table
CREATE TABLE IF NOT EXISTS public.chats (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  folder_id UUID REFERENCES public.folders(id) ON DELETE SET NULL,
  title TEXT NOT NULL DEFAULT 'New Chat',
  description TEXT,
  type chat_type DEFAULT 'general',
  is_pinned BOOLEAN DEFAULT FALSE,
  is_archived BOOLEAN DEFAULT FALSE,
  is_shared BOOLEAN DEFAULT FALSE,
  share_token UUID DEFAULT uuid_generate_v4(),
  
  -- Chat settings and metadata
  settings JSONB DEFAULT '{}',
  metadata JSONB DEFAULT '{}',
  
  -- Model and configuration
  model_name TEXT DEFAULT 'gpt-4o-mini',
  model_settings JSONB DEFAULT '{}',
  
  -- Statistics
  message_count INTEGER DEFAULT 0,
  last_message_at TIMESTAMP WITH TIME ZONE,
  
  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add constraints
ALTER TABLE public.chats 
  ADD CONSTRAINT chats_title_not_empty CHECK (trim(title) != ''),
  ADD CONSTRAINT chats_title_length CHECK (char_length(title) <= 200),
  ADD CONSTRAINT chats_message_count_positive CHECK (message_count >= 0),
  ADD CONSTRAINT chats_valid_folder_owner CHECK (
    folder_id IS NULL OR 
    EXISTS (
      SELECT 1 FROM public.folders f 
      WHERE f.id = folder_id AND f.user_id = chats.user_id
    )
  );

-- Create function to update chat statistics
CREATE OR REPLACE FUNCTION public.update_chat_stats()
RETURNS TRIGGER AS $$
BEGIN
  -- Update message count and last message time for the chat
  UPDATE public.chats 
  SET 
    message_count = (
      SELECT COUNT(*) 
      FROM public.messages 
      WHERE chat_id = COALESCE(NEW.chat_id, OLD.chat_id)
    ),
    last_message_at = (
      SELECT MAX(created_at) 
      FROM public.messages 
      WHERE chat_id = COALESCE(NEW.chat_id, OLD.chat_id)
    ),
    updated_at = NOW()
  WHERE id = COALESCE(NEW.chat_id, OLD.chat_id);
  
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

-- Create trigger for updated_at
CREATE TRIGGER chats_updated_at
  BEFORE UPDATE ON public.chats
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();

-- Function to generate smart chat titles
CREATE OR REPLACE FUNCTION public.generate_chat_title(chat_uuid UUID)
RETURNS TEXT AS $$
DECLARE
  first_message TEXT;
  generated_title TEXT;
BEGIN
  -- Get the first user message from the chat
  SELECT content INTO first_message
  FROM public.messages 
  WHERE chat_id = chat_uuid AND role = 'user'
  ORDER BY created_at ASC
  LIMIT 1;
  
  IF first_message IS NULL THEN
    RETURN 'New Chat';
  END IF;
  
  -- Simple title generation (truncate and clean)
  generated_title := trim(substring(first_message from 1 for 50));
  
  -- Remove line breaks and extra spaces
  generated_title := regexp_replace(generated_title, '\s+', ' ', 'g');
  
  -- Add ellipsis if truncated
  IF char_length(first_message) > 50 THEN
    generated_title := generated_title || '...';
  END IF;
  
  RETURN COALESCE(nullif(generated_title, ''), 'New Chat');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to auto-update chat title when first message is added
CREATE OR REPLACE FUNCTION public.auto_update_chat_title()
RETURNS TRIGGER AS $$
BEGIN
  -- Only update title if it's still the default and this is a user message
  IF NEW.role = 'user' THEN
    UPDATE public.chats 
    SET title = public.generate_chat_title(NEW.chat_id)
    WHERE id = NEW.chat_id 
      AND title IN ('New Chat', '')
      AND message_count = 0;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Enable RLS on chats
ALTER TABLE public.chats ENABLE ROW LEVEL SECURITY;

-- RLS Policies for chats
CREATE POLICY "Users can view own chats" ON public.chats
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can view shared chats" ON public.chats
  FOR SELECT USING (is_shared = TRUE);

CREATE POLICY "Users can create own chats" ON public.chats
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own chats" ON public.chats
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own chats" ON public.chats
  FOR DELETE USING (auth.uid() = user_id);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_chats_user_id ON public.chats(user_id);
CREATE INDEX IF NOT EXISTS idx_chats_folder_id ON public.chats(folder_id);
CREATE INDEX IF NOT EXISTS idx_chats_user_folder ON public.chats(user_id, folder_id);
CREATE INDEX IF NOT EXISTS idx_chats_type ON public.chats(user_id, type);
CREATE INDEX IF NOT EXISTS idx_chats_pinned ON public.chats(user_id, is_pinned) WHERE is_pinned = TRUE;
CREATE INDEX IF NOT EXISTS idx_chats_archived ON public.chats(user_id, is_archived);
CREATE INDEX IF NOT EXISTS idx_chats_shared ON public.chats(is_shared, share_token) WHERE is_shared = TRUE;
CREATE INDEX IF NOT EXISTS idx_chats_last_message ON public.chats(user_id, last_message_at DESC NULLS LAST);
CREATE INDEX IF NOT EXISTS idx_chats_created_at ON public.chats(created_at);
CREATE INDEX IF NOT EXISTS idx_chats_updated_at ON public.chats(updated_at);

-- Create unique index for share tokens
CREATE UNIQUE INDEX idx_chats_share_token ON public.chats(share_token) WHERE is_shared = TRUE;

-- Add comments for documentation
COMMENT ON TABLE public.chats IS 'Chat conversations between users and AI';
COMMENT ON COLUMN public.chats.folder_id IS 'Optional folder for organizing chats';
COMMENT ON COLUMN public.chats.type IS 'Type of chat (general, search, canvas, document)';
COMMENT ON COLUMN public.chats.is_pinned IS 'Whether chat is pinned to top of list';
COMMENT ON COLUMN public.chats.is_archived IS 'Soft delete flag for chats';
COMMENT ON COLUMN public.chats.is_shared IS 'Whether chat is publicly shareable';
COMMENT ON COLUMN public.chats.share_token IS 'Unique token for sharing chat publicly';
COMMENT ON COLUMN public.chats.settings IS 'Chat-specific settings and preferences';
COMMENT ON COLUMN public.chats.metadata IS 'Additional metadata for the chat';
COMMENT ON COLUMN public.chats.model_name IS 'AI model used for this chat';
COMMENT ON COLUMN public.chats.model_settings IS 'Model-specific configuration';
COMMENT ON COLUMN public.chats.message_count IS 'Cached count of messages in this chat';
COMMENT ON COLUMN public.chats.last_message_at IS 'Timestamp of most recent message';

-- Function to create a new chat with optional folder
CREATE OR REPLACE FUNCTION public.create_chat(
  p_user_id UUID,
  p_title TEXT DEFAULT 'New Chat',
  p_folder_id UUID DEFAULT NULL,
  p_type chat_type DEFAULT 'general'
)
RETURNS UUID AS $$
DECLARE
  new_chat_id UUID;
BEGIN
  INSERT INTO public.chats (user_id, title, folder_id, type)
  VALUES (p_user_id, p_title, p_folder_id, p_type)
  RETURNING id INTO new_chat_id;
  
  RETURN new_chat_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to move chat to different folder
CREATE OR REPLACE FUNCTION public.move_chat_to_folder(
  p_chat_id UUID,
  p_folder_id UUID DEFAULT NULL
)
RETURNS BOOLEAN AS $$
BEGIN
  UPDATE public.chats 
  SET 
    folder_id = p_folder_id,
    updated_at = NOW()
  WHERE id = p_chat_id 
    AND user_id = auth.uid();
  
  RETURN FOUND;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to duplicate a chat
CREATE OR REPLACE FUNCTION public.duplicate_chat(p_chat_id UUID)
RETURNS UUID AS $$
DECLARE
  original_chat RECORD;
  new_chat_id UUID;
BEGIN
  -- Get original chat details
  SELECT * INTO original_chat
  FROM public.chats 
  WHERE id = p_chat_id AND user_id = auth.uid();
  
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Chat not found or access denied';
  END IF;
  
  -- Create new chat
  INSERT INTO public.chats (
    user_id, folder_id, title, description, type,
    settings, model_name, model_settings
  )
  VALUES (
    original_chat.user_id,
    original_chat.folder_id,
    original_chat.title || ' (Copy)',
    original_chat.description,
    original_chat.type,
    original_chat.settings,
    original_chat.model_name,
    original_chat.model_settings
  )
  RETURNING id INTO new_chat_id;
  
  RETURN new_chat_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;