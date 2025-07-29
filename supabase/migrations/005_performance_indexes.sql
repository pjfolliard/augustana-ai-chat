-- Migration: 005_performance_indexes.sql
-- Description: Additional performance indexes and constraints
-- Created: 2025-01-24

-- Additional composite indexes for common query patterns
CREATE INDEX IF NOT EXISTS idx_profiles_role_created ON public.profiles(role, created_at);

-- Folders performance indexes
CREATE INDEX IF NOT EXISTS idx_folders_name_search ON public.folders USING gin(to_tsvector('english', name));
CREATE INDEX IF NOT EXISTS idx_folders_hierarchy_path ON public.folders(user_id, parent_id, sort_order) WHERE NOT is_archived;

-- Chats performance indexes for dashboard queries
CREATE INDEX IF NOT EXISTS idx_chats_recent_activity ON public.chats(user_id, last_message_at DESC NULLS LAST, created_at DESC) WHERE NOT is_archived;
CREATE INDEX IF NOT EXISTS idx_chats_by_type_activity ON public.chats(user_id, type, last_message_at DESC NULLS LAST) WHERE NOT is_archived;
CREATE INDEX IF NOT EXISTS idx_chats_folder_activity ON public.chats(folder_id, last_message_at DESC NULLS LAST) WHERE folder_id IS NOT NULL AND NOT is_archived;

-- Messages performance indexes for pagination and search
CREATE INDEX IF NOT EXISTS idx_messages_chat_pagination ON public.messages(chat_id, created_at DESC, id) WHERE NOT is_deleted;
CREATE INDEX IF NOT EXISTS idx_messages_user_recent ON public.messages(created_at DESC) 
  WHERE role = 'user' AND NOT is_deleted;
CREATE INDEX IF NOT EXISTS idx_messages_with_attachments ON public.messages(chat_id, created_at DESC) 
  WHERE attachments != '[]' AND NOT is_deleted;

-- Partial indexes for frequently filtered data
CREATE INDEX IF NOT EXISTS idx_chats_active_recent ON public.chats(user_id, updated_at DESC) 
  WHERE NOT is_archived AND message_count > 0;
CREATE INDEX IF NOT EXISTS idx_messages_assistant_responses ON public.messages(chat_id, created_at) 
  WHERE role = 'assistant' AND NOT is_deleted;

-- Statistics and analytics indexes
CREATE INDEX IF NOT EXISTS idx_messages_daily_stats ON public.messages(date_trunc('day', created_at), tokens_input, tokens_output)
  WHERE NOT is_deleted;
CREATE INDEX IF NOT EXISTS idx_chats_creation_stats ON public.chats(date_trunc('day', created_at), type);

-- Foreign key indexes for join performance (if not already created)
CREATE INDEX IF NOT EXISTS idx_messages_chat_fk ON public.messages(chat_id) WHERE NOT is_deleted;
CREATE INDEX IF NOT EXISTS idx_chats_folder_fk ON public.chats(folder_id) WHERE folder_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_chats_user_fk ON public.chats(user_id);
CREATE INDEX IF NOT EXISTS idx_folders_parent_fk ON public.folders(parent_id) WHERE parent_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_folders_user_fk ON public.folders(user_id);

-- Unique constraints for data integrity
ALTER TABLE public.chats 
  ADD CONSTRAINT chats_share_token_unique UNIQUE (share_token);

-- Additional check constraints
ALTER TABLE public.folders
  ADD CONSTRAINT folders_sort_order_reasonable CHECK (sort_order >= 0 AND sort_order <= 9999);

ALTER TABLE public.messages
  ADD CONSTRAINT messages_role_content_consistency CHECK (
    (role = 'system' AND content != '') OR
    (role = 'user' AND content != '') OR
    (role = 'assistant' AND content != '')
  );

-- Optimize existing indexes by adding covering columns for common queries
DROP INDEX IF EXISTS idx_chats_user_folder;
CREATE INDEX idx_chats_user_folder_optimized ON public.chats(user_id, folder_id) 
  INCLUDE (title, type, is_pinned, last_message_at, message_count) 
  WHERE NOT is_archived;

DROP INDEX IF EXISTS idx_messages_chat_created;
CREATE INDEX idx_messages_chat_created_optimized ON public.messages(chat_id, created_at DESC) 
  INCLUDE (role, content, attachments) 
  WHERE NOT is_deleted;

-- Add database-level comments for maintenance
COMMENT ON INDEX idx_chats_recent_activity IS 'Optimizes dashboard queries for recent chat activity';
COMMENT ON INDEX idx_messages_chat_pagination IS 'Optimizes message pagination within chats';
COMMENT ON INDEX idx_messages_search IS 'Full-text search index for message content';
COMMENT ON INDEX idx_folders_name_search IS 'Full-text search index for folder names';

-- Create a view for chat statistics (materialized for performance)
CREATE MATERIALIZED VIEW IF NOT EXISTS public.chat_stats AS
SELECT 
  c.user_id,
  c.id as chat_id,
  c.title,
  c.type,
  c.folder_id,
  COUNT(m.id) as actual_message_count,
  MAX(m.created_at) as actual_last_message_at,
  COALESCE(SUM(m.tokens_input), 0) as total_tokens_input,
  COALESCE(SUM(m.tokens_output), 0) as total_tokens_output,
  COUNT(CASE WHEN m.role = 'user' THEN 1 END) as user_message_count,
  COUNT(CASE WHEN m.role = 'assistant' THEN 1 END) as assistant_message_count,
  COUNT(CASE WHEN m.attachments != '[]' THEN 1 END) as messages_with_attachments
FROM public.chats c
LEFT JOIN public.messages m ON m.chat_id = c.id AND NOT m.is_deleted
WHERE NOT c.is_archived
GROUP BY c.user_id, c.id, c.title, c.type, c.folder_id;

-- Index the materialized view
CREATE UNIQUE INDEX idx_chat_stats_pk ON public.chat_stats(chat_id);
CREATE INDEX idx_chat_stats_user ON public.chat_stats(user_id);
CREATE INDEX idx_chat_stats_folder ON public.chat_stats(folder_id) WHERE folder_id IS NOT NULL;

-- Function to refresh chat statistics
CREATE OR REPLACE FUNCTION public.refresh_chat_stats()
RETURNS VOID AS $$
BEGIN
  REFRESH MATERIALIZED VIEW CONCURRENTLY public.chat_stats;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create a function to analyze table sizes and index usage
CREATE OR REPLACE FUNCTION public.get_table_statistics()
RETURNS TABLE (
  table_name TEXT,
  row_count BIGINT,
  total_size TEXT,
  index_size TEXT,
  table_size TEXT
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    schemaname||'.'||tablename as table_name,
    n_tup_ins - n_tup_del as row_count,
    pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) as total_size,
    pg_size_pretty(pg_indexes_size(schemaname||'.'||tablename)) as index_size,
    pg_size_pretty(pg_relation_size(schemaname||'.'||tablename)) as table_size
  FROM pg_stat_user_tables 
  WHERE schemaname = 'public'
  ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;