import Anthropic from '@anthropic-ai/sdk';
import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

function getSession(request: NextRequest) {
  const session = request.cookies.get('session')?.value;
  if (!session) return null;
  try {
    const sessionData = JSON.parse(Buffer.from(session, 'base64').toString());
    if (sessionData.exp < Date.now()) return null;
    return sessionData;
  } catch {
    return null;
  }
}

export async function POST(request: NextRequest) {
  try {
    const sessionData = getSession(request);
    const { topic, keywords } = await request.json();

    if (!topic) {
      return NextResponse.json(
        { error: '주제를 입력해주세요.' },
        { status: 400 }
      );
    }

    const prompt = `당신은 한국의 산부인과 병원 블로그 전문 작가입니다.

주제: ${topic}
키워드: ${keywords || '없음'}

다음 규칙을 반드시 준수하세요:
1. 의료법 준수: 과대광고 금지, 단정적 표현 금지
2. 톤: 따뜻하고 전문적, 환자 입장에서 공감
3. 구조:
   - 제목 (궁금증 유발)
   - 도입부 (공감)
   - 본문 (3-4개 섹션, 각 섹션은 ## 헤딩으로 시작)
   - 마무리 (병원 방문 유도, 부드럽게)
4. 길이: 1500-2000자
5. 문체: ~입니다 체, 읽기 쉽게
6. 주의사항은 반드시 포함
7. 절대 금지: "최고", "유일", "완치", "100%" 등

마지막에 반드시 다음 형식으로 이미지 키워드를 제안하세요:

[이미지 키워드]
- 키워드1
- 키워드2
- 키워드3
- 키워드4
- 키워드5`;

    const message = await anthropic.messages.create({
      model: 'claude-3-5-sonnet-20241022',
      max_tokens: 4000,
      messages: [
        {
          role: 'user',
          content: prompt,
        },
      ],
    });

    const fullContent = message.content[0].type === 'text'
      ? message.content[0].text
      : '';

    // 이미지 키워드 추출
    const keywordMatch = fullContent.match(/\[이미지 키워드\]([\s\S]*?)(?:\n\n|$)/);
    let imageKeywords: string[] = [];
    let content = fullContent;

    if (keywordMatch) {
      const keywordsText = keywordMatch[1];
      imageKeywords = keywordsText
        .split('\n')
        .map(line => line.trim())
        .filter(line => line.startsWith('-'))
        .map(line => line.replace(/^-\s*/, '').trim())
        .filter(Boolean);

      // 본문에서 키워드 섹션 제거
      content = fullContent.replace(/\[이미지 키워드\][\s\S]*$/, '').trim();
    }

    // Extract title from content
    const titleMatch = content.match(/^#\s+(.+)$/m);
    const title = titleMatch ? titleMatch[1] : topic;

    // Save to database if user is logged in
    if (sessionData) {
      await supabaseAdmin.from('blog_posts').insert([
        {
          hospital_id: sessionData.id,
          title,
          content,
          topic,
          keywords: keywords?.split(',').map((k: string) => k.trim()) || [],
          image_keywords: imageKeywords,
          posted_to_blog: false,
        },
      ]);
    }

    return NextResponse.json({
      content,
      imageKeywords,
    });
  } catch (error) {
    console.error('Error generating blog:', error);
    return NextResponse.json(
      { error: '블로그 글 생성 중 오류가 발생했습니다.' },
      { status: 500 }
    );
  }
}
