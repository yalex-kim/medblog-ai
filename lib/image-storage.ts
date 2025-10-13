import { supabaseAdmin } from './supabase';

/**
 * Downloads an image from a URL and uploads it to Supabase Storage
 * @param imageUrl - The temporary DALL-E image URL
 * @param fileName - The file name to save as (without extension)
 * @returns The public URL of the uploaded image
 */
export async function uploadImageToStorage(
  imageUrl: string,
  fileName: string
): Promise<string> {
  try {
    console.log('📥 Starting image download from:', imageUrl);

    // 1. Download the image from OpenAI
    const response = await fetch(imageUrl);
    if (!response.ok) {
      throw new Error(`Failed to download image: ${response.status} ${response.statusText}`);
    }

    const blob = await response.blob();
    console.log('📦 Downloaded blob size:', blob.size, 'bytes, type:', blob.type);

    if (blob.size < 1000) {
      throw new Error(`Downloaded file too small (${blob.size} bytes). Likely not a valid image.`);
    }

    const arrayBuffer = await blob.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // 2. Generate a unique file name
    const timestamp = Date.now();
    const sanitizedFileName = fileName.replace(/[^a-z0-9가-힣]/gi, '_').substring(0, 50);
    const storagePath = `${timestamp}_${sanitizedFileName}.png`;

    console.log('📝 Storage path:', storagePath);

    // 3. Upload to Supabase Storage
    const { error } = await supabaseAdmin.storage
      .from('blog-images')
      .upload(storagePath, buffer, {
        contentType: 'image/png',
        upsert: false,
      });

    if (error) {
      console.error('❌ Supabase upload error:', error);
      throw new Error(`Failed to upload to storage: ${error.message}`);
    }

    console.log('✅ Uploaded to Supabase Storage successfully');

    // 4. Get public URL
    const { data: urlData } = supabaseAdmin.storage
      .from('blog-images')
      .getPublicUrl(storagePath);

    console.log('🔗 Public URL:', urlData.publicUrl);

    return urlData.publicUrl;
  } catch (error) {
    console.error('💥 Error uploading image to storage:', error);
    throw error;
  }
}

/**
 * Saves image metadata to the database
 */
export async function saveImageMetadata(
  blogPostId: string,
  keyword: string,
  textContent: string,
  storagePath: string,
  publicUrl: string,
  prompt: string
) {
  const { error } = await supabaseAdmin
    .from('blog_images')
    .insert({
      blog_post_id: blogPostId,
      keyword,
      text_content: textContent,
      storage_path: storagePath,
      public_url: publicUrl,
      prompt,
    });

  if (error) {
    console.error('Error saving image metadata:', error);
    throw error;
  }
}

/**
 * Fetches all images for a blog post
 */
export async function getImagesForPost(blogPostId: string) {
  const { data, error } = await supabaseAdmin
    .from('blog_images')
    .select('*')
    .eq('blog_post_id', blogPostId)
    .order('created_at', { ascending: true });

  if (error) {
    console.error('Error fetching images:', error);
    throw error;
  }

  return data || [];
}

/**
 * Deletes an image from storage and database
 */
export async function deleteImage(imageId: string, storagePath: string) {
  // Delete from storage
  const { error: storageError } = await supabaseAdmin.storage
    .from('blog-images')
    .remove([storagePath]);

  if (storageError) {
    console.error('Error deleting from storage:', storageError);
  }

  // Delete from database
  const { error: dbError } = await supabaseAdmin
    .from('blog_images')
    .delete()
    .eq('id', imageId);

  if (dbError) {
    console.error('Error deleting from database:', dbError);
    throw dbError;
  }
}
