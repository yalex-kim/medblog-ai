'use client';

import { useState, useEffect } from 'react';

interface Hospital {
  id: string;
  hospital_id: string;
  hospital_name: string | null;
  department: string;
  is_initial_setup_complete: boolean;
  created_at: string;
}

export default function AdminPage() {
  const [hospitals, setHospitals] = useState<Hospital[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [hospitalId, setHospitalId] = useState('');
  const [initialPassword, setInitialPassword] = useState('');
  const [department, setDepartment] = useState('산부인과');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  useEffect(() => {
    fetchHospitals();
  }, []);

  const fetchHospitals = async () => {
    try {
      const response = await fetch('/api/admin/hospitals');
      const data = await response.json();
      if (response.ok) {
        setHospitals(data.hospitals);
      }
    } catch (error) {
      console.error('Error fetching hospitals:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateHospital = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (!hospitalId || !initialPassword) {
      setError('모든 필드를 입력해주세요.');
      return;
    }

    try {
      const response = await fetch('/api/admin/hospitals', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          hospital_id: hospitalId,
          initial_password: initialPassword,
          department,
        }),
      });

      const data = await response.json();

      if (response.ok) {
        setSuccess(`병원 계정이 생성되었습니다! (ID: ${hospitalId})`);
        setHospitalId('');
        setInitialPassword('');
        setDepartment('산부인과');
        setShowForm(false);
        fetchHospitals();
      } else {
        setError(data.error || '병원 계정 생성에 실패했습니다.');
      }
    } catch (error) {
      console.error('Error creating hospital:', error);
      setError('서버 오류가 발생했습니다.');
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 py-6">
          <h1 className="text-3xl font-bold text-gray-900">
            관리자 - 병원 관리
          </h1>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-8">
        {/* Success/Error Messages */}
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

        {/* Create Hospital Button */}
        <div className="mb-6">
          <button
            onClick={() => setShowForm(!showForm)}
            className="bg-blue-600 text-white px-6 py-3 rounded-lg font-medium hover:bg-blue-700"
          >
            {showForm ? '취소' : '+ 새 병원 등록'}
          </button>
        </div>

        {/* Create Hospital Form */}
        {showForm && (
          <div className="bg-white rounded-lg shadow-md p-6 mb-8">
            <h2 className="text-xl font-semibold mb-4">새 병원 계정 생성</h2>
            <form onSubmit={handleCreateHospital} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  병원 ID (로그인용)
                </label>
                <input
                  type="text"
                  value={hospitalId}
                  onChange={(e) => setHospitalId(e.target.value)}
                  placeholder="예: seoul-womens-hospital"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  초기 비밀번호
                </label>
                <input
                  type="password"
                  value={initialPassword}
                  onChange={(e) => setInitialPassword(e.target.value)}
                  placeholder="병원에 전달할 초기 비밀번호"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                />
                <p className="text-sm text-gray-900 mt-1">
                  * 병원은 첫 로그인 후 비밀번호를 변경할 수 있습니다.
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  진료과목
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

              <button
                type="submit"
                className="w-full bg-blue-600 text-white py-3 rounded-lg font-medium hover:bg-blue-700"
              >
                병원 계정 생성
              </button>
            </form>
          </div>
        )}

        {/* Hospitals List */}
        <div className="bg-white rounded-lg shadow-md overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-200">
            <h2 className="text-xl font-semibold">등록된 병원 목록</h2>
          </div>

          {loading ? (
            <div className="p-8 text-center text-gray-500">로딩 중...</div>
          ) : hospitals.length === 0 ? (
            <div className="p-8 text-center text-gray-500">
              등록된 병원이 없습니다.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      병원 ID
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      병원명
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      진료과목
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      초기 설정
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      등록일
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {hospitals.map((hospital) => (
                    <tr key={hospital.id}>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                        {hospital.hospital_id}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {hospital.hospital_name || '-'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {hospital.department}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span
                          className={`px-2 py-1 text-xs rounded-full ${
                            hospital.is_initial_setup_complete
                              ? 'bg-green-100 text-green-800'
                              : 'bg-yellow-100 text-yellow-800'
                          }`}
                        >
                          {hospital.is_initial_setup_complete ? '완료' : '미완료'}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {new Date(hospital.created_at).toLocaleDateString('ko-KR')}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
