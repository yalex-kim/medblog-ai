-- Add display_order column to blog_images table
-- This column tracks the order in which images should be displayed based on their position in the blog content

ALTER TABLE blog_images
ADD COLUMN IF NOT EXISTS display_order INTEGER;

-- Add comment to explain the column
COMMENT ON COLUMN blog_images.display_order IS 'Order index for displaying images in sequence (0-based)';
