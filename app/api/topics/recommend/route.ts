import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import Anthropic from '@anthropic-ai/sdk';

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
    if (!sessionData) {
      return NextResponse.json({ error: '로그인이 필요합니다.' }, { status: 401 });
    }

    // Get hospital info
    const { data: hospital } = await supabaseAdmin
      .from('hospitals')
      .select('*')
      .eq('id', sessionData.id)
      .single();

    if (!hospital) {
      return NextResponse.json({ error: '병원 정보를 찾을 수 없습니다.' }, { status: 404 });
    }

    // Get recent blog posts
    const { data: recentPosts } = await supabaseAdmin
      .from('blog_posts')
      .select('title, topic, created_at')
      .eq('hospital_id', sessionData.id)
      .order('created_at', { ascending: false })
      .limit(10);

    const recentTopics = recentPosts?.map(p => p.topic).join(', ') || '없음';

    const prompt = `당신은 ${hospital.department} 전문 블로그 주제 추천 전문가입니다.

병원 정보:
- 병원명: ${hospital.hospital_name}
- 진료과목: ${hospital.department}
- 주요 진료 항목: ${hospital.main_services?.join(', ') || '없음'}
- 최근 작성한 글 주제: ${recentTopics}

다음 두 카테고리로 각 5개씩, 총 10개의 블로그 주제를 추천해주세요:

1. 정보성 주제 (환자들이 궁금해하는 의료 정보):
   - 건강 정보, 질병 예방, 증상 설명 등
   - 예: "임신 초기 증상과 대처법"

2. 홍보성 주제 (병원의 강점과 진료 소개):
   - 병원 진료 프로그램, 특화 서비스 등
   - 예: "우리 병원의 임신 관리 프로그램"

응답 형식:
[정보성]
1. 주제명
2. 주제명
3. 주제명
4. 주제명
5. 주제명

[홍보성]
1. 주제명
2. 주제명
3. 주제명
4. 주제명
5. 주제명

주의사항:
- 최근 작성한 주제와 중복되지 않게
- 계절/시기를 고려
- 실용적이고 환자들이 관심 가질 만한 주제
- ${hospital.department} 전문 내용으로`;

    const message = await anthropic.messages.create({
      model: 'claude-3-5-sonnet-20241022',
      max_tokens: 2000,
      messages: [{ role: 'user', content: prompt }],
    });

    const content = message.content[0].type === 'text' ? message.content[0].text : '';

    // Parse topics
    const infoMatch = content.match(/\[정보성\]([\s\S]*?)(?=\[홍보성\]|$)/);
    const promoMatch = content.match(/\[홍보성\]([\s\S]*?)$/);

    const parseTopics = (text: string) => {
      return text
        .split('\n')
        .filter(line => /^\d+\./.test(line.trim()))
        .map(line => line.replace(/^\d+\.\s*/, '').trim())
        .filter(Boolean);
    };

    const infoTopics = infoMatch ? parseTopics(infoMatch[1]) : [];
    const promoTopics = promoMatch ? parseTopics(promoMatch[1]) : [];

    return NextResponse.json({
      topics: {
        정보성: infoTopics,
        홍보성: promoTopics,
      },
    });
  } catch (error) {
    console.error('Error recommending topics:', error);
    return NextResponse.json(
      { error: '주제 추천 중 오류가 발생했습니다.' },
      { status: 500 }
    );
  }
}
