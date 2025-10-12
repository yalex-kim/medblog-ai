import OpenAI from 'openai';
import { NextRequest, NextResponse } from 'next/server';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export async function POST(request: NextRequest) {
  try {
    const { keywords, topic } = await request.json();

    if (!keywords || keywords.length === 0) {
      return NextResponse.json(
        { error: '이미지 키워드를 입력해주세요.' },
        { status: 400 }
      );
    }

    console.log('🎨 Generating images for keywords:', keywords);

    // Generate images for each keyword
    const imagePromises = keywords.map(async (keyword: string) => {
      // Create a detailed prompt for medical/hospital blog images
      const prompt = `Create a professional, clean medical illustration for a Korean hospital blog about "${topic}".
Focus on: ${keyword}.
Style: Modern, friendly, professional healthcare illustration with soft colors.
No text in image. Suitable for blog post.`;

      const response = await openai.images.generate({
        model: "dall-e-3",
        prompt: prompt,
        n: 1,
        size: "1024x1024",
        quality: "standard",
      });

      return {
        keyword,
        url: response.data[0].url,
        prompt: prompt,
      };
    });

    const images = await Promise.all(imagePromises);

    console.log('✅ Generated', images.length, 'images');

    return NextResponse.json({ images });
  } catch (error: any) {
    console.error('Error generating images:', error);
    return NextResponse.json(
      { error: error.message || '이미지 생성 중 오류가 발생했습니다.' },
      { status: 500 }
    );
  }
}
