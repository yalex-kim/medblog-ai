import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import bcrypt from 'bcryptjs';

// Admin creates a new hospital account
export async function POST(request: NextRequest) {
  try {
    const { hospital_id, initial_password, department = '산부인과' } = await request.json();

    if (!hospital_id || !initial_password) {
      return NextResponse.json(
        { error: '병원 ID와 초기 비밀번호를 입력해주세요.' },
        { status: 400 }
      );
    }

    // Check if hospital_id already exists
    const { data: existing } = await supabaseAdmin
      .from('hospitals')
      .select('hospital_id')
      .eq('hospital_id', hospital_id)
      .single();

    if (existing) {
      return NextResponse.json(
        { error: '이미 존재하는 병원 ID입니다.' },
        { status: 409 }
      );
    }

    // Hash the password
    const password_hash = await bcrypt.hash(initial_password, 10);

    // Insert new hospital
    const { data, error } = await supabaseAdmin
      .from('hospitals')
      .insert([
        {
          hospital_id,
          password_hash,
          department,
          must_change_password: true,
          is_initial_setup_complete: false,
        },
      ])
      .select()
      .single();

    if (error) {
      console.error('Error creating hospital:', error);
      return NextResponse.json(
        { error: '병원 계정 생성 중 오류가 발생했습니다.' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      message: '병원 계정이 생성되었습니다.',
      hospital: {
        id: data.id,
        hospital_id: data.hospital_id,
        department: data.department,
      },
    });
  } catch (error) {
    console.error('Error in POST /api/admin/hospitals:', error);
    return NextResponse.json(
      { error: '서버 오류가 발생했습니다.' },
      { status: 500 }
    );
  }
}

// Admin gets list of all hospitals
export async function GET() {
  try {
    const { data, error } = await supabaseAdmin
      .from('hospitals')
      .select('id, hospital_id, hospital_name, department, is_initial_setup_complete, created_at')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching hospitals:', error);
      return NextResponse.json(
        { error: '병원 목록 조회 중 오류가 발생했습니다.' },
        { status: 500 }
      );
    }

    return NextResponse.json({ hospitals: data });
  } catch (error) {
    console.error('Error in GET /api/admin/hospitals:', error);
    return NextResponse.json(
      { error: '서버 오류가 발생했습니다.' },
      { status: 500 }
    );
  }
}
