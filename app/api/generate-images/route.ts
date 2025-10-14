import OpenAI from 'openai';
import { NextRequest, NextResponse } from 'next/server';
import { uploadImageFromBuffer, saveImageMetadata } from '@/lib/image-storage';

export async function POST(request: NextRequest) {
  const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
  });
  try {
    const { keywords, topic, description, text, index, blogPostId } = await request.json();

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

      const textInstruction = text
        ? `Include Korean text overlay: "${text}". Make the text large, clear, and readable.`
        : 'No text in image.';

      const prompt = `Create a professional, clean medical illustration for a Korean hospital blog about "${topic}".
Visual scene: ${description}.
${textInstruction}
Style: Modern, friendly, professional healthcare illustration with soft colors suitable for card news.
If text is included, use a clean sans-serif font with good contrast.`;

      const response = await openai.images.generate({
        model: "gpt-image-1",
        prompt: prompt,
        n: 1,
        size: "1024x1024",
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
          finalImageUrl = await uploadImageFromBuffer(imageBuffer, description);

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
            prompt
          );

          console.log('✅ Image uploaded to storage:', finalImageUrl);
        } catch (uploadError) {
          console.error('Failed to upload image, using temporary URL:', uploadError);
          // Fall back to temporary URL if upload fails
        }
      }

      return NextResponse.json({
        image: {
          keyword: description,
          url: finalImageUrl,
          prompt: prompt,
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
    const imagePromises = keywords.map(async (keyword: string | {description: string, text: string}) => {
      // Handle both string and object formats
      const visualDescription = typeof keyword === 'string' ? keyword : keyword.description;
      const textContent = typeof keyword === 'object' && keyword !== null ? keyword.text : '';

      // Create a detailed prompt for medical/hospital blog images
      const textInstruction = textContent
        ? `Include Korean text overlay: "${textContent}". Make the text large, clear, and readable.`
        : 'No text in image.';

      const prompt = `Create a professional, clean medical illustration for a Korean hospital blog about "${topic}".
Visual scene: ${visualDescription}.
${textInstruction}
Style: Modern, friendly, professional healthcare illustration with soft colors suitable for card news.
If text is included, use a clean sans-serif font with good contrast.`;

      const response = await openai.images.generate({
        model: "gpt-image-1",
        prompt: prompt,
        n: 1,
        size: "1024x1024",
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
          finalImageUrl = await uploadImageFromBuffer(imageBuffer, visualDescription);

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
            prompt
          );

          console.log('✅ Image uploaded to storage:', finalImageUrl);
        } catch (uploadError) {
          console.error('Failed to upload image, using temporary URL:', uploadError);
          // Fall back to temporary URL if upload fails
        }
      }

      return {
        keyword: visualDescription,
        text: textContent,
        url: finalImageUrl,
        prompt: prompt,
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
