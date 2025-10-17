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
      system:"당신은 한국의 병원 블로그 전문 작가입니다.\n\n다음 규칙을 반드시 준수하세요:\n1. 의료법 준수: 과대광고 금지, 단정적 표현 금지\n2. 톤: 따뜻하고 전문적, 환자 입장에서 공감\n3. 구조:\n   - 제목 (궁금증 유발)\n   - 도입부 (공감)\n   - 본문 (3-4개 섹션, 각 섹션은 ## 헤딩으로 시작)\n   - 마무리 (병원 방문 유도, 부드럽게)\n4. 길이: 1500-2000자\n5. 문체: ~입니다 체, 읽기 쉽게 구어체를 조금씩 섞어서(인데요~)\n6. 주의사항은 반드시 포함\n7. 절대 금지: \"최고\", \"유일\", \"완치\", \"100%\" 등\n8. 이미지 제안 (필수 - 정확히 5개):\n   - 본문에 정확히 5개의 이미지 제안을 [Type | 이미지 묘사 설명 | text : 텍스트내용] 형식으로 삽입\n   - 필수 타입: INTRO 1개, INFOGRAPHIC 1개, CTA 1개 (나머지 2개는 MEDICAL, LIFESTYLE, WARNING 중 선택)\n   - Type 설명:\n     * INTRO: 도입부 공감 장면 (따뜻하고 친근한 분위기)\n     * MEDICAL: 의학 정보, 검진 설명 (전문적이고 깔끔한)\n     * LIFESTYLE: 생활 가이드, 일상 팁 (실용적이고 밝은)\n     * WARNING: 주의사항, 경고 (주의를 끄는)\n     * CTA: 병원 방문 유도, 상담 권유 (환영하는 분위기)\n     * INFOGRAPHIC: 정보 요약, 체크리스트 (심플하고 구조적)\n   - 형식 규칙:\n     * INTRO와 LIFESTYLE: text 부분 없이 장면만 표현 (예: [INTRO | 여자가 커튼 뒤로 햇살이 비치는 방에서 앉아 배를 감싸쥐며 눈살을 찌푸린 모습])\n     * 나머지 타입: text 부분에 이미지에 들어갈 텍스트 포함 (예: [INFOGRAPHIC | 자궁이 그려진 사진과 함께 자궁근종 의심 증상 나열 | text : 1. 배가 찌릿하게 아프다 2. 생리량이 많아졌다 3. 생리기간이 길어졌다])\n   - 이미지 묘사 설명: 이미지에 그려질 시각적 장면이나 요소를 구체적으로 설명\n   - text : 이미지에 오버레이될 한글 텍스트 (10-30자, INTRO/LIFESTYLE 제외)\n   - 각 주요 섹션마다 관련 이미지 제안을 배치\n9. Naver SEO 최적화",
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

    // Extract image suggestions from content [Type | 이미지 묘사 설명 | text : 텍스트내용]
    const imageSuggestions: Array<{type: string, description: string, text: string, position: number}> = [];
    // Updated regex to match new format with optional "text :" prefix
    const imageRegex = /\[([A-Z]+)\s*\|\s*([^\|\]]+?)(?:\s*\|\s*(?:text\s*:\s*)?([^\]]+))?\]/g;
    let match;

    while ((match = imageRegex.exec(fullContent)) !== null) {
      const imageType = match[1].trim();
      const visualDescription = match[2].trim();
      const textContent = match[3] ? match[3].trim() : '';
      imageSuggestions.push({
        type: imageType,
        description: visualDescription,
        text: textContent,
        position: match.index,
      });
    }

    // Limit to exactly 5 images
    if (imageSuggestions.length > 5) {
      imageSuggestions.splice(5);
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
        type: s.type,
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
