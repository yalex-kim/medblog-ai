-- ============================================
-- MedBlog AI - Image Storage Setup
-- ============================================
-- This script sets up image storage for blog posts
-- Run this in Supabase SQL Editor

-- 1. Create Storage Bucket for blog images
-- (Run this in Supabase Dashboard > Storage, or via SQL if supported)
-- Bucket name: 'blog-images'
-- Public: true (for easy image access)

-- 2. Create table for storing generated images
CREATE TABLE IF NOT EXISTS blog_images (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  blog_post_id UUID NOT NULL REFERENCES blog_posts(id) ON DELETE CASCADE,
  keyword TEXT NOT NULL,
  text_content TEXT,
  storage_path TEXT NOT NULL,
  public_url TEXT NOT NULL,
  prompt TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_blog_images_post_id ON blog_images(blog_post_id);

-- 4. Enable Row Level Security (RLS)
-- Note: We're using service role key which bypasses RLS, but we enable it for security
ALTER TABLE blog_images ENABLE ROW LEVEL SECURITY;

-- 5. Create RLS policies
-- Since we use service role key (supabaseAdmin), these policies are mainly for additional security
-- Service role bypasses RLS, so these won't affect our API operations

-- Allow public read access to images (since storage bucket is public)
CREATE POLICY "Public images are viewable by everyone"
  ON blog_images
  FOR SELECT
  USING (true);

-- Only service role can insert/delete (via API with proper authentication checks)

-- 6. Storage Policies (if using SQL - otherwise set in Dashboard)
-- Note: Storage policies may need to be set in Supabase Dashboard > Storage > Policies

-- Allow authenticated users to upload images
-- INSERT INTO storage.policies (name, bucket_id, policy_definition)
-- VALUES (
--   'Allow authenticated uploads',
--   'blog-images',
--   '{"role": "authenticated"}'
-- );

-- Allow public read access to images
-- INSERT INTO storage.policies (name, bucket_id, policy_definition)
-- VALUES (
--   'Allow public read',
--   'blog-images',
--   '{"role": "anon"}'
-- );

-- ============================================
-- Manual Steps in Supabase Dashboard:
-- ============================================
-- 1. Go to Storage section
-- 2. Create a new bucket named 'blog-images'
-- 3. Set it as Public
-- 4. (Optional) Configure allowed file types: image/png, image/jpeg, image/webp
-- 5. (Optional) Set max file size: 10MB
