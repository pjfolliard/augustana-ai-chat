-- Migration: 004_messages.sql
-- Description: Create messages table with chat relationships and file attachments
-- Created: 2025-01-24

-- Create messages table
CREATE TABLE IF NOT EXISTS public.messages (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  chat_id UUID NOT NULL REFERENCES public.chats(id) ON DELETE CASCADE,
  role message_role NOT NULL,
  content TEXT NOT NULL,
  
  -- File attachments
  attachments JSONB DEFAULT '[]',
  
  -- Message metadata
  metadata JSONB DEFAULT '{}',
  model_name TEXT,
  
  -- Token usage tracking
  tokens_input INTEGER DEFAULT 0,
  tokens_output INTEGER DEFAULT 0,
  
  -- Message settings
  is_edited BOOLEAN DEFAULT FALSE,
  edit_history JSONB DEFAULT '[]',
  is_deleted BOOLEAN DEFAULT FALSE,
  
  -- Search and indexing
  search_vector tsvector GENERATED ALWAYS AS (
    to_tsvector('english', content)
  ) STORED,
  
  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add constraints
ALTER TABLE public.messages 
  ADD CONSTRAINT messages_content_not_empty CHECK (trim(content) != ''),
  ADD CONSTRAINT messages_content_length CHECK (char_length(content) <= 50000),
  ADD CONSTRAINT messages_tokens_positive CHECK (tokens_input >= 0 AND tokens_output >= 0),
  ADD CONSTRAINT messages_attachments_valid CHECK (
    attachments IS NULL OR (
      jsonb_typeof(attachments) = 'array' AND
      jsonb_array_length(attachments) <= 10
    )
  );

-- Create trigger for updated_at
CREATE TRIGGER messages_updated_at
  BEFORE UPDATE ON public.messages
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();

-- Create trigger to update chat statistics when messages change
CREATE TRIGGER messages_update_chat_stats
  AFTER INSERT OR UPDATE OR DELETE ON public.messages
  FOR EACH ROW
  EXECUTE FUNCTION public.update_chat_stats();

-- Create trigger to auto-update chat title when first message is added
CREATE TRIGGER messages_auto_title_chat
  AFTER INSERT ON public.messages
  FOR EACH ROW
  EXECUTE FUNCTION public.auto_update_chat_title();

-- Enable RLS on messages
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;

-- RLS Policies for messages
CREATE POLICY "Users can view messages from own chats" ON public.messages
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.chats c 
      WHERE c.id = chat_id AND c.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can view messages from shared chats" ON public.messages
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.chats c 
      WHERE c.id = chat_id AND c.is_shared = TRUE
    )
  );

CREATE POLICY "Users can create messages in own chats" ON public.messages
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.chats c 
      WHERE c.id = chat_id AND c.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update own messages" ON public.messages
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM public.chats c 
      WHERE c.id = chat_id AND c.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete own messages" ON public.messages
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM public.chats c 
      WHERE c.id = chat_id AND c.user_id = auth.uid()
    )
  );

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_messages_chat_id ON public.messages(chat_id);
CREATE INDEX IF NOT EXISTS idx_messages_chat_created ON public.messages(chat_id, created_at);
CREATE INDEX IF NOT EXISTS idx_messages_role ON public.messages(chat_id, role);
CREATE INDEX IF NOT EXISTS idx_messages_created_at ON public.messages(created_at);
CREATE INDEX IF NOT EXISTS idx_messages_updated_at ON public.messages(updated_at);
CREATE INDEX IF NOT EXISTS idx_messages_search ON public.messages USING gin(search_vector);
CREATE INDEX IF NOT EXISTS idx_messages_attachments ON public.messages USING gin(attachments) WHERE attachments != '[]';
CREATE INDEX IF NOT EXISTS idx_messages_not_deleted ON public.messages(chat_id, created_at) WHERE is_deleted = FALSE;

-- Create index for token usage analytics
CREATE INDEX IF NOT EXISTS idx_messages_tokens ON public.messages(created_at, tokens_input, tokens_output) WHERE tokens_input > 0 OR tokens_output > 0;

-- Add comments for documentation
COMMENT ON TABLE public.messages IS 'Chat messages between users and AI assistants';
COMMENT ON COLUMN public.messages.role IS 'Message role: user, assistant, or system';
COMMENT ON COLUMN public.messages.attachments IS 'File attachments as JSON array with metadata';
COMMENT ON COLUMN public.messages.metadata IS 'Additional message metadata and context';
COMMENT ON COLUMN public.messages.model_name IS 'AI model used to generate this message';
COMMENT ON COLUMN public.messages.tokens_input IS 'Number of input tokens consumed';
COMMENT ON COLUMN public.messages.tokens_output IS 'Number of output tokens generated';
COMMENT ON COLUMN public.messages.is_edited IS 'Whether message has been edited by user';
COMMENT ON COLUMN public.messages.edit_history IS 'History of message edits';
COMMENT ON COLUMN public.messages.is_deleted IS 'Soft delete flag for messages';
COMMENT ON COLUMN public.messages.search_vector IS 'Full-text search vector for message content';

-- Function to create a new message
CREATE OR REPLACE FUNCTION public.create_message(
  p_chat_id UUID,
  p_role message_role,
  p_content TEXT,
  p_attachments JSONB DEFAULT '[]',
  p_metadata JSONB DEFAULT '{}',
  p_model_name TEXT DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE
  new_message_id UUID;
  chat_owner_id UUID;
BEGIN
  -- Verify user owns the chat
  SELECT user_id INTO chat_owner_id
  FROM public.chats
  WHERE id = p_chat_id;
  
  IF chat_owner_id != auth.uid() THEN
    RAISE EXCEPTION 'Access denied: not your chat';
  END IF;
  
  INSERT INTO public.messages (
    chat_id, role, content, attachments, metadata, model_name
  )
  VALUES (
    p_chat_id, p_role, p_content, p_attachments, p_metadata, p_model_name
  )
  RETURNING id INTO new_message_id;
  
  RETURN new_message_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to edit a message (creates edit history)
CREATE OR REPLACE FUNCTION public.edit_message(
  p_message_id UUID,
  p_new_content TEXT
)
RETURNS BOOLEAN AS $$
DECLARE
  current_content TEXT;
  current_history JSONB;
  chat_owner_id UUID;
BEGIN
  -- Check if user owns the message through chat ownership
  SELECT c.user_id, m.content, m.edit_history
  INTO chat_owner_id, current_content, current_history
  FROM public.messages m
  JOIN public.chats c ON c.id = m.chat_id
  WHERE m.id = p_message_id;
  
  IF chat_owner_id != auth.uid() THEN
    RAISE EXCEPTION 'Access denied: not your message';
  END IF;
  
  -- Add current content to edit history
  current_history := COALESCE(current_history, '[]'::jsonb) || 
    jsonb_build_object(
      'content', current_content,
      'edited_at', NOW()
    );
  
  -- Update the message
  UPDATE public.messages
  SET 
    content = p_new_content,
    is_edited = TRUE,
    edit_history = current_history,
    updated_at = NOW()
  WHERE id = p_message_id;
  
  RETURN FOUND;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to soft delete a message
CREATE OR REPLACE FUNCTION public.delete_message(p_message_id UUID)
RETURNS BOOLEAN AS $$
DECLARE
  chat_owner_id UUID;
BEGIN
  -- Check if user owns the message through chat ownership
  SELECT c.user_id INTO chat_owner_id
  FROM public.messages m
  JOIN public.chats c ON c.id = m.chat_id
  WHERE m.id = p_message_id;
  
  IF chat_owner_id != auth.uid() THEN
    RAISE EXCEPTION 'Access denied: not your message';
  END IF;
  
  UPDATE public.messages
  SET 
    is_deleted = TRUE,
    updated_at = NOW()
  WHERE id = p_message_id;
  
  RETURN FOUND;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to search messages across user's chats
CREATE OR REPLACE FUNCTION public.search_messages(
  p_query TEXT,
  p_limit INTEGER DEFAULT 20,
  p_offset INTEGER DEFAULT 0
)
RETURNS TABLE (
  message_id UUID,
  chat_id UUID,
  chat_title TEXT,
  content TEXT,
  role message_role,
  created_at TIMESTAMP WITH TIME ZONE,
  rank REAL
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    m.id,
    m.chat_id,
    c.title,
    m.content,
    m.role,
    m.created_at,
    ts_rank(m.search_vector, plainto_tsquery('english', p_query)) as rank
  FROM public.messages m
  JOIN public.chats c ON c.id = m.chat_id
  WHERE 
    c.user_id = auth.uid() 
    AND m.is_deleted = FALSE
    AND m.search_vector @@ plainto_tsquery('english', p_query)
  ORDER BY rank DESC, m.created_at DESC
  LIMIT p_limit OFFSET p_offset;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get message statistics for a user
CREATE OR REPLACE FUNCTION public.get_user_message_stats(p_user_id UUID DEFAULT auth.uid())
RETURNS TABLE (
  total_messages BIGINT,
  total_tokens_input BIGINT,
  total_tokens_output BIGINT,
  messages_today BIGINT,
  messages_this_week BIGINT,
  messages_this_month BIGINT
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    COUNT(*)::BIGINT as total_messages,
    COALESCE(SUM(m.tokens_input), 0)::BIGINT as total_tokens_input,
    COALESCE(SUM(m.tokens_output), 0)::BIGINT as total_tokens_output,
    COUNT(CASE WHEN m.created_at >= CURRENT_DATE THEN 1 END)::BIGINT as messages_today,
    COUNT(CASE WHEN m.created_at >= CURRENT_DATE - INTERVAL '7 days' THEN 1 END)::BIGINT as messages_this_week,
    COUNT(CASE WHEN m.created_at >= CURRENT_DATE - INTERVAL '30 days' THEN 1 END)::BIGINT as messages_this_month
  FROM public.messages m
  JOIN public.chats c ON c.id = m.chat_id
  WHERE c.user_id = p_user_id AND m.is_deleted = FALSE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;