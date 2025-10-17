'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import ReactMarkdown from 'react-markdown';
import Image from 'next/image';

interface Topics {
  정보성: string[];
  홍보성: string[];
}

interface ImageSuggestion {
  type: string;
  description: string;
  text: string;
}

interface BlogResult {
  content: string;
  imageKeywords: string[];
  imageSuggestions?: ImageSuggestion[];
}

interface GeneratedImage {
  keyword: string;
  text?: string;
  url: string;
  prompt: string;
  type?: string;
}

interface EditableImagePrompt {
  type: string;
  description: string;
  text: string;
}

interface SavedPost {
  id: string;
  title: string;
  topic: string;
  content: string;
  image_keywords: string[];
  created_at: string;
  images?: GeneratedImage[];
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
  const [currentTopic, setCurrentTopic] = useState('');
  const [generatedImages, setGeneratedImages] = useState<GeneratedImage[]>([]);
  const [generatingImages, setGeneratingImages] = useState(false);
  const [regeneratingIndices, setRegeneratingIndices] = useState<Set<number>>(new Set());
  const [imagePrompts, setImagePrompts] = useState<EditableImagePrompt[]>([]);
  const [editingPrompts, setEditingPrompts] = useState(false);

  // New states for saved posts
  const [savedPosts, setSavedPosts] = useState<SavedPost[]>([]);
  const [currentPostId, setCurrentPostId] = useState<string | null>(null);
  const [isEditMode, setIsEditMode] = useState(false);
  const [editedContent, setEditedContent] = useState('');

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

  const fetchSavedPosts = async () => {
    try {
      const response = await fetch('/api/blog-posts');
      if (response.ok) {
        const data = await response.json();
        setSavedPosts(data.posts);
      }
    } catch (error) {
      console.error('Error fetching saved posts:', error);
    }
  };

