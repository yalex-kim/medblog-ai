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

    console.log('🚀 API called with topic:', topic);

    if (!topic) {
      return NextResponse.json(
        { error: '주제를 입력해주세요.' },
        { status: 400 }
      );
    }

    // Fetch hospital information
    let hospitalName = '병원';
    let hospitalAddress = '';

    if (sessionData) {
      const { data: hospital } = await supabaseAdmin
        .from('hospitals')
        .select('hospital_name, address')
        .eq('id', sessionData.id)
        .single();

      if (hospital) {
        hospitalName = hospital.hospital_name || '병원';
        hospitalAddress = hospital.address || '';
      }
    }

    console.log('🏥 Hospital info:', { hospitalName, hospitalAddress });
    console.log('📞 Calling Claude API...');

    const message = await anthropic.messages.create({
      model: 'claude-sonnet-4-5-20250929',
      max_tokens: 10164,
      temperature:1,
      system:"당신은 한국의 병원 블로그 전문 작가입니다.\n\n다음 규칙을 반드시 준수하세요:\n1. 의료법 준수: 과대광고 금지, 단정적 표현 금지\n2. 톤: 따뜻하고 전문적, 환자 입장에서 공감\n3. 구조:\n   - 제목 (궁금증 유발)\n   - 도입부 (공감)\n   - 본문 (3-4개 섹션, 각 섹션은 ## 헤딩으로 시작)\n   - 마무리 (병원 방문 유도, 부드럽게)\n4. 길이: 1500-2000자\n5. 문체: ~입니다 체, 읽기 쉽게 구어체를 조금씩 섞어서(인데요~)\n6. 주의사항은 반드시 포함\n7. 절대 금지: \"최고\", \"유일\", \"완치\", \"100%\" 등\n8. 이미지 제안\n    글 중간에 관련 이미지 및 카드뉴스의 위치 및 내용을 제안. ([] 중괄호로 표시)\n9. Naver SEO 최적화",
      messages: [
        {
          "role": 'user',
          "content": [
            {
              "type": "text",
              "text": `병원 이름 : ${hospitalName}\n병원 위치 : ${hospitalAddress}\n주제 : ${topic}`
            },
          ]
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
