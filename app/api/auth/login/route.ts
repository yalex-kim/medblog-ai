import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import bcrypt from 'bcryptjs';
import { createHospitalSessionToken, SESSION_COOKIE_MAX_AGE_SECONDS } from '@/lib/session';
import { checkRateLimit, getClientIp } from '@/lib/rate-limit';
import { isTrustedOrigin } from '@/lib/request-security';

export async function POST(request: NextRequest) {
  try {
    if (!isTrustedOrigin(request)) {
      return NextResponse.json({ error: '잘못된 요청입니다.' }, { status: 403 });
    }

    const { allowed, retryAfterSeconds } = checkRateLimit(
      `login:${getClientIp(request)}`,
      10,
      15 * 60 * 1000
    );
    if (!allowed) {
      return NextResponse.json(
        { error: '로그인 시도가 너무 많습니다. 잠시 후 다시 시도해주세요.' },
        { status: 429, headers: { 'Retry-After': String(retryAfterSeconds) } }
      );
    }

    const { hospital_id, password } = await request.json();

    if (!hospital_id || !password) {
      return NextResponse.json(
        { error: '병원 ID와 비밀번호를 입력해주세요.' },
        { status: 400 }
      );
    }

    // Find hospital
    const { data: hospital, error } = await supabaseAdmin
      .from('hospitals')
      .select('*')
      .eq('hospital_id', hospital_id)
      .single();

    if (error || !hospital) {
      return NextResponse.json(
        { error: '병원 ID 또는 비밀번호가 올바르지 않습니다.' },
        { status: 401 }
      );
    }

    // Verify password
    const isValid = await bcrypt.compare(password, hospital.password_hash);

    if (!isValid) {
      return NextResponse.json(
        { error: '병원 ID 또는 비밀번호가 올바르지 않습니다.' },
        { status: 401 }
      );
    }

    const sessionToken = createHospitalSessionToken({
      id: hospital.id,
      hospital_id: hospital.hospital_id,
    });

    const response = NextResponse.json({
      message: '로그인 성공',
      hospital: {
        id: hospital.id,
        hospital_id: hospital.hospital_id,
        hospital_name: hospital.hospital_name,
        is_initial_setup_complete: hospital.is_initial_setup_complete,
        must_change_password: hospital.must_change_password,
      },
    });

    // Set session cookie
    response.cookies.set('session', sessionToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: SESSION_COOKIE_MAX_AGE_SECONDS,
    });

    return response;
  } catch (error) {
    console.error('Error in POST /api/auth/login:', error);
    return NextResponse.json(
      { error: '서버 오류가 발생했습니다.' },
      { status: 500 }
    );
  }
}