  useEffect(() => {
    fetchHospitalInfo();
    fetchSavedPosts();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Handle browser back button
  useEffect(() => {
    const handlePopState = () => {
      // When user presses back, return to initial state
      setBlogResult(null);
      setGeneratedImages([]);
      setCurrentTopic('');
      setCurrentPostId(null);
      setIsEditMode(false);
      // Refresh saved posts to show newly created content
      fetchSavedPosts();
    };

    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
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

  const loadSavedPost = (post: SavedPost) => {
    console.log('Loading saved post:', post);
    console.log('Image keywords:', post.image_keywords);
    console.log('Saved images:', post.images);

    // Extract image suggestions from content if they exist (new format)
    const imageSuggestions: ImageSuggestion[] = [];
    const imageRegex = /\[([A-Z]+)\s*\|\s*([^\|\]]+?)(?:\s*\|\s*(?:text\s*:\s*)?([^\]]+))?\]/g;
    let match;

    while ((match = imageRegex.exec(post.content)) !== null) {
      const imageType = match[1].trim();
      const visualDescription = match[2].trim();
      const textContent = match[3] ? match[3].trim() : '';
      imageSuggestions.push({
        type: imageType,
        description: visualDescription,
        text: textContent,
      });
    }

    // Limit to 5 images
    if (imageSuggestions.length > 5) {
      imageSuggestions.splice(5);
    }

    console.log('Extracted image suggestions from content:', imageSuggestions);

    const blogData = {
      content: post.content,
      imageKeywords: post.image_keywords || [],
      imageSuggestions: imageSuggestions.length > 0 ? imageSuggestions : undefined,
    };

    console.log('Setting blogResult to:', blogData);
    setBlogResult(blogData);
    setCurrentTopic(post.topic);
    setCurrentPostId(post.id);
    setEditedContent(post.content);
    setIsEditMode(false);

    // Initialize image prompts from suggestions
    setImagePrompts(imageSuggestions.length > 0 ? imageSuggestions : []);
    setEditingPrompts(false);

    // Load saved images if they exist
    setGeneratedImages(post.images || []);

    // Add to browser history so back button works
    window.history.pushState({ view: 'post' }, '');
  };

  const generateBlog = async (topic: string) => {
    setGeneratingBlog(true);
    setBlogResult(null);
    setGeneratedImages([]);
    setCurrentTopic(topic);
    setCurrentPostId(null);
    setIsEditMode(false);

    try {
      const response = await fetch('/api/generate-blog', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ topic }),
      });

      if (response.ok) {
        const data = await response.json();
        setBlogResult(data);
        setEditedContent(data.content);
        // Set the blog post ID for new posts
        if (data.blogPostId) {
          setCurrentPostId(data.blogPostId);
        }
        // Initialize image prompts from suggestions (limit to 5)
        const suggestions = data.imageSuggestions || [];
        setImagePrompts(suggestions.slice(0, 5));
        setEditingPrompts(false);
        // Refresh saved posts list
        fetchSavedPosts();
        // Add to browser history so back button works
        window.history.pushState({ view: 'post' }, '');
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

  const handleSaveEdit = async () => {
    if (!currentPostId) return;

    try {
      const response = await fetch('/api/blog-posts', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: currentPostId,
          content: editedContent,
        }),
      });

      if (response.ok) {
        setBlogResult({ ...blogResult!, content: editedContent });
        setIsEditMode(false);
        alert('저장되었습니다!');
        fetchSavedPosts();
      } else {
        alert('저장에 실패했습니다.');
      }
    } catch (error) {
      console.error('Error saving edit:', error);
      alert('저장 중 오류가 발생했습니다.');
    }
  };

  const toggleEditMode = () => {
    if (isEditMode) {
      // Cancel edit - revert to original
      setEditedContent(blogResult?.content || '');
    }
    setIsEditMode(!isEditMode);
  };

  const handleGenerateImages = async () => {
    // Use imagePrompts (limited to 5)
    if (imagePrompts.length === 0) {
      alert('이미지 프롬프트가 없습니다.');
      return;
    }

    setGeneratingImages(true);

    try {
      const response = await fetch('/api/generate-images', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          keywords: imagePrompts,
          topic: currentTopic,
          blogPostId: currentPostId,
        }),
      });

      if (response.ok) {
        const data = await response.json();
        setGeneratedImages(data.images);
        // Refresh saved posts to update with newly generated images
        fetchSavedPosts();
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

  const handleRegenerateImage = async (index: number) => {
    const image = generatedImages[index];

    // Show confirmation dialog
    if (!confirm('이미지를 재생성하시겠습니까? 기존 이미지는 삭제됩니다.')) {
      return;
    }

    // Add index to regenerating set
    setRegeneratingIndices(prev => new Set(prev).add(index));

    try {
      const response = await fetch('/api/generate-images', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          description: image.keyword,
          text: image.text || '',
          topic: currentTopic,
          index,
          blogPostId: currentPostId,
          replaceExisting: true, // Tell API to delete old image
        }),
      });

      if (response.ok) {
        const data = await response.json();
        const newImages = [...generatedImages];
        newImages[index] = data.image;
        setGeneratedImages(newImages);
      } else {
        const errorData = await response.json();
        console.error('Error response:', errorData);
        alert('이미지 재생성에 실패했습니다: ' + (errorData.error || ''));
      }
    } catch (error) {
      console.error('Error regenerating image:', error);
      alert('이미지 재생성 중 오류가 발생했습니다.');
    } finally {
      // Remove index from regenerating set
      setRegeneratingIndices(prev => {
        const newSet = new Set(prev);
        newSet.delete(index);
        return newSet;
      });
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
            <div className="bg-white rounded-lg shadow-md p-6 mb-6">
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

            {/* Saved Posts */}
            {savedPosts.length > 0 && (
              <div className="bg-white rounded-lg shadow-md p-6">
                <h3 className="text-lg font-semibold mb-4">저장된 글 (최근 10개)</h3>
                <div className="space-y-2">
                  {savedPosts.map((post) => (
                    <button
                      key={post.id}
                      onClick={() => loadSavedPost(post)}
                      className="w-full text-left px-4 py-3 border border-gray-200 hover:border-blue-500 hover:bg-blue-50 rounded-lg transition-colors"
                    >
                      <div className="flex justify-between items-start">
                        <div className="flex-1">
                          <h4 className="font-medium text-gray-900">{post.title}</h4>
                          <p className="text-sm text-gray-500 mt-1">{post.topic}</p>
                        </div>
                        <span className="text-xs text-gray-400 ml-4">
                          {new Date(post.created_at).toLocaleDateString('ko-KR')}
                        </span>
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            )}

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
              {isEditMode ? (
                <textarea
                  value={editedContent}
                  onChange={(e) => setEditedContent(e.target.value)}
                  className="w-full min-h-[600px] p-4 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 font-mono text-sm"
                  placeholder="글 내용을 편집하세요..."
                />
              ) : (
                <div className="markdown-content">
                  <ReactMarkdown
                    components={{
                      h1: ({...props}) => <h1 className="text-3xl font-bold text-gray-900 mb-6 mt-0" {...props} />,
                      h2: ({...props}) => <h2 className="text-2xl font-bold text-gray-900 mb-4 mt-8" {...props} />,
                      h3: ({...props}) => <h3 className="text-xl font-bold text-gray-900 mb-3 mt-6" {...props} />,
                      p: ({...props}) => <p className="text-gray-700 leading-relaxed mb-4" {...props} />,
                      strong: ({...props}) => <strong className="font-semibold text-gray-900" {...props} />,
                      ul: ({...props}) => <ul className="list-disc pl-6 my-4 space-y-2" {...props} />,
                      ol: ({...props}) => <ol className="list-decimal pl-6 my-4 space-y-2" {...props} />,
                      li: ({...props}) => <li className="text-gray-700" {...props} />,
                    }}
                  >
                    {blogResult.content}
                  </ReactMarkdown>
                </div>
              )}
            </div>

            <div className="flex flex-wrap gap-3">
              {currentPostId && (
                <>
                  <button
                    onClick={toggleEditMode}
                    className="flex-1 min-w-[150px] bg-gray-600 text-white py-3 px-6 rounded-lg font-medium hover:bg-gray-700"
                  >
                    {isEditMode ? '취소' : '수정'}
                  </button>
                  {isEditMode && (
                    <button
                      onClick={handleSaveEdit}
                      className="flex-1 min-w-[150px] bg-indigo-600 text-white py-3 px-6 rounded-lg font-medium hover:bg-indigo-700"
                    >
                      저장
                    </button>
                  )}
                </>
              )}
              <button
                onClick={handleCopyAll}
                className="flex-1 min-w-[150px] bg-green-600 text-white py-3 px-6 rounded-lg font-medium hover:bg-green-700"
              >
                전체 복사
              </button>
              <button
                onClick={() => {
                  // Use history.back() to return to previous state
                  window.history.back();
                }}
                className="flex-1 min-w-[150px] bg-blue-600 text-white py-3 px-6 rounded-lg font-medium hover:bg-blue-700"
              >
                새 글 작성
              </button>
            </div>

            {/* Image Prompts Section */}
            {imagePrompts.length > 0 && (
              <div className="bg-purple-50 border border-purple-200 rounded-lg p-6">
                <div className="flex justify-between items-center mb-4">
                  <h3 className="font-semibold text-purple-900">이미지 프롬프트 ({imagePrompts.length}/5)</h3>
                  <button
                    onClick={() => setEditingPrompts(!editingPrompts)}
                    className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 text-sm"
                  >
                    {editingPrompts ? '완료' : '편집'}
                  </button>
                </div>
                <div className="space-y-4">
                  {imagePrompts.map((prompt, index) => (
                    <div key={index} className="bg-white rounded-lg p-4 border border-purple-100">
                      <div className="flex items-start gap-3">
                        <div className="flex-shrink-0 w-8 h-8 bg-purple-600 text-white rounded-full flex items-center justify-center font-semibold">
                          {index + 1}
                        </div>
                        <div className="flex-1 space-y-2">
                          <div>
                            <label className="text-xs font-semibold text-gray-600 uppercase">Type</label>
                            {editingPrompts ? (
                              <select
                                value={prompt.type}
                                onChange={(e) => {
                                  const newPrompts = [...imagePrompts];
                                  newPrompts[index].type = e.target.value;
                                  setImagePrompts(newPrompts);
                                }}
                                className="w-full mt-1 px-3 py-2 border border-gray-300 rounded-lg text-sm"
                              >
                                <option value="INTRO">INTRO</option>
                                <option value="MEDICAL">MEDICAL</option>
                                <option value="LIFESTYLE">LIFESTYLE</option>
                                <option value="WARNING">WARNING</option>
                                <option value="CTA">CTA</option>
                                <option value="INFOGRAPHIC">INFOGRAPHIC</option>
                              </select>
                            ) : (
                              <div className="mt-1 px-3 py-2 bg-purple-100 text-purple-900 rounded-lg text-sm font-semibold inline-block">
                                {prompt.type}
                              </div>
                            )}
                          </div>
                          <div>
                            <label className="text-xs font-semibold text-gray-600 uppercase">이미지 묘사</label>
                            {editingPrompts ? (
                              <textarea
                                value={prompt.description}
                                onChange={(e) => {
                                  const newPrompts = [...imagePrompts];
                                  newPrompts[index].description = e.target.value;
                                  setImagePrompts(newPrompts);
                                }}
                                className="w-full mt-1 px-3 py-2 border border-gray-300 rounded-lg text-sm"
                                rows={2}
                              />
                            ) : (
                              <p className="mt-1 text-gray-900 text-sm">{prompt.description}</p>
                            )}
                          </div>
                          {(prompt.type !== 'INTRO' && prompt.type !== 'LIFESTYLE') && (
                            <div>
                              <label className="text-xs font-semibold text-gray-600 uppercase">텍스트 (이미지에 들어갈 텍스트)</label>
                              {editingPrompts ? (
                                <input
                                  type="text"
                                  value={prompt.text}
                                  onChange={(e) => {
                                    const newPrompts = [...imagePrompts];
                                    newPrompts[index].text = e.target.value;
                                    setImagePrompts(newPrompts);
                                  }}
                                  className="w-full mt-1 px-3 py-2 border border-gray-300 rounded-lg text-sm"
                                />
                              ) : (
                                <p className="mt-1 text-blue-600 font-medium text-sm">{prompt.text || '(없음)'}</p>
                              )}
                            </div>
                          )}
                          {generatedImages[index] && (
                            <div className="pt-2 border-t border-gray-200">
                              <button
                                onClick={() => handleRegenerateImage(index)}
                                disabled={regeneratingIndices.has(index)}
                                className="w-full px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm hover:bg-indigo-700 disabled:bg-gray-400"
                              >
                                {regeneratingIndices.has(index) ? '생성 중...' : '이 프롬프트로 이미지 생성'}
                              </button>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {generatedImages.length > 0 && (
              <div className="bg-orange-50 border border-orange-200 rounded-lg p-6">
                <h3 className="font-semibold text-orange-900 mb-4">생성된 이미지 ({generatedImages.slice(0, 5).length}/5개)</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {generatedImages.slice(0, 5).map((image, index) => {
                    const isRegenerating = regeneratingIndices.has(index);
                    return (
                      <div key={`${index}-${image.url}`} className="bg-white rounded-lg overflow-hidden shadow-md relative">
                        {isRegenerating && (
                          <div className="absolute inset-0 bg-black bg-opacity-50 flex items-center justify-center z-10 rounded-lg">
                            <div className="bg-white rounded-lg p-4">
                              <div className="flex flex-col items-center">
                                <svg className="animate-spin h-8 w-8 text-purple-600 mb-2" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                </svg>
                                <p className="text-gray-900 text-sm font-medium">재생성 중...</p>
                              </div>
                            </div>
                          </div>
                        )}
                        <div className="relative w-full aspect-square">
                          <Image
                            src={image.url}
                            alt={image.keyword}
                            fill
                            className="object-contain"
                            unoptimized
                          />
                        </div>
                        <div className="p-4">
                          {image.type && (
                            <div className="mb-2">
                              <span className="inline-block px-2 py-1 bg-purple-100 text-purple-900 text-xs font-semibold rounded">
                                {image.type}
                              </span>
                            </div>
                          )}
                          <h4 className="font-medium text-gray-900 mb-1">{image.keyword}</h4>
                          {image.text && (
                            <p className="text-sm text-blue-600 mb-3 font-medium">📝 {image.text}</p>
                          )}
                          <div className="flex gap-2">
                            <a
                              href={image.url}
                              download={`${image.keyword}.png`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="flex-1 text-center bg-orange-600 text-white px-4 py-2 rounded-lg text-sm hover:bg-orange-700"
                            >
                              다운로드
                            </a>
                            <button
                              onClick={() => handleRegenerateImage(index)}
                              disabled={isRegenerating}
                              className="flex-1 bg-purple-600 text-white px-4 py-2 rounded-lg text-sm hover:bg-purple-700 disabled:bg-gray-400 disabled:cursor-not-allowed"
                            >
                              {isRegenerating ? '생성 중...' : '재생성'}
                            </button>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  );
}
