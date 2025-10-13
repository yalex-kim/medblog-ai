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

    const message = await anthropic.messages.create({
      model: 'claude-sonnet-4-5-20250929',
      max_tokens: 10164,
      temperature:1,
      system:"당신은 한국의 병원 블로그 전문 작가입니다.\n\n다음 규칙을 반드시 준수하세요:\n1. 의료법 준수: 과대광고 금지, 단정적 표현 금지\n2. 톤: 따뜻하고 전문적, 환자 입장에서 공감\n3. 구조:\n   - 제목 (궁금증 유발)\n   - 도입부 (공감)\n   - 본문 (3-4개 섹션, 각 섹션은 ## 헤딩으로 시작)\n   - 마무리 (병원 방문 유도, 부드럽게)\n4. 길이: 1500-2000자\n5. 문체: ~입니다 체, 읽기 쉽게 구어체를 조금씩 섞어서(인데요~)\n6. 주의사항은 반드시 포함\n7. 절대 금지: \"최고\", \"유일\", \"완치\", \"100%\" 등\n8. 이미지 제안 (필수):\n   - 본문 중간에 3-5개의 카드뉴스용 이미지 제안을 [이미지: 시각적설명 | 텍스트내용] 형식으로 삽입\n   - 시각적설명: 이미지에 그려질 장면/분위기 (예: 임신부가 편안하게 진료받는 모습)\n   - 텍스트내용: 이미지에 표시될 핵심 메시지 (예: 정기 검진으로 건강한 임신 유지하기)\n   - 예시: [이미지: 병원 상담실에서 의사와 환자가 대화하는 따뜻한 장면 | 궁금한 점은 언제든 상담하세요]\n   - 각 주요 섹션마다 관련 이미지 제안 포함\n   - 텍스트는 간결하고 명확하게 (10-20자)\n9. Naver SEO 최적화",
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

    // Extract image suggestions from content [이미지: visual | text]
    const imageSuggestions: Array<{description: string, text: string, position: number}> = [];
    const imageRegex = /\[이미지:([^\|\]]+)(?:\|([^\]]+))?\]/g;
    let match;

    while ((match = imageRegex.exec(fullContent)) !== null) {
      const visualDescription = match[1].trim();
      const textContent = match[2] ? match[2].trim() : '';
      imageSuggestions.push({
        description: visualDescription,
        text: textContent,
        position: match.index,
      });
    }

    // 이미지 키워드 추출 (기존 방식 유지)
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
    let blogPostId = null;
    if (sessionData) {
      const { data, error } = await supabaseAdmin.from('blog_posts').insert([
        {
          hospital_id: sessionData.id,
          title,
          content,
          topic,
          keywords: keywords?.split(',').map((k: string) => k.trim()) || [],
          image_keywords: imageKeywords,
          posted_to_blog: false,
        },
      ]).select().single();

      if (data && !error) {
        blogPostId = data.id;
      }
    }

    return NextResponse.json({
      content,
      imageKeywords,
      imageSuggestions: imageSuggestions.map(s => ({
        description: s.description,
        text: s.text,
      })),
      blogPostId,
    });
  } catch (error) {
    console.error('Error generating blog:', error);
    return NextResponse.json(
      { error: '블로그 글 생성 중 오류가 발생했습니다.' },
      { status: 500 }
    );
  }
}
