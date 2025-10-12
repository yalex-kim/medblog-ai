'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function SettingsPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const [hospitalName, setHospitalName] = useState('');
  const [department, setDepartment] = useState('산부인과');
  const [mainServices, setMainServices] = useState<string[]>([]);
  const [serviceInput, setServiceInput] = useState('');
  const [address, setAddress] = useState('');
  const [blogPlatform, setBlogPlatform] = useState('naver');
  const [blogId, setBlogId] = useState('');
  const [blogPassword, setBlogPassword] = useState('');
  const [blogBoardName, setBlogBoardName] = useState('');

  const [missingFields, setMissingFields] = useState<string[]>([]);

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    try {
      const response = await fetch('/api/hospital/settings');
      if (response.ok) {
        const data = await response.json();
        const h = data.hospital;
        setHospitalName(h.hospital_name || '');
        setDepartment(h.department || '산부인과');
        setMainServices(h.main_services || []);
        setAddress(h.address || '');
        setBlogPlatform(h.blog_platform || 'naver');
        setBlogId(h.blog_id || '');
        setBlogBoardName(h.blog_board_name || '');

        // Check missing fields
        const missing = [];
        if (!h.hospital_name) missing.push('병원 이름');
        if (!h.main_services || h.main_services.length === 0) missing.push('주요 진료 항목');
        if (!h.address) missing.push('주소');
        if (!h.blog_id) missing.push('블로그 ID');
        if (!h.blog_board_name) missing.push('게시판 이름');
        setMissingFields(missing);
      } else if (response.status === 401) {
        router.push('/login');
      }
    } catch (err) {
      setError('설정을 불러오는데 실패했습니다.');
    } finally {
      setLoading(false);
    }
  };

  const addService = () => {
    if (serviceInput.trim() && !mainServices.includes(serviceInput.trim())) {
      setMainServices([...mainServices, serviceInput.trim()]);
      setServiceInput('');
    }
  };

  const removeService = (service: string) => {
    setMainServices(mainServices.filter(s => s !== service));
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setSaving(true);

    try {
      const response = await fetch('/api/hospital/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          hospital_name: hospitalName,
          department,
          main_services: mainServices,
          address,
          blog_platform: blogPlatform,
          blog_id: blogId,
          blog_password_encrypted: blogPassword || undefined,
          blog_board_name: blogBoardName,
        }),
      });

      const data = await response.json();

      if (response.ok) {
        setSuccess('설정이 저장되었습니다.');
        if (data.hospital.is_initial_setup_complete) {
          setTimeout(() => router.push('/dashboard'), 1500);
        } else {
          fetchSettings(); // Refresh to check missing fields
        }
      } else {
        setError(data.error || '설정 저장에 실패했습니다.');
      }
    } catch (err) {
      setError('서버 오류가 발생했습니다.');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center">로딩 중...</div>;
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white shadow">
        <div className="max-w-4xl mx-auto px-4 py-6">
          <h1 className="text-3xl font-bold text-gray-900">병원 설정</h1>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 py-8">
        {missingFields.length > 0 && (
          <div className="mb-6 bg-yellow-50 border border-yellow-200 rounded-lg p-4">
            <p className="font-semibold text-yellow-800 mb-2">
              다음 항목을 입력해주세요:
            </p>
            <ul className="list-disc list-inside text-yellow-700">
              {missingFields.map(field => (
                <li key={field}>{field}</li>
              ))}
            </ul>
          </div>
        )}

        {success && (
          <div className="mb-6 bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded">
            {success}
          </div>
        )}

        {error && (
          <div className="mb-6 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
            {error}
          </div>
        )}

        <form onSubmit={handleSave} className="bg-white rounded-lg shadow-md p-8 space-y-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              병원 이름 <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={hospitalName}
              onChange={(e) => setHospitalName(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              진료 과목
            </label>
            <select
              value={department}
              onChange={(e) => setDepartment(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
            >
              <option value="산부인과">산부인과</option>
              <option value="내과">내과</option>
              <option value="소아과">소아과</option>
              <option value="정형외과">정형외과</option>
              <option value="피부과">피부과</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              주요 진료 항목 <span className="text-red-500">*</span>
            </label>
            <div className="flex gap-2 mb-2">
              <input
                type="text"
                value={serviceInput}
                onChange={(e) => setServiceInput(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addService())}
                placeholder="예: 임신 관리"
                className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              />
              <button
                type="button"
                onClick={addService}
                className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700"
              >
                추가
              </button>
            </div>
            <div className="flex flex-wrap gap-2">
              {mainServices.map(service => (
                <span
                  key={service}
                  className="bg-blue-100 text-blue-800 px-3 py-1 rounded-full text-sm flex items-center gap-2"
                >
                  {service}
                  <button
                    type="button"
                    onClick={() => removeService(service)}
                    className="text-blue-600 hover:text-blue-800"
                  >
                    ×
                  </button>
                </span>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              주소 <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              placeholder="예: 서울시 강남구 ..."
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              required
            />
          </div>

          <div className="border-t pt-6">
            <h3 className="text-lg font-semibold mb-4">블로그 정보</h3>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  플랫폼
                </label>
                <select
                  value={blogPlatform}
                  onChange={(e) => setBlogPlatform(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                >
                  <option value="naver">네이버 블로그</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  블로그 ID <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={blogId}
                  onChange={(e) => setBlogId(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  블로그 비밀번호 (저장/변경 시에만 입력)
                </label>
                <input
                  type="password"
                  value={blogPassword}
                  onChange={(e) => setBlogPassword(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  게시판 이름 <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={blogBoardName}
                  onChange={(e) => setBlogBoardName(e.target.value)}
                  placeholder="예: 건강정보"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  required
                />
              </div>
            </div>
          </div>

          <button
            type="submit"
            disabled={saving}
            className="w-full bg-blue-600 text-white py-3 rounded-lg font-medium hover:bg-blue-700 disabled:bg-gray-400"
          >
            {saving ? '저장 중...' : '설정 저장'}
          </button>
        </form>
      </main>
    </div>
  );
}
