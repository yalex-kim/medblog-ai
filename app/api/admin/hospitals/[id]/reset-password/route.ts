import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import bcrypt from 'bcryptjs';

function getAdminSession(request: NextRequest) {
  const session = request.cookies.get('admin_session')?.value;
  if (!session) return null;
  try {
    const sessionData = JSON.parse(Buffer.from(session, 'base64').toString());
    if (sessionData.exp < Date.now()) return null;
    if (sessionData.type !== 'admin') return null;
    return sessionData;
  } catch {
    return null;
  }
}

// Reset hospital password
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const adminSession = getAdminSession(request);
    if (!adminSession) {
      return NextResponse.json(
        { error: '관리자 권한이 필요합니다.' },
        { status: 401 }
      );
    }

    const { new_password } = await request.json();

    if (!new_password) {
      return NextResponse.json(
        { error: '새 비밀번호를 입력해주세요.' },
        { status: 400 }
      );
    }

    // Hash the new password
    const password_hash = await bcrypt.hash(new_password, 10);

    // Update hospital password
    const { error } = await supabaseAdmin
      .from('hospitals')
      .update({
        password_hash,
        must_change_password: true, // Force hospital to change on next login
        updated_at: new Date().toISOString(),
      })
      .eq('id', params.id);

    if (error) {
      console.error('Error resetting password:', error);
      return NextResponse.json(
        { error: '비밀번호 재설정에 실패했습니다.' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      message: '비밀번호가 성공적으로 재설정되었습니다.',
    });
  } catch (error) {
    console.error('Error in POST /api/admin/hospitals/[id]/reset-password:', error);
    return NextResponse.json(
      { error: '서버 오류가 발생했습니다.' },
      { status: 500 }
    );
  }
}
