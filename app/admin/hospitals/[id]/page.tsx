'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';

interface Hospital {
  id: string;
  hospital_id: string;
  hospital_name: string | null;
  department: string;
  main_services: string | null;
  address: string | null;
  blog_platform: string | null;
  blog_id: string | null;
  is_initial_setup_complete: boolean;
  must_change_password: boolean;
  created_at: string;
}

interface BlogPost {
  id: string;
  title: string;
  topic: string;
  created_at: string;
  posted_to_blog: boolean;
}

export default function HospitalDetailPage() {
  const router = useRouter();
  const params = useParams();
  const hospitalId = params.id as string;

  const [hospital, setHospital] = useState<Hospital | null>(null);
  const [blogPosts, setBlogPosts] = useState<BlogPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [isEditing, setIsEditing] = useState(false);
  const [editedData, setEditedData] = useState<Partial<Hospital>>({});

  useEffect(() => {
    const checkAuthAndFetchData = async () => {
      try {
        // Check admin authentication
        const authResponse = await fetch('/api/admin/auth/session');
        if (!authResponse.ok) {
          router.replace('/admin/login');
          return;
        }

        // Fetch hospital data
        await fetchHospitalData();
      } catch (error) {
        console.error('Auth check error:', error);
        router.replace('/admin/login');
      }
    };

    checkAuthAndFetchData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hospitalId]);

  const fetchHospitalData = async () => {
    try {
      setLoading(true);

      // Fetch hospital details
      const hospitalResponse = await fetch(`/api/admin/hospitals/${hospitalId}`);
      if (hospitalResponse.ok) {
        const data = await hospitalResponse.json();
        setHospital(data.hospital);
        setEditedData(data.hospital);
      } else {
        setError('병원 정보를 불러올 수 없습니다.');
      }

      // Fetch blog posts
      const postsResponse = await fetch(`/api/admin/hospitals/${hospitalId}/posts`);
      if (postsResponse.ok) {
        const data = await postsResponse.json();
        setBlogPosts(data.posts || []);
      }
    } catch (error) {
      console.error('Error fetching hospital data:', error);
      setError('데이터를 불러오는 중 오류가 발생했습니다.');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    try {
      const response = await fetch(`/api/admin/hospitals/${hospitalId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(editedData),
      });

      if (response.ok) {
        alert('저장되었습니다!');
        setIsEditing(false);
        fetchHospitalData();
      } else {
        alert('저장에 실패했습니다.');
      }
    } catch (error) {
      console.error('Error saving:', error);
      alert('저장 중 오류가 발생했습니다.');
    }
  };

  const handleResetPassword = async () => {
    const newPassword = prompt('새로운 임시 비밀번호를 입력하세요:');
    if (!newPassword) return;

    try {
      const response = await fetch(`/api/admin/hospitals/${hospitalId}/reset-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ new_password: newPassword }),
      });

      if (response.ok) {
        alert(`비밀번호가 재설정되었습니다.\n새 비밀번호: ${newPassword}\n병원에 전달해주세요.`);
      } else {
        alert('비밀번호 재설정에 실패했습니다.');
      }
    } catch (error) {
      console.error('Error resetting password:', error);
      alert('비밀번호 재설정 중 오류가 발생했습니다.');
    }
  };

  const handleLogout = async () => {
    await fetch('/api/admin/auth/logout', { method: 'POST' });
    router.push('/admin/login');
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-900">로딩 중...</p>
        </div>
      </div>
    );
  }

  if (error || !hospital) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <p className="text-red-600 mb-4">{error || '병원을 찾을 수 없습니다.'}</p>
          <button
            onClick={() => router.push('/admin')}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            목록으로 돌아가기
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="flex justify-between items-center">
            <div className="flex items-center gap-4">
              <button
                onClick={() => router.push('/admin')}
                className="text-gray-600 hover:text-gray-900"
              >
                ← 뒤로
              </button>
              <h1 className="text-2xl font-bold text-gray-900">
                병원 관리: {hospital.hospital_name || hospital.hospital_id}
              </h1>
            </div>
            <button
              onClick={handleLogout}
              className="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg border border-gray-300"
            >
              로그아웃
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Column - Hospital Info */}
          <div className="lg:col-span-2 space-y-6">
            {/* Basic Info */}
            <div className="bg-white rounded-lg shadow-md p-6">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-semibold">기본 정보</h2>
                {!isEditing ? (
                  <button
                    onClick={() => setIsEditing(true)}
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                  >
                    수정
                  </button>
                ) : (
                  <div className="flex gap-2">
                    <button
                      onClick={() => {
                        setIsEditing(false);
                        setEditedData(hospital);
                      }}
                      className="px-4 py-2 bg-gray-500 text-white rounded-lg hover:bg-gray-600"
                    >
                      취소
                    </button>
                    <button
                      onClick={handleSave}
                      className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
                    >
                      저장
                    </button>
                  </div>
                )}
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    병원 ID (로그인용)
                  </label>
                  <input
                    type="text"
                    value={hospital.hospital_id}
                    disabled
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-gray-100"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    병원명
                  </label>
                  <input
                    type="text"
                    value={isEditing ? editedData.hospital_name || '' : hospital.hospital_name || '-'}
                    onChange={(e) => setEditedData({ ...editedData, hospital_name: e.target.value })}
                    disabled={!isEditing}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg disabled:bg-gray-100"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    진료과목
                  </label>
                  <input
                    type="text"
                    value={isEditing ? editedData.department || '' : hospital.department}
                    onChange={(e) => setEditedData({ ...editedData, department: e.target.value })}
                    disabled={!isEditing}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg disabled:bg-gray-100"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    주소
                  </label>
                  <input
                    type="text"
                    value={isEditing ? editedData.address || '' : hospital.address || '-'}
                    onChange={(e) => setEditedData({ ...editedData, address: e.target.value })}
                    disabled={!isEditing}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg disabled:bg-gray-100"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    주요 서비스
                  </label>
                  <textarea
                    value={isEditing ? editedData.main_services || '' : hospital.main_services || '-'}
                    onChange={(e) => setEditedData({ ...editedData, main_services: e.target.value })}
                    disabled={!isEditing}
                    rows={3}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg disabled:bg-gray-100"
                  />
                </div>
              </div>
            </div>

            {/* Blog Posts */}
            <div className="bg-white rounded-lg shadow-md p-6">
              <h2 className="text-xl font-semibold mb-4">생성된 블로그 글 ({blogPosts.length}개)</h2>
              {blogPosts.length === 0 ? (
                <p className="text-gray-500">아직 생성된 글이 없습니다.</p>
              ) : (
                <div className="space-y-2">
                  {blogPosts.map((post) => (
                    <div
                      key={post.id}
                      className="p-4 border border-gray-200 rounded-lg hover:bg-gray-50"
                    >
                      <div className="flex justify-between items-start">
                        <div>
                          <h3 className="font-medium text-gray-900">{post.title}</h3>
                          <p className="text-sm text-gray-500 mt-1">{post.topic}</p>
                        </div>
                        <div className="text-right">
                          <span
                            className={`text-xs px-2 py-1 rounded-full ${
                              post.posted_to_blog
                                ? 'bg-green-100 text-green-800'
                                : 'bg-gray-100 text-gray-800'
                            }`}
                          >
                            {post.posted_to_blog ? '게시됨' : '미게시'}
                          </span>
                          <p className="text-xs text-gray-400 mt-1">
                            {new Date(post.created_at).toLocaleDateString('ko-KR')}
                          </p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Right Column - Status & Actions */}
          <div className="space-y-6">
            {/* Status */}
            <div className="bg-white rounded-lg shadow-md p-6">
              <h2 className="text-xl font-semibold mb-4">계정 상태</h2>
              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600">초기 설정</span>
                  <span
                    className={`text-sm px-2 py-1 rounded-full ${
                      hospital.is_initial_setup_complete
                        ? 'bg-green-100 text-green-800'
                        : 'bg-yellow-100 text-yellow-800'
                    }`}
                  >
                    {hospital.is_initial_setup_complete ? '완료' : '미완료'}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600">비밀번호 변경 필요</span>
                  <span
                    className={`text-sm px-2 py-1 rounded-full ${
                      hospital.must_change_password
                        ? 'bg-red-100 text-red-800'
                        : 'bg-green-100 text-green-800'
                    }`}
                  >
                    {hospital.must_change_password ? '필요' : '완료'}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600">등록일</span>
                  <span className="text-sm text-gray-900">
                    {new Date(hospital.created_at).toLocaleDateString('ko-KR')}
                  </span>
                </div>
              </div>
            </div>

            {/* Actions */}
            <div className="bg-white rounded-lg shadow-md p-6">
              <h2 className="text-xl font-semibold mb-4">관리 작업</h2>
              <div className="space-y-3">
                <button
                  onClick={handleResetPassword}
                  className="w-full px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700"
                >
                  비밀번호 재설정
                </button>
              </div>
            </div>

            {/* Blog Settings */}
            {hospital.blog_platform && (
              <div className="bg-white rounded-lg shadow-md p-6">
                <h2 className="text-xl font-semibold mb-4">블로그 설정</h2>
                <div className="space-y-3">
                  <div>
                    <span className="text-sm text-gray-600">플랫폼</span>
                    <p className="text-sm font-medium text-gray-900">{hospital.blog_platform}</p>
                  </div>
                  <div>
                    <span className="text-sm text-gray-600">블로그 ID</span>
                    <p className="text-sm font-medium text-gray-900">{hospital.blog_id || '-'}</p>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
