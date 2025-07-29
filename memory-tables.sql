-- Memory System Database Tables
-- Run these SQL commands in your Supabase SQL editor

-- Enable the pgvector extension for semantic search (if not already enabled)
CREATE EXTENSION IF NOT EXISTS vector;

-- User memories table (key-value storage)
CREATE TABLE IF NOT EXISTS user_memories (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
    key TEXT NOT NULL,
    value TEXT NOT NULL,
    category TEXT CHECK (category IN ('preference', 'fact', 'context', 'skill')) DEFAULT 'fact',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(user_id, key)
);

-- Semantic memories table (vector embeddings)
CREATE TABLE IF NOT EXISTS semantic_memories (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
    content TEXT NOT NULL,
    embedding vector(1536), -- OpenAI text-embedding-3-small dimensions
    source_chat_id UUID REFERENCES chats(id) ON DELETE SET NULL,
    source_message_id UUID, -- References messages table if needed
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_user_memories_user_id ON user_memories(user_id);
CREATE INDEX IF NOT EXISTS idx_user_memories_category ON user_memories(user_id, category);
CREATE INDEX IF NOT EXISTS idx_semantic_memories_user_id ON semantic_memories(user_id);

-- Vector similarity search function
CREATE OR REPLACE FUNCTION search_semantic_memories(
    user_id UUID,
    query_embedding vector(1536),
    match_threshold float DEFAULT 0.7,
    match_count int DEFAULT 5
)
RETURNS TABLE (
    id UUID,
    user_id UUID,
    content TEXT,
    embedding vector(1536),
    source_chat_id UUID,
    source_message_id UUID,
    created_at TIMESTAMP WITH TIME ZONE,
    similarity float
)
LANGUAGE plpgsql
AS $$
BEGIN
    RETURN QUERY
    SELECT
        sm.id,
        sm.user_id,
        sm.content,
        sm.embedding,
        sm.source_chat_id,
        sm.source_message_id,
        sm.created_at,
        1 - (sm.embedding <=> query_embedding) as similarity
    FROM semantic_memories sm
    WHERE sm.user_id = search_semantic_memories.user_id
    AND 1 - (sm.embedding <=> query_embedding) > match_threshold
    ORDER BY sm.embedding <=> query_embedding
    LIMIT match_count;
END;
$$;

-- Row Level Security (RLS) policies
ALTER TABLE user_memories ENABLE ROW LEVEL SECURITY;
ALTER TABLE semantic_memories ENABLE ROW LEVEL SECURITY;

-- Policies for user_memories
CREATE POLICY "Users can view their own memories" ON user_memories
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own memories" ON user_memories
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own memories" ON user_memories
    FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own memories" ON user_memories
    FOR DELETE USING (auth.uid() = user_id);

-- Policies for semantic_memories
CREATE POLICY "Users can view their own semantic memories" ON semantic_memories
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own semantic memories" ON semantic_memories
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own semantic memories" ON semantic_memories
    FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own semantic memories" ON semantic_memories
    FOR DELETE USING (auth.uid() = user_id);

-- Trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_user_memories_updated_at
    BEFORE UPDATE ON user_memories
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();