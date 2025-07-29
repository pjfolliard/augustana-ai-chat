-- Migration: 002_folders.sql
-- Description: Create folders table for organizing chats
-- Created: 2025-01-24

-- Create folders table
CREATE TABLE IF NOT EXISTS public.folders (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  parent_id UUID REFERENCES public.folders(id) ON DELETE CASCADE,
  color TEXT DEFAULT '#6B7280', -- Tailwind gray-500
  icon TEXT DEFAULT 'folder',
  sort_order INTEGER DEFAULT 0,
  is_archived BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add constraints
ALTER TABLE public.folders 
  ADD CONSTRAINT folders_name_not_empty CHECK (trim(name) != ''),
  ADD CONSTRAINT folders_name_length CHECK (char_length(name) <= 100),
  ADD CONSTRAINT folders_color_format CHECK (color ~* '^#[0-9A-Fa-f]{6}$'),
  ADD CONSTRAINT folders_no_self_parent CHECK (id != parent_id);

-- Prevent circular references in folder hierarchy
CREATE OR REPLACE FUNCTION public.check_folder_hierarchy()
RETURNS TRIGGER AS $$
DECLARE
  current_parent_id UUID;
  depth INTEGER := 0;
  max_depth INTEGER := 10; -- Prevent infinite recursion
BEGIN
  -- If no parent, allow
  IF NEW.parent_id IS NULL THEN
    RETURN NEW;
  END IF;
  
  -- Check for circular reference
  current_parent_id := NEW.parent_id;
  
  WHILE current_parent_id IS NOT NULL AND depth < max_depth LOOP
    -- If we find the current folder in the parent chain, it's circular
    IF current_parent_id = NEW.id THEN
      RAISE EXCEPTION 'Circular reference detected in folder hierarchy';
    END IF;
    
    -- Move up the hierarchy
    SELECT parent_id INTO current_parent_id 
    FROM public.folders 
    WHERE id = current_parent_id AND user_id = NEW.user_id;
    
    depth := depth + 1;
  END LOOP;
  
  -- Check max depth
  IF depth >= max_depth THEN
    RAISE EXCEPTION 'Folder hierarchy too deep (max % levels)', max_depth;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for folder hierarchy validation
CREATE TRIGGER folders_hierarchy_check
  BEFORE INSERT OR UPDATE ON public.folders
  FOR EACH ROW
  EXECUTE FUNCTION public.check_folder_hierarchy();

-- Create trigger for updated_at
CREATE TRIGGER folders_updated_at
  BEFORE UPDATE ON public.folders
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();

-- Enable RLS on folders
ALTER TABLE public.folders ENABLE ROW LEVEL SECURITY;

-- RLS Policies for folders
CREATE POLICY "Users can view own folders" ON public.folders
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can create own folders" ON public.folders
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own folders" ON public.folders
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own folders" ON public.folders
  FOR DELETE USING (auth.uid() = user_id);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_folders_user_id ON public.folders(user_id);
CREATE INDEX IF NOT EXISTS idx_folders_parent_id ON public.folders(parent_id);
CREATE INDEX IF NOT EXISTS idx_folders_user_parent ON public.folders(user_id, parent_id);
CREATE INDEX IF NOT EXISTS idx_folders_sort_order ON public.folders(user_id, sort_order);
CREATE INDEX IF NOT EXISTS idx_folders_archived ON public.folders(user_id, is_archived);
CREATE INDEX IF NOT EXISTS idx_folders_created_at ON public.folders(created_at);

-- Create unique constraint for folder names within the same parent
CREATE UNIQUE INDEX idx_folders_unique_name_per_parent 
  ON public.folders(user_id, parent_id, lower(name)) 
  WHERE NOT is_archived;

-- Add comments for documentation
COMMENT ON TABLE public.folders IS 'Hierarchical folders for organizing chats';
COMMENT ON COLUMN public.folders.parent_id IS 'Parent folder ID for nested folder structure';
COMMENT ON COLUMN public.folders.color IS 'Hex color code for folder display';
COMMENT ON COLUMN public.folders.icon IS 'Icon identifier for folder display';
COMMENT ON COLUMN public.folders.sort_order IS 'Manual sort order within parent folder';
COMMENT ON COLUMN public.folders.is_archived IS 'Soft delete flag for folders';

-- Insert default folders for new users
CREATE OR REPLACE FUNCTION public.create_default_folders_for_user(user_uuid UUID)
RETURNS VOID AS $$
BEGIN
  INSERT INTO public.folders (user_id, name, description, color, icon, sort_order) VALUES
    (user_uuid, 'General', 'General conversations', '#6B7280', 'chat', 0),
    (user_uuid, 'Work', 'Work-related chats', '#3B82F6', 'briefcase', 1),
    (user_uuid, 'Research', 'Research and learning', '#10B981', 'academic-cap', 2);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get folder path (breadcrumbs)
CREATE OR REPLACE FUNCTION public.get_folder_path(folder_uuid UUID)
RETURNS TEXT[] AS $$
DECLARE
  path TEXT[] := '{}';
  current_folder RECORD;
  current_id UUID := folder_uuid;
  depth INTEGER := 0;
  max_depth INTEGER := 10;
BEGIN
  WHILE current_id IS NOT NULL AND depth < max_depth LOOP
    SELECT id, name, parent_id INTO current_folder
    FROM public.folders 
    WHERE id = current_id;
    
    IF NOT FOUND THEN
      EXIT;
    END IF;
    
    path := current_folder.name || path;
    current_id := current_folder.parent_id;
    depth := depth + 1;
  END LOOP;
  
  RETURN path;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;