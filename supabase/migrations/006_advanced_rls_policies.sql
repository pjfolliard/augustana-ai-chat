-- Migration: 006_advanced_rls_policies.sql
-- Description: Advanced RLS policies for enhanced security and sharing
-- Created: 2025-01-24

-- Create additional security functions
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE id = auth.uid() AND role = 'admin'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION public.is_moderator_or_admin()
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE id = auth.uid() AND role IN ('admin', 'moderator')
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Enhanced RLS policies for profiles with admin access
DROP POLICY IF EXISTS "Users can view own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can insert own profile" ON public.profiles;

-- Profiles policies
CREATE POLICY "Users can view own profile" ON public.profiles
  FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Admins can view all profiles" ON public.profiles
  FOR SELECT USING (public.is_admin());

CREATE POLICY "Users can update own profile" ON public.profiles
  FOR UPDATE USING (auth.uid() = id);

CREATE POLICY "Admins can update any profile" ON public.profiles
  FOR UPDATE USING (public.is_admin());

CREATE POLICY "Users can insert own profile" ON public.profiles
  FOR INSERT WITH CHECK (auth.uid() = id);

CREATE POLICY "Admins can delete profiles" ON public.profiles
  FOR DELETE USING (public.is_admin());

-- Enhanced RLS policies for folders with collaboration support
DROP POLICY IF EXISTS "Users can view own folders" ON public.folders;
DROP POLICY IF EXISTS "Users can create own folders" ON public.folders;
DROP POLICY IF EXISTS "Users can update own folders" ON public.folders;
DROP POLICY IF EXISTS "Users can delete own folders" ON public.folders;

-- Folders policies
CREATE POLICY "Users can view own folders" ON public.folders
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can create own folders" ON public.folders
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own folders" ON public.folders
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own folders" ON public.folders
  FOR DELETE USING (auth.uid() = user_id);

CREATE POLICY "Admins can manage all folders" ON public.folders
  FOR ALL USING (public.is_admin());

-- Enhanced RLS policies for chats with advanced sharing
DROP POLICY IF EXISTS "Users can view own chats" ON public.chats;
DROP POLICY IF EXISTS "Users can view shared chats" ON public.chats;
DROP POLICY IF EXISTS "Users can create own chats" ON public.chats;
DROP POLICY IF EXISTS "Users can update own chats" ON public.chats;
DROP POLICY IF EXISTS "Users can delete own chats" ON public.chats;

-- Chats policies
CREATE POLICY "Users can view own chats" ON public.chats
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can view publicly shared chats" ON public.chats
  FOR SELECT USING (is_shared = TRUE);

CREATE POLICY "Users can create own chats" ON public.chats
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own chats" ON public.chats
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own chats" ON public.chats
  FOR DELETE USING (auth.uid() = user_id);

CREATE POLICY "Moderators can view reported chats" ON public.chats
  FOR SELECT USING (
    public.is_moderator_or_admin() AND 
    metadata->>'reported' = 'true'
  );

CREATE POLICY "Admins can manage all chats" ON public.chats
  FOR ALL USING (public.is_admin());

-- Enhanced RLS policies for messages with advanced permissions
DROP POLICY IF EXISTS "Users can view messages from own chats" ON public.messages;
DROP POLICY IF EXISTS "Users can view messages from shared chats" ON public.messages;
DROP POLICY IF EXISTS "Users can create messages in own chats" ON public.messages;
DROP POLICY IF EXISTS "Users can update own messages" ON public.messages;
DROP POLICY IF EXISTS "Users can delete own messages" ON public.messages;

-- Messages policies
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
    ) AND NOT is_deleted
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
    ) AND role = 'user'  -- Only user messages can be edited
  );

CREATE POLICY "Users can soft delete own messages" ON public.messages
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM public.chats c 
      WHERE c.id = chat_id AND c.user_id = auth.uid()
    )
  )
  WITH CHECK (
    -- Only allow setting is_deleted = true, not false
    (OLD.is_deleted = FALSE AND NEW.is_deleted = TRUE) OR
    (OLD.is_deleted = NEW.is_deleted)
  );

CREATE POLICY "Moderators can view reported messages" ON public.messages
  FOR SELECT USING (
    public.is_moderator_or_admin() AND 
    (metadata->>'reported' = 'true' OR 
     EXISTS (
       SELECT 1 FROM public.chats c 
       WHERE c.id = chat_id AND c.metadata->>'reported' = 'true'
     ))
  );

CREATE POLICY "Admins can manage all messages" ON public.messages
  FOR ALL USING (public.is_admin());

-- Create additional security views for safe data access
CREATE OR REPLACE VIEW public.safe_profiles AS
SELECT 
  id,
  email,
  name,
  avatar_url,
  role,
  created_at
FROM public.profiles;

CREATE OR REPLACE VIEW public.public_chats AS
SELECT 
  c.id,
  c.title,
  c.description,
  c.type,
  c.created_at,
  c.message_count,
  c.last_message_at,
  p.name as owner_name
FROM public.chats c
JOIN public.profiles p ON p.id = c.user_id
WHERE c.is_shared = TRUE AND NOT c.is_archived;

-- Function to check if a user can access a specific chat
CREATE OR REPLACE FUNCTION public.can_access_chat(chat_uuid UUID)
RETURNS BOOLEAN AS $$
DECLARE
  chat_record RECORD;
BEGIN
  SELECT user_id, is_shared INTO chat_record
  FROM public.chats 
  WHERE id = chat_uuid;
  
  IF NOT FOUND THEN
    RETURN FALSE;
  END IF;
  
  -- User owns the chat or it's publicly shared
  RETURN (chat_record.user_id = auth.uid()) OR 
         (chat_record.is_shared = TRUE) OR
         public.is_admin();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to report inappropriate content
CREATE OR REPLACE FUNCTION public.report_chat(
  p_chat_id UUID,
  p_reason TEXT
)
RETURNS BOOLEAN AS $$
DECLARE
  current_metadata JSONB;
BEGIN
  -- Only allow reporting of shared chats that user doesn't own
  IF NOT EXISTS (
    SELECT 1 FROM public.chats 
    WHERE id = p_chat_id 
      AND is_shared = TRUE 
      AND user_id != auth.uid()
  ) THEN
    RAISE EXCEPTION 'Cannot report this chat';
  END IF;
  
  -- Get current metadata
  SELECT metadata INTO current_metadata
  FROM public.chats
  WHERE id = p_chat_id;
  
  -- Add report to metadata
  current_metadata := COALESCE(current_metadata, '{}'::jsonb) || 
    jsonb_build_object(
      'reported', 'true',
      'report_reason', p_reason,
      'reported_by', auth.uid(),
      'reported_at', NOW()
    );
  
  UPDATE public.chats
  SET metadata = current_metadata
  WHERE id = p_chat_id;
  
  RETURN FOUND;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to moderate reported content (admin/moderator only)
CREATE OR REPLACE FUNCTION public.moderate_chat(
  p_chat_id UUID,
  p_action TEXT, -- 'approve', 'hide', 'delete'
  p_notes TEXT DEFAULT NULL
)
RETURNS BOOLEAN AS $$
DECLARE
  current_metadata JSONB;
BEGIN
  -- Check if user is moderator or admin
  IF NOT public.is_moderator_or_admin() THEN
    RAISE EXCEPTION 'Access denied: moderator privileges required';
  END IF;
  
  -- Get current metadata
  SELECT metadata INTO current_metadata
  FROM public.chats
  WHERE id = p_chat_id;
  
  -- Update metadata with moderation action
  current_metadata := COALESCE(current_metadata, '{}'::jsonb) || 
    jsonb_build_object(
      'moderated', 'true',
      'moderation_action', p_action,
      'moderated_by', auth.uid(),
      'moderated_at', NOW(),
      'moderation_notes', p_notes
    );
  
  -- Perform the action
  CASE p_action
    WHEN 'approve' THEN
      UPDATE public.chats
      SET metadata = current_metadata - 'reported'
      WHERE id = p_chat_id;
    
    WHEN 'hide' THEN
      UPDATE public.chats
      SET 
        is_shared = FALSE,
        metadata = current_metadata
      WHERE id = p_chat_id;
    
    WHEN 'delete' THEN
      UPDATE public.chats
      SET 
        is_archived = TRUE,
        is_shared = FALSE,
        metadata = current_metadata
      WHERE id = p_chat_id;
    
    ELSE
      RAISE EXCEPTION 'Invalid moderation action: %', p_action;
  END CASE;
  
  RETURN FOUND;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Add rate limiting for chat creation
CREATE OR REPLACE FUNCTION public.check_chat_creation_limit()
RETURNS TRIGGER AS $$
DECLARE
  recent_chat_count INTEGER;
  user_role_val user_role;
  max_chats INTEGER;
BEGIN
  -- Get user role
  SELECT role INTO user_role_val
  FROM public.profiles
  WHERE id = NEW.user_id;
  
  -- Set limits based on role
  CASE user_role_val
    WHEN 'admin' THEN max_chats := 1000;
    WHEN 'moderator' THEN max_chats := 500;
    ELSE max_chats := 100;
  END CASE;
  
  -- Count chats created in the last hour
  SELECT COUNT(*) INTO recent_chat_count
  FROM public.chats
  WHERE user_id = NEW.user_id
    AND created_at >= NOW() - INTERVAL '1 hour';
  
  IF recent_chat_count >= max_chats THEN
    RAISE EXCEPTION 'Rate limit exceeded: too many chats created recently';
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER chat_creation_rate_limit
  BEFORE INSERT ON public.chats
  FOR EACH ROW
  EXECUTE FUNCTION public.check_chat_creation_limit();

-- Add comments for security documentation
COMMENT ON FUNCTION public.is_admin IS 'Check if current user has admin role';
COMMENT ON FUNCTION public.is_moderator_or_admin IS 'Check if current user has moderator or admin role';
COMMENT ON FUNCTION public.can_access_chat IS 'Check if user can access a specific chat';
COMMENT ON FUNCTION public.report_chat IS 'Report inappropriate chat content';
COMMENT ON FUNCTION public.moderate_chat IS 'Moderate reported content (admin/moderator only)';
COMMENT ON VIEW public.safe_profiles IS 'Safe view of user profiles without sensitive data';
COMMENT ON VIEW public.public_chats IS 'Public view of shared chats';