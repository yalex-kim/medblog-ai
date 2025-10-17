import OpenAI from 'openai';
import { NextRequest, NextResponse } from 'next/server';
import { uploadImageFromBuffer, saveImageMetadata } from '@/lib/image-storage';
import { generateImagePrompt, parseImageType, ImageType } from '@/lib/image-prompts';
import { supabaseAdmin } from '@/lib/supabase';

export async function POST(request: NextRequest) {
  const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
  });
  try {
    const { keywords, topic, description, text, index, blogPostId, replaceExisting, promptId } = await request.json();

    console.log('🔍 Request data:', {
      hasBlogPostId: !!blogPostId,
      blogPostId,
      hasKeywords: !!keywords,
      keywordCount: keywords?.length || 0,
      hasDescription: !!description,
    });

    // Single image generation (for regeneration)
    if (description !== undefined && index !== undefined) {
      console.log('🎨 Regenerating image for:', description);

      // If replaceExisting is true, delete old image first
      if (replaceExisting && blogPostId && promptId) {
        try {
          console.log('🗑️ Deleting old image with prompt_id:', promptId);

          // Find and delete existing image with same blog_post_id and prompt_id
          const { data: existingImages, error: fetchError } = await supabaseAdmin
            .from('blog_images')
            .select('id, storage_path')
            .eq('blog_post_id', blogPostId)
            .eq('prompt_id', promptId);

          if (fetchError) {
            console.error('Error fetching existing images:', fetchError);
          } else if (existingImages && existingImages.length > 0) {
            for (const img of existingImages) {
              // Delete from storage
              const { error: storageError } = await supabaseAdmin.storage
                .from('blog-images')
                .remove([img.storage_path]);

              if (storageError) {
                console.error('Error deleting from storage:', storageError);
              }

              // Delete from database
              const { error: dbError } = await supabaseAdmin
                .from('blog_images')
                .delete()
                .eq('id', img.id);

              if (dbError) {
                console.error('Error deleting from database:', dbError);
              } else {
                console.log('✅ Deleted old image:', img.id);
              }
            }
          }
        } catch (deleteError) {
          console.error('Error during image deletion:', deleteError);
          // Continue with generation even if deletion fails
        }
      }

      // Parse image type from description
      const { type, description: cleanDescription } = parseImageType(description);

      // Generate typed prompt
      const prompt = generateImagePrompt(type, topic, cleanDescription, text);

      const response = await openai.images.generate({
        model: "gpt-image-1",
        prompt: prompt,
        n: 1,
        size: "1024x1024",
        style: "natural",
      });

      // gpt-image-1 returns b64_json by default
      const b64Image = response.data?.[0]?.b64_json;

      if (!b64Image) {
        throw new Error('No image data received from OpenAI');
      }

      // Convert base64 to buffer and upload to Supabase
      let finalImageUrl = '';
      if (blogPostId && b64Image) {
        try {
          const imageBuffer = Buffer.from(b64Image, 'base64');
          finalImageUrl = await uploadImageFromBuffer(imageBuffer);

          // Extract storage path from URL for metadata
          const urlParts = finalImageUrl.split('/');
          const storagePath = urlParts[urlParts.length - 1];

          // Save metadata to database
          await saveImageMetadata(
            blogPostId,
            description,
            text || '',
            storagePath,
            finalImageUrl,
            prompt,
            index, // Pass order index
            type, // Pass image type
            promptId // Pass prompt ID
          );

          console.log('✅ Image uploaded to storage:', finalImageUrl);
        } catch (uploadError) {
          console.error('Failed to upload image, using temporary URL:', uploadError);
          // Fall back to temporary URL if upload fails
        }
      }

      return NextResponse.json({
        image: {
          keyword: cleanDescription,
          url: finalImageUrl,
          prompt: prompt,
          type: type,
        },
        index,
      });
    }

    // Batch image generation
    if (!keywords || keywords.length === 0) {
      return NextResponse.json(
        { error: '이미지 키워드를 입력해주세요.' },
        { status: 400 }
      );
    }

    console.log('🎨 Generating images for keywords:', keywords);

    // Generate images for each keyword
    const imagePromises = keywords.map(async (keyword: string | {type?: string, description: string, text: string, id?: string}, idx: number) => {
      // Handle both string and object formats
      const visualDescription = typeof keyword === 'string' ? keyword : keyword.description;
      const textContent = typeof keyword === 'object' && keyword !== null ? keyword.text : '';
      const imageType = typeof keyword === 'object' && keyword !== null && keyword.type ? keyword.type : '';
      const promptId = typeof keyword === 'object' && keyword !== null && keyword.id ? keyword.id : undefined;

      // Parse image type from description (supports both TYPE|description format and separate type field)
      const { type, description: cleanDescription } = imageType
        ? { type: imageType as ImageType, description: visualDescription }
        : parseImageType(visualDescription);

      // Generate typed prompt
      const prompt = generateImagePrompt(type, topic, cleanDescription, textContent);

      const response = await openai.images.generate({
        model: "gpt-image-1",
        prompt: prompt,
        n: 1,
        size: "1024x1024",
        style: "natural",
      });

      // gpt-image-1 returns b64_json by default
      const b64Image = response.data?.[0]?.b64_json;

      if (!b64Image) {
        throw new Error('No image data received from OpenAI');
      }

      // Convert base64 to buffer and upload to Supabase
      let finalImageUrl = '';
      if (blogPostId && b64Image) {
        try {
          const imageBuffer = Buffer.from(b64Image, 'base64');
          finalImageUrl = await uploadImageFromBuffer(imageBuffer);

          // Extract storage path from URL for metadata
          const urlParts = finalImageUrl.split('/');
          const storagePath = urlParts[urlParts.length - 1];

          // Save metadata to database
          await saveImageMetadata(
            blogPostId,
            visualDescription,
            textContent,
            storagePath,
            finalImageUrl,
            prompt,
            idx, // Pass order index
            type, // Pass image type
            promptId // Pass prompt ID
          );

          console.log('✅ Image uploaded to storage:', finalImageUrl);
        } catch (uploadError) {
          console.error('Failed to upload image, using temporary URL:', uploadError);
          // Fall back to temporary URL if upload fails
        }
      }

      return {
        keyword: cleanDescription,
        text: textContent,
        url: finalImageUrl,
        prompt: prompt,
        type: type,
      };
    });

    const images = await Promise.all(imagePromises);

    console.log('✅ Generated', images.length, 'images');

    return NextResponse.json({ images });
  } catch (error: unknown) {
    console.error('Error generating images:', error);
    const errorMessage = error instanceof Error ? error.message : '이미지 생성 중 오류가 발생했습니다.';
    return NextResponse.json(
      { error: errorMessage },
      { status: 500 }
    );
  }
}
