import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';

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

// Get hospital details
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const adminSession = getAdminSession(request);
    if (!adminSession) {
      return NextResponse.json(
        { error: '관리자 권한이 필요합니다.' },
        { status: 401 }
      );
    }

    const { id } = await params;

    const { data: hospital, error } = await supabaseAdmin
      .from('hospitals')
      .select('*')
      .eq('id', id)
      .single();

    if (error || !hospital) {
      return NextResponse.json(
        { error: '병원을 찾을 수 없습니다.' },
        { status: 404 }
      );
    }

    return NextResponse.json({ hospital });
  } catch (error) {
    console.error('Error fetching hospital:', error);
    return NextResponse.json(
      { error: '서버 오류가 발생했습니다.' },
      { status: 500 }
    );
  }
}

// Update hospital details
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const adminSession = getAdminSession(request);
    if (!adminSession) {
      return NextResponse.json(
        { error: '관리자 권한이 필요합니다.' },
        { status: 401 }
      );
    }

    const { id } = await params;
    const body = await request.json();
    const {
      hospital_name,
      department,
      address,
      main_services,
    } = body;

    const { data, error } = await supabaseAdmin
      .from('hospitals')
      .update({
        hospital_name,
        department,
        address,
        main_services,
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('Error updating hospital:', error);
      return NextResponse.json(
        { error: '병원 정보 업데이트에 실패했습니다.' },
        { status: 500 }
      );
    }

    return NextResponse.json({ hospital: data });
  } catch (error) {
    console.error('Error in PUT /api/admin/hospitals/[id]:', error);
    return NextResponse.json(
      { error: '서버 오류가 발생했습니다.' },
      { status: 500 }
    );
  }
}
