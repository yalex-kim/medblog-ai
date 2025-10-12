'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import ReactMarkdown from 'react-markdown';

interface Topics {
  정보성: string[];
  홍보성: string[];
}

interface BlogResult {
  content: string;
  imageKeywords: string[];
}

interface GeneratedImage {
  keyword: string;
  url: string;
  prompt: string;
}

export default function DashboardPage() {
  const router = useRouter();
  const [hospitalName, setHospitalName] = useState('');
  const [department, setDepartment] = useState('');
  const [topics, setTopics] = useState<Topics | null>(null);
  const [loadingTopics, setLoadingTopics] = useState(false);

  const [customTopic, setCustomTopic] = useState('');
  const [generatingBlog, setGeneratingBlog] = useState(false);
  const [blogResult, setBlogResult] = useState<BlogResult | null>(null);
  const [showKeywords, setShowKeywords] = useState(false);
  const [currentTopic, setCurrentTopic] = useState('');
  const [generatedImages, setGeneratedImages] = useState<GeneratedImage[]>([]);
  const [generatingImages, setGeneratingImages] = useState(false);

  const fetchHospitalInfo = async () => {
    try {
      const response = await fetch('/api/hospital/settings');
      if (response.ok) {
        const data = await response.json();
        setHospitalName(data.hospital.hospital_name || '');
        setDepartment(data.hospital.department || '');
      } else if (response.status === 401) {
        router.push('/login');
      }
    } catch (error) {
      console.error('Error fetching hospital info:', error);
    }
  };

  useEffect(() => {
    fetchHospitalInfo();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const fetchTopicRecommendations = async () => {
    setLoadingTopics(true);
    try {
      const response = await fetch('/api/topics/recommend', { method: 'POST' });
      if (response.ok) {
        const data = await response.json();
        setTopics(data.topics);
      }
    } catch (err) {
      console.error('Error fetching topics:', err);
    } finally {
      setLoadingTopics(false);
    }
  };

  const generateBlog = async (topic: string) => {
    setGeneratingBlog(true);
    setBlogResult(null);
    setShowKeywords(false);
    setGeneratedImages([]);
    setCurrentTopic(topic);

    try {
      const response = await fetch('/api/generate-blog', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ topic }),
      });

      if (response.ok) {
        const data = await response.json();
        setBlogResult(data);
      } else {
        const errorData = await response.json();
        console.error('Error response:', errorData);
        alert('블로그 생성에 실패했습니다.');
      }
    } catch (error) {
      console.error('Error generating blog:', error);
      alert('오류가 발생했습니다.');
    } finally {
      setGeneratingBlog(false);
    }
  };

  const handleGenerateImages = async () => {
    if (!blogResult?.imageKeywords || blogResult.imageKeywords.length === 0) {
      alert('이미지 키워드가 없습니다.');
      return;
    }

    setGeneratingImages(true);

    try {
      const response = await fetch('/api/generate-images', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          keywords: blogResult.imageKeywords,
          topic: currentTopic,
        }),
      });

      if (response.ok) {
        const data = await response.json();
        setGeneratedImages(data.images);
      } else {
        const errorData = await response.json();
        console.error('Error response:', errorData);
        alert('이미지 생성에 실패했습니다: ' + (errorData.error || ''));
      }
    } catch (error) {
      console.error('Error generating images:', error);
      alert('이미지 생성 중 오류가 발생했습니다.');
    } finally {
      setGeneratingImages(false);
    }
  };

  const handleCopyAll = () => {
    if (blogResult?.content) {
      navigator.clipboard.writeText(blogResult.content);
      alert('복사되었습니다!');
    }
  };

  const handleLogout = async () => {
    await fetch('/api/auth/logout', { method: 'POST' });
    router.push('/login');
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white shadow">
        <div className="max-w-6xl mx-auto px-4 py-4 flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">{hospitalName || 'MedBlog AI'}</h1>
            <p className="text-sm text-gray-900">{department}</p>
          </div>
          <div className="flex gap-3">
            <button
              onClick={() => router.push('/settings')}
              className="px-4 py-2 text-gray-900 hover:bg-gray-100 rounded-lg"
            >
              설정
            </button>
            <button
              onClick={handleLogout}
              className="px-4 py-2 text-gray-900 hover:bg-gray-100 rounded-lg"
            >
              로그아웃
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 py-8">
        {!blogResult ? (
          <>
            {/* Greeting */}
            <div className="bg-white rounded-lg shadow-md p-6 mb-6">
              <h2 className="text-xl font-semibold mb-2">
                안녕하세요, {hospitalName}님!
              </h2>
              <p className="text-gray-900">
                오늘은 어떤 주제의 블로그 글을 작성하시겠습니까?
              </p>
            </div>

            {/* AI Topic Recommendations */}
            <div className="bg-white rounded-lg shadow-md p-6 mb-6">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-semibold">AI 주제 추천</h3>
                <button
                  onClick={fetchTopicRecommendations}
                  disabled={loadingTopics}
                  className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 disabled:bg-gray-400"
                >
                  {loadingTopics ? '추천 중...' : '주제 추천 받기'}
                </button>
              </div>

              {topics && (
                <div className="grid md:grid-cols-2 gap-6">
                  <div>
                    <h4 className="font-medium text-green-700 mb-3">정보성 주제</h4>
                    <div className="space-y-2">
                      {topics.정보성.map((topic, idx) => (
                        <button
                          key={idx}
                          onClick={() => generateBlog(topic)}
                          className="w-full text-left px-4 py-3 bg-green-50 hover:bg-green-100 rounded-lg transition-colors text-gray-900"
                        >
                          {topic}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div>
                    <h4 className="font-medium text-purple-700 mb-3">홍보성 주제</h4>
                    <div className="space-y-2">
                      {topics.홍보성.map((topic, idx) => (
                        <button
                          key={idx}
                          onClick={() => generateBlog(topic)}
                          className="w-full text-left px-4 py-3 bg-purple-50 hover:bg-purple-100 rounded-lg transition-colors text-gray-900"
                        >
                          {topic}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Custom Topic Input */}
            <div className="bg-white rounded-lg shadow-md p-6">
              <h3 className="text-lg font-semibold mb-4">직접 주제 입력</h3>
              <div className="flex gap-3">
                <input
                  type="text"
                  value={customTopic}
                  onChange={(e) => setCustomTopic(e.target.value)}
                  placeholder="원하는 주제를 입력하세요"
                  className="flex-1 px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  onKeyPress={(e) => e.key === 'Enter' && customTopic && generateBlog(customTopic)}
                />
                <button
                  onClick={() => customTopic && generateBlog(customTopic)}
                  disabled={!customTopic || generatingBlog}
                  className="bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 disabled:bg-gray-400"
                >
                  생성
                </button>
              </div>
            </div>

            {generatingBlog && (
              <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                <div className="bg-white rounded-lg p-8 max-w-sm">
                  <div className="flex flex-col items-center">
                    <svg className="animate-spin h-12 w-12 text-blue-600 mb-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    <p className="text-gray-900 font-medium">블로그 글을 생성하고 있습니다...</p>
                  </div>
                </div>
              </div>
            )}
          </>
        ) : (
          /* Blog Result */
          <div className="space-y-6">
            <div className="bg-white rounded-lg shadow-md p-8">
              <div className="prose max-w-none">
                <ReactMarkdown>{blogResult.content}</ReactMarkdown>
              </div>
            </div>

            <div className="flex flex-wrap gap-3">
              <button
                onClick={handleCopyAll}
                className="flex-1 min-w-[150px] bg-green-600 text-white py-3 px-6 rounded-lg font-medium hover:bg-green-700"
              >
                전체 복사
              </button>
              <button
                onClick={() => setShowKeywords(!showKeywords)}
                className="flex-1 min-w-[150px] bg-purple-600 text-white py-3 px-6 rounded-lg font-medium hover:bg-purple-700"
              >
                {showKeywords ? '키워드 숨기기' : '이미지 키워드'}
              </button>
              <button
                onClick={handleGenerateImages}
                disabled={generatingImages || !blogResult?.imageKeywords?.length}
                className="flex-1 min-w-[150px] bg-orange-600 text-white py-3 px-6 rounded-lg font-medium hover:bg-orange-700 disabled:bg-gray-400"
              >
                {generatingImages ? '이미지 생성 중...' : 'AI 이미지 생성'}
              </button>
              <button
                onClick={() => {
                  setBlogResult(null);
                  setGeneratedImages([]);
                  setCurrentTopic('');
                }}
                className="flex-1 min-w-[150px] bg-blue-600 text-white py-3 px-6 rounded-lg font-medium hover:bg-blue-700"
              >
                새 글 작성
              </button>
            </div>

            {showKeywords && blogResult.imageKeywords.length > 0 && (
              <div className="bg-purple-50 border border-purple-200 rounded-lg p-6">
                <h3 className="font-semibold text-purple-900 mb-3">이미지 제작용 키워드</h3>
                <div className="flex flex-wrap gap-2">
                  {blogResult.imageKeywords.map((keyword, index) => (
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

            {generatedImages.length > 0 && (
              <div className="bg-orange-50 border border-orange-200 rounded-lg p-6">
                <h3 className="font-semibold text-orange-900 mb-4">생성된 이미지</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {generatedImages.map((image, index) => (
                    <div key={index} className="bg-white rounded-lg overflow-hidden shadow-md">
                      <img
                        src={image.url}
                        alt={image.keyword}
                        className="w-full h-64 object-cover"
                      />
                      <div className="p-4">
                        <h4 className="font-medium text-gray-900 mb-2">{image.keyword}</h4>
                        <a
                          href={image.url}
                          download={`${image.keyword}.png`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-block bg-orange-600 text-white px-4 py-2 rounded-lg text-sm hover:bg-orange-700"
                        >
                          다운로드
                        </a>
                      </div>
                    </div>
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
