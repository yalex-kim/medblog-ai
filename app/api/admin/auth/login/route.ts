import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import bcrypt from 'bcryptjs';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const username = body.username?.trim();
    const password = body.password?.trim();

    console.log('🔐 Admin login attempt:', {
      username,
      hasPassword: !!password,
      passwordLength: password?.length,
      passwordChars: password?.split('').map(c => c.charCodeAt(0))
    });

    if (!username || !password) {
      console.log('❌ Missing credentials');
      return NextResponse.json(
        { error: 'ID와 비밀번호를 입력해주세요.' },
        { status: 400 }
      );
    }

    // Fetch admin from database
    const { data: admin, error } = await supabaseAdmin
      .from('admins')
      .select('*')
      .eq('username', username)
      .eq('is_active', true)
      .single();

    console.log('👤 Admin query result:', {
      found: !!admin,
      error: error?.message,
      username: admin?.username,
      hasHash: !!admin?.password_hash
    });

    if (error || !admin) {
      console.log('❌ Admin not found or error:', error);
      return NextResponse.json(
        { error: '잘못된 관리자 ID 또는 비밀번호입니다.' },
        { status: 401 }
      );
    }

    // Verify password
    console.log('🔑 Comparing password...');
    console.log('🔑 Input password length:', password.length);
    console.log('🔑 Stored hash:', admin.password_hash);
    console.log('🔑 Hash length:', admin.password_hash?.length);
    console.log('🔑 bcrypt module:', typeof bcrypt.compare);

    const passwordMatch = await bcrypt.compare(password, admin.password_hash);
    console.log('🔑 Password match result:', passwordMatch);

    if (!passwordMatch) {
      console.log('❌ Password mismatch');
      return NextResponse.json(
        { error: '잘못된 관리자 ID 또는 비밀번호입니다.' },
        { status: 401 }
      );
    }

    // Update last login time
    await supabaseAdmin
      .from('admins')
      .update({ last_login_at: new Date().toISOString() })
      .eq('id', admin.id);

    // Create session
    const sessionData = {
      id: admin.id,
      username: admin.username,
      role: admin.role,
      type: 'admin', // Important: distinguish from hospital sessions
      exp: Date.now() + 24 * 60 * 60 * 1000, // 24 hours
    };

    const sessionToken = Buffer.from(JSON.stringify(sessionData)).toString('base64');

    const response = NextResponse.json({
      message: '로그인 성공',
      admin: {
        id: admin.id,
        username: admin.username,
        role: admin.role,
        full_name: admin.full_name,
      },
    });

    response.cookies.set('admin_session', sessionToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 24 * 60 * 60, // 24 hours
      path: '/',
    });

    return response;
  } catch (error) {
    console.error('Error in admin login:', error);
    return NextResponse.json(
      { error: '서버 오류가 발생했습니다.' },
      { status: 500 }
    );
  }
}
