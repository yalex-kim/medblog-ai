import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';

// Helper to get session
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

// Get hospital settings
export async function GET(request: NextRequest) {
  try {
    const sessionData = getSession(request);
    if (!sessionData) {
      return NextResponse.json(
        { error: '로그인이 필요합니다.' },
        { status: 401 }
      );
    }

    const { data: hospital, error } = await supabaseAdmin
      .from('hospitals')
      .select('*')
      .eq('id', sessionData.id)
      .single();

    if (error || !hospital) {
      return NextResponse.json(
        { error: '병원 정보를 찾을 수 없습니다.' },
        { status: 404 }
      );
    }

    // Don't send password hash to client
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { password_hash, ...hospitalData } = hospital;

    return NextResponse.json({ hospital: hospitalData });
  } catch (error) {
    console.error('Error in GET /api/hospital/settings:', error);
    return NextResponse.json(
      { error: '서버 오류가 발생했습니다.' },
      { status: 500 }
    );
  }
}

// Update hospital settings
export async function PUT(request: NextRequest) {
  try {
    const sessionData = getSession(request);
    if (!sessionData) {
      return NextResponse.json(
        { error: '로그인이 필요합니다.' },
        { status: 401 }
      );
    }

    const updates = await request.json();

    // Fields that can be updated
    const allowedFields = [
      'hospital_name',
      'department',
      'main_services',
      'address',
      'blog_platform',
      'blog_id',
      'blog_password_encrypted',
      'blog_board_name',
    ];

    const updateData: Record<string, unknown> = {};
    for (const field of allowedFields) {
      if (updates[field] !== undefined) {
        updateData[field] = updates[field];
      }
    }

    // Check if all required fields are filled
    const requiredFields = ['hospital_name', 'main_services', 'address', 'blog_id', 'blog_board_name'];
    const { data: currentHospital } = await supabaseAdmin
      .from('hospitals')
      .select('*')
      .eq('id', sessionData.id)
      .single();

    if (currentHospital) {
      const allFieldsFilled = requiredFields.every(field => {
        const value = updateData[field] !== undefined ? updateData[field] : currentHospital[field];
        return value !== null && value !== '' && (Array.isArray(value) ? value.length > 0 : true);
      });

      if (allFieldsFilled) {
        updateData.is_initial_setup_complete = true;
      }
    }

    const { data, error } = await supabaseAdmin
      .from('hospitals')
      .update(updateData)
      .eq('id', sessionData.id)
      .select()
      .single();

    if (error) {
      console.error('Error updating hospital:', error);
      return NextResponse.json(
        { error: '설정 업데이트 중 오류가 발생했습니다.' },
        { status: 500 }
      );
    }

    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { password_hash, ...hospitalData } = data;

    return NextResponse.json({
      message: '설정이 저장되었습니다.',
      hospital: hospitalData,
    });
  } catch (error) {
    console.error('Error in PUT /api/hospital/settings:', error);
    return NextResponse.json(
      { error: '서버 오류가 발생했습니다.' },
      { status: 500 }
    );
  }
}
