-- Migration: Add prompt_id column to blog_images table
-- This migration adds support for prompt ID (#1-#5) to track image-prompt associations
-- Date: 2025-10-18

-- Add prompt_id column to blog_images table
ALTER TABLE blog_images
ADD COLUMN IF NOT EXISTS prompt_id VARCHAR(10);

-- Add comment to explain the column
COMMENT ON COLUMN blog_images.prompt_id IS 'Prompt ID (#1-#5) from blog content to uniquely identify image prompts within a blog post';

-- Create an index on (blog_post_id, prompt_id) for faster lookups
CREATE INDEX IF NOT EXISTS idx_blog_images_post_prompt ON blog_images(blog_post_id, prompt_id);

-- Note: This allows existing images to have NULL prompt_id for backward compatibility
-- New images will always have a prompt_id value
