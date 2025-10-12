'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function Home() {
  const router = useRouter();

  useEffect(() => {
    router.push('/login');
  }, [router]);

  return (
    <div className="min-h-screen flex items-center justify-center">
      <p className="text-gray-900">리다이렉트 중...</p>
    </div>
  );
}

/* OLD CODE - MVP Version
'use client';

import { useState } from 'react';
import ReactMarkdown from 'react-markdown';

interface BlogResult {
  content: string;
  imageKeywords: string[];
}

function OldHome() {
  const [topic, setTopic] = useState('');
  const [keywords, setKeywords] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [result, setResult] = useState<BlogResult | null>(null);
  const [showKeywords, setShowKeywords] = useState(false);

*/
