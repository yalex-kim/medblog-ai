import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';

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

// GET: Fetch recent blog posts (최근 10개)
export async function GET(request: NextRequest) {
  try {
    const sessionData = getSession(request);
    if (!sessionData) {
      return NextResponse.json({ error: '로그인이 필요합니다.' }, { status: 401 });
    }

    const { data: posts, error } = await supabaseAdmin
      .from('blog_posts')
      .select('id, title, topic, created_at, content, image_keywords')
      .eq('hospital_id', sessionData.id)
      .order('created_at', { ascending: false })
      .limit(10);

    if (error) {
      console.error('Error fetching posts:', error);
      return NextResponse.json({ error: '글 목록을 불러오는데 실패했습니다.' }, { status: 500 });
    }

    return NextResponse.json({ posts: posts || [] });
  } catch (error) {
    console.error('Error in GET /api/blog-posts:', error);
    return NextResponse.json({ error: '서버 오류가 발생했습니다.' }, { status: 500 });
  }
}

// PUT: Update blog post content
export async function PUT(request: NextRequest) {
  try {
    const sessionData = getSession(request);
    if (!sessionData) {
      return NextResponse.json({ error: '로그인이 필요합니다.' }, { status: 401 });
    }

    const { id, content } = await request.json();

    if (!id || !content) {
      return NextResponse.json({ error: '글 ID와 내용을 입력해주세요.' }, { status: 400 });
    }

    // Verify ownership
    const { data: post } = await supabaseAdmin
      .from('blog_posts')
      .select('hospital_id')
      .eq('id', id)
      .single();

    if (!post || post.hospital_id !== sessionData.id) {
      return NextResponse.json({ error: '권한이 없습니다.' }, { status: 403 });
    }

    // Update content
    const { error } = await supabaseAdmin
      .from('blog_posts')
      .update({ content })
      .eq('id', id);

    if (error) {
      console.error('Error updating post:', error);
      return NextResponse.json({ error: '글 수정에 실패했습니다.' }, { status: 500 });
    }

    return NextResponse.json({ message: '저장되었습니다.' });
  } catch (error) {
    console.error('Error in PUT /api/blog-posts:', error);
    return NextResponse.json({ error: '서버 오류가 발생했습니다.' }, { status: 500 });
  }
}
