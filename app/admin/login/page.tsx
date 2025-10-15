'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function AdminLoginPage() {
  const router = useRouter();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [checking, setChecking] = useState(true);

  // Check if admin is already logged in
  useEffect(() => {
    const checkSession = async () => {
      try {
        const response = await fetch('/api/admin/auth/session');
        if (response.ok) {
          // Admin is already logged in, redirect to admin dashboard
          router.replace('/admin');
        }
      } catch (error) {
        console.error('Session check error:', error);
      } finally {
        setChecking(false);
      }
    };

    checkSession();
  }, [router]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const response = await fetch('/api/admin/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password }),
      });

      const data = await response.json();

      if (response.ok) {
        // Redirect to admin dashboard
        router.replace('/admin');
      } else {
        setError(data.error || '로그인에 실패했습니다.');
      }
    } catch (error) {
      console.error('Error logging in:', error);
      setError('서버 오류가 발생했습니다.');
    } finally {
      setLoading(false);
    }
  };

  // Show loading while checking session
  if (checking) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-gray-800 to-gray-900 flex items-center justify-center px-4">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white mx-auto mb-4"></div>
          <p className="text-white">로딩 중...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-800 to-gray-900 flex items-center justify-center px-4">
      <div className="max-w-md w-full">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-gray-700 rounded-full mb-4">
            <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
            </svg>
          </div>
          <h1 className="text-3xl font-bold text-white mb-2">Admin Portal</h1>
          <p className="text-gray-400">MedBlog AI 관리자 로그인</p>
        </div>

        <div className="bg-gray-800 rounded-lg shadow-xl p-8 border border-gray-700">
          <h2 className="text-2xl font-semibold mb-6 text-white">로그인</h2>

          {error && (
            <div className="mb-4 bg-red-900 border border-red-700 text-red-200 px-4 py-3 rounded">
              {error}
            </div>
          )}

          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                관리자 ID
              </label>
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="w-full px-4 py-3 bg-gray-700 border border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-white placeholder-gray-400"
                placeholder="관리자 ID를 입력하세요"
                required
                autoComplete="username"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                비밀번호
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-4 py-3 bg-gray-700 border border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-white placeholder-gray-400"
                placeholder="비밀번호를 입력하세요"
                required
                autoComplete="current-password"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-blue-600 text-white py-3 rounded-lg font-medium hover:bg-blue-700 disabled:bg-gray-600 disabled:cursor-not-allowed transition-colors"
            >
              {loading ? '로그인 중...' : '로그인'}
            </button>
          </form>

          <div className="mt-6 pt-6 border-t border-gray-700">
            <p className="text-sm text-gray-400 text-center">
              병원 계정으로 로그인하시려면{' '}
              <button
                onClick={() => router.push('/login')}
                className="text-blue-400 hover:text-blue-300 underline"
              >
                여기를 클릭
              </button>
              하세요
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
