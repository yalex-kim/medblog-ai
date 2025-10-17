-- Migration: Add image_type column to blog_images table
-- This migration adds support for storing image type (INTRO, MEDICAL, LIFESTYLE, WARNING, CTA, INFOGRAPHIC)
-- Date: 2025-10-18

-- Add image_type column to blog_images table
ALTER TABLE blog_images
ADD COLUMN IF NOT EXISTS image_type VARCHAR(20);

-- Add comment to explain the column
COMMENT ON COLUMN blog_images.image_type IS 'Type of image: INTRO, MEDICAL, LIFESTYLE, WARNING, CTA, or INFOGRAPHIC';

-- Optional: Create an index on image_type for faster queries if needed
CREATE INDEX IF NOT EXISTS idx_blog_images_type ON blog_images(image_type);

-- Optional: Add a check constraint to ensure only valid types are stored
-- Uncomment the following lines if you want to enforce type validation at the database level
-- ALTER TABLE blog_images
-- ADD CONSTRAINT check_image_type CHECK (
--   image_type IS NULL OR
--   image_type IN ('INTRO', 'MEDICAL', 'LIFESTYLE', 'WARNING', 'CTA', 'INFOGRAPHIC')
-- );
