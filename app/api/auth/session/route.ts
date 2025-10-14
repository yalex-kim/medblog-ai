import { NextRequest, NextResponse } from 'next/server';

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

export async function GET(request: NextRequest) {
  try {
    const sessionData = getSession(request);

    if (!sessionData) {
      return NextResponse.json(
        { error: '로그인이 필요합니다.' },
        { status: 401 }
      );
    }

    return NextResponse.json({
      authenticated: true,
      session: {
        id: sessionData.id,
        hospital_id: sessionData.hospital_id,
      },
    });
  } catch (error) {
    console.error('Error checking session:', error);
    return NextResponse.json(
      { error: '세션 확인 중 오류가 발생했습니다.' },
      { status: 500 }
    );
  }
}
