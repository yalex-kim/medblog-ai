'use client';

import { useState } from 'react';
import ReactMarkdown from 'react-markdown';

interface BlogResult {
  content: string;
  imageKeywords: string[];
}

export default function Home() {
  const [topic, setTopic] = useState('');
  const [keywords, setKeywords] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [result, setResult] = useState<BlogResult | null>(null);
  const [showKeywords, setShowKeywords] = useState(false);

  const handleGenerate = async () => {
    if (!topic.trim()) {
      setError('주제를 입력해주세요.');
      return;
    }

    setLoading(true);
    setError('');
    setResult(null);
    setShowKeywords(false);

    try {
      const response = await fetch('/api/generate-blog', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ topic, keywords }),
      });

      if (!response.ok) {
        throw new Error('블로그 글 생성에 실패했습니다.');
      }

      const data = await response.json();
      setResult(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : '오류가 발생했습니다.');
    } finally {
      setLoading(false);
    }
  };

  const handleCopyAll = () => {
    if (result?.content) {
      navigator.clipboard.writeText(result.content);
      alert('복사되었습니다!');
    }
  };

  const handleReset = () => {
    setResult(null);
    setShowKeywords(false);
    setError('');
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-blue-50 to-white">
      {/* Header */}
      <header className="bg-white shadow-sm border-b border-blue-100">
        <div className="max-w-4xl mx-auto px-4 py-6">
          <h1 className="text-3xl font-bold text-blue-600">
            MedBlog AI
          </h1>
          <p className="text-gray-600 mt-1">병원 블로그 자동 생성</p>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 py-8">
        {!result ? (
          /* Input Form */
          <div className="bg-white rounded-lg shadow-md p-8">
            <div className="space-y-6">
              <div>
                <label htmlFor="topic" className="block text-sm font-medium text-gray-700 mb-2">
                  주제 <span className="text-red-500">*</span>
                </label>
                <textarea
                  id="topic"
                  value={topic}
                  onChange={(e) => setTopic(e.target.value)}
                  placeholder="예: 임신 중 카페인 섭취"
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
                  rows={3}
                />
              </div>

              <div>
                <label htmlFor="keywords" className="block text-sm font-medium text-gray-700 mb-2">
                  키워드 (선택사항)
                </label>
                <input
                  id="keywords"
                  type="text"
                  value={keywords}
                  onChange={(e) => setKeywords(e.target.value)}
                  placeholder="예: 임신, 카페인, 주의사항"
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>

              {error && (
                <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
                  {error}
                </div>
              )}

              <button
                onClick={handleGenerate}
                disabled={loading}
                className="w-full bg-blue-600 text-white py-3 px-6 rounded-lg font-medium hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
              >
                {loading ? '생성 중...' : '생성하기'}
              </button>

              {loading && (
                <div className="flex items-center justify-center space-x-2 text-gray-600">
                  <svg className="animate-spin h-5 w-5 text-blue-600" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  <span>블로그 글을 생성하고 있습니다...</span>
                </div>
              )}
            </div>
          </div>
        ) : (
          /* Result Display */
          <div className="space-y-6">
            <div className="bg-white rounded-lg shadow-md p-8">
              <div className="prose max-w-none">
                <ReactMarkdown>{result.content}</ReactMarkdown>
              </div>
            </div>

            <div className="flex flex-wrap gap-3">
              <button
                onClick={handleCopyAll}
                className="flex-1 min-w-[150px] bg-green-600 text-white py-3 px-6 rounded-lg font-medium hover:bg-green-700 transition-colors"
              >
                전체 복사
              </button>
              <button
                onClick={() => setShowKeywords(!showKeywords)}
                className="flex-1 min-w-[150px] bg-purple-600 text-white py-3 px-6 rounded-lg font-medium hover:bg-purple-700 transition-colors"
              >
                {showKeywords ? '키워드 숨기기' : '이미지 키워드 보기'}
              </button>
              <button
                onClick={handleReset}
                className="flex-1 min-w-[150px] bg-blue-600 text-white py-3 px-6 rounded-lg font-medium hover:bg-blue-700 transition-colors"
              >
                다시 생성하기
              </button>
            </div>

            {showKeywords && result.imageKeywords.length > 0 && (
              <div className="bg-purple-50 border border-purple-200 rounded-lg p-6">
                <h3 className="font-semibold text-purple-900 mb-3">이미지 제작용 키워드</h3>
                <div className="flex flex-wrap gap-2">
                  {result.imageKeywords.map((keyword, index) => (
                    <span
                      key={index}
                      className="bg-purple-100 text-purple-800 px-3 py-1 rounded-full text-sm font-medium"
                    >
                      {keyword}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  );
}
