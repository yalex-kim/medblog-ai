import Anthropic from '@anthropic-ai/sdk';
import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { getSession } from '@/lib/session';
import { checkRateLimit } from '@/lib/rate-limit';
import { parseImageSuggestions } from '@/lib/parse-image-suggestions';
import { parseReferences } from '@/lib/parse-references';
import { DEFAULT_TRUSTED_DOMAINS } from '@/lib/trusted-domains';
import { isTrustedOrigin } from '@/lib/request-security';

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

const MAX_TOPIC_LENGTH = 200;
const MAX_KEYWORDS_LENGTH = 500;
// Upper bound on web_search calls per generation — each call is billed
// separately from token usage ($10 / 1,000 searches), so this caps the
// added cost per post regardless of how eagerly the model searches.
const MAX_WEB_SEARCH_USES = 4;

export async function POST(request: NextRequest) {
  try {
    if (!isTrustedOrigin(request)) {
      return NextResponse.json({ error: '잘못된 요청입니다.' }, { status: 403 });
    }

    const sessionData = getSession(request);
    if (!sessionData) {
      return NextResponse.json({ error: '로그인이 필요합니다.' }, { status: 401 });
    }

    const { allowed, retryAfterSeconds } = checkRateLimit(
      `generate-blog:${sessionData.id}`,
      20,
      60 * 60 * 1000
    );
    if (!allowed) {
      return NextResponse.json(
        { error: '요청이 너무 많습니다. 잠시 후 다시 시도해주세요.' },
        { status: 429, headers: { 'Retry-After': String(retryAfterSeconds) } }
      );
    }

    const { topic, keywords } = await request.json();

    if (!topic || typeof topic !== 'string' || !topic.trim()) {
      return NextResponse.json(
        { error: '주제를 입력해주세요.' },
        { status: 400 }
      );
    }

    if (topic.length > MAX_TOPIC_LENGTH) {
      return NextResponse.json(
        { error: `주제는 ${MAX_TOPIC_LENGTH}자 이내로 입력해주세요.` },
        { status: 400 }
      );
    }

    if (keywords !== undefined && (typeof keywords !== 'string' || keywords.length > MAX_KEYWORDS_LENGTH)) {
      return NextResponse.json(
        { error: '키워드 입력값이 올바르지 않습니다.' },
        { status: 400 }
      );
    }

    // Fetch hospital information
    const { data: hospital } = await supabaseAdmin
      .from('hospitals')
      .select('hospital_name, address, trusted_domains')
      .eq('id', sessionData.id)
      .single();

    const hospitalName = hospital?.hospital_name || '병원';
    const hospitalAddress = hospital?.address || '';
    const allowedDomains = hospital?.trusted_domains?.length
      ? hospital.trusted_domains
      : DEFAULT_TRUSTED_DOMAINS;

    const message = await anthropic.messages.create({
      model: 'claude-sonnet-4-5-20250929',
      max_tokens: 10164,
      temperature:1,
      system:"당신은 한국의 병원 블로그 전문 작가입니다.\n\n다음 규칙을 반드시 준수하세요:\n1. 의료법 준수: 과대광고 금지, 단정적 표현 금지\n2. 톤: 따뜻하고 전문적, 환자 입장에서 공감\n3. 구조:\n   - 제목 (궁금증 유발)\n   - 도입부 (공감)\n   - 본문 (3-4개 섹션, 각 섹션은 ## 헤딩으로 시작)\n   - 마무리 (병원 방문 유도, 부드럽게)\n4. 길이: 1500-2000자\n5. 문체: ~입니다 체, 읽기 쉽게 구어체를 조금씩 섞어서(인데요~)\n6. 주의사항은 반드시 포함\n7. 절대 금지: \"최고\", \"유일\", \"완치\", \"100%\" 등\n8. 이미지 제안 (필수 - 정확히 5개):\n   - 본문에 정확히 5개의 이미지 제안을 [#번호 | Type | 이미지 묘사 설명 | text : 텍스트내용] 형식으로 삽입\n   - 번호는 반드시 #1, #2, #3, #4, #5 순서대로 작성 (글마다 고유 식별자)\n   - 필수 타입: INTRO 1개, INFOGRAPHIC 1개, CTA 1개 (나머지 2개는 MEDICAL, LIFESTYLE, WARNING 중 선택)\n   - Type 설명:\n     * INTRO: 도입부 공감 장면 (따뜻하고 친근한 분위기)\n     * MEDICAL: 의학 정보, 검진 설명 (전문적이고 깔끔한)\n     * LIFESTYLE: 생활 가이드, 일상 팁 (실용적이고 밝은)\n     * WARNING: 주의사항, 경고 (주의를 끄는)\n     * CTA: 병원 방문 유도, 상담 권유 (환영하는 분위기)\n     * INFOGRAPHIC: 정보 요약, 체크리스트 (심플하고 구조적)\n   - 형식 규칙:\n     * INTRO와 LIFESTYLE: text 부분 없이 장면만 표현 (예: [#1 | INTRO | 여자가 커튼 뒤로 햇살이 비치는 방에서 앉아 배를 감싸쥐며 눈살을 찌푸린 모습])\n     * 나머지 타입: text 부분에 이미지에 들어갈 텍스트 포함 (예: [#2 | INFOGRAPHIC | 자궁이 그려진 사진과 함께 자궁근종 의심 증상 나열 | text : 1. 배가 찌릿하게 아프다 2. 생리량이 많아졌다 3. 생리기간이 길어졌다])\n   - 이미지 묘사 설명: 이미지에 그려질 시각적 장면이나 요소를 구체적으로 설명\n   - text : 이미지에 오버레이될 한글 텍스트 (10-30자, INTRO/LIFESTYLE 제외)\n   - 각 주요 섹션마다 관련 이미지 제안을 배치\n9. Naver SEO 최적화\n10. 신뢰할 수 있는 자료 활용:\n   - 질환 설명, 증상, 진단 기준, 치료법, 약물 정보 등 의학적 사실을 서술하기 전에 web_search 도구로 반드시 확인하라 (알고 있는 지식만으로 단정하지 마라)\n   - web_search로 실제 확인된 URL만 인용하라. 존재를 확인하지 못한 URL은 절대 만들어내지 마라\n   - 관련 자료를 찾지 못했다면 그 사실을 본문에 드러내지 말고, 참고자료 항목에서 조용히 생략하라\n   - 글의 맨 마지막(이미지 제안 다음 줄)에 실제로 검색해서 확인한 자료만 아래 형식으로 정리하라. 확인된 자료가 하나도 없으면 이 섹션 자체를 생략하라:\n     [참고자료]\n     - 출처명: 실제 URL\n     - 출처명: 실제 URL",
      tools: [
        {
          type: 'web_search_20250305',
          name: 'web_search',
          max_uses: MAX_WEB_SEARCH_USES,
          allowed_domains: allowedDomains,
        },
      ],
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

    // With web_search enabled, message.content also carries server_tool_use /
    // web_search_tool_result blocks alongside text — join every text block
    // rather than assuming content[0] is text.
    const fullContent = message.content
      .filter((block): block is Anthropic.TextBlock => block.type === 'text')
      .map(block => block.text)
      .join('');

    // Extract image suggestions from content [#번호 | Type | 이미지 묘사 설명 | text : 텍스트내용]
    const imageSuggestions = parseImageSuggestions(fullContent);

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

    // 참고자료 섹션 추출 및 본문에서 제거 (web_search로 확인한 출처)
    const referencesResult = parseReferences(content);
    content = referencesResult.content;
    const references = referencesResult.references;

    // Extract title from content
    const titleMatch = content.match(/^#\s+(.+)$/m);
    const title = titleMatch ? titleMatch[1] : topic;

    // Save to database
    let blogPostId = null;
    const { data, error } = await supabaseAdmin.from('blog_posts').insert([
      {
        hospital_id: sessionData.id,
        title,
        content,
        topic,
        keywords: keywords?.split(',').map((k: string) => k.trim()) || [],
        image_keywords: imageKeywords,
        reference_links: references,
        posted_to_blog: false,
      },
    ]).select().single();

    if (data && !error) {
      blogPostId = data.id;
    }

    return NextResponse.json({
      content,
      imageKeywords,
      references,
      imageSuggestions: imageSuggestions.map(s => ({
        id: s.id,
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
