# MedBlog AI

한국 병원(산부인과) 전용 블로그 자동 생성 SaaS MVP

## 기능

- 주제와 키워드 입력으로 전문적인 병원 블로그 글 자동 생성
- 의료법 준수 (과대광고 금지, 단정적 표현 금지)
- 이미지 제작용 키워드 자동 생성
- 마크다운 렌더링 및 전체 복사 기능
- 반응형 디자인 (모바일 대응)

## 기술 스택

- Next.js 14 (App Router)
- React
- TypeScript
- Tailwind CSS
- Claude API (Anthropic)
- react-markdown

## 설치 및 실행

### 1. 필수 요구사항

- Node.js 18 이상
- npm 또는 yarn
- Anthropic API 키

### 2. 설치

```bash
cd medblog-ai
npm install
```

### 3. 환경변수 설정

`.env.local` 파일을 생성하고 다음 내용을 추가:

```
ANTHROPIC_API_KEY=your_api_key_here
```

Anthropic API 키는 https://console.anthropic.com 에서 발급받을 수 있습니다.

### 4. 개발 서버 실행

```bash
npm run dev
```

브라우저에서 http://localhost:3000 접속

### 5. 프로덕션 빌드

```bash
npm run build
npm start
```

## 배포

### Vercel 배포

1. Vercel 계정 생성 (https://vercel.com)
2. GitHub 저장소와 연동
3. Environment Variables에 `ANTHROPIC_API_KEY` 추가
4. 자동 배포

또는 Vercel CLI 사용:

```bash
npm install -g vercel
vercel
```

## 사용 방법

1. 메인 페이지에서 블로그 주제 입력 (필수)
2. 키워드 입력 (선택)
3. "생성하기" 버튼 클릭
4. 생성된 글 확인
5. "전체 복사" 버튼으로 복사
6. "이미지 키워드 보기"로 카드뉴스 제작용 키워드 확인
7. "다시 생성하기"로 새로운 글 생성

## 프로젝트 구조

```
medblog-ai/
├── app/
│   ├── api/
│   │   └── generate-blog/
│   │       └── route.ts        # Claude API 연동
│   ├── page.tsx                # 메인 페이지
│   ├── layout.tsx
│   └── globals.css
├── .env.local                  # 환경변수 (gitignore)
├── package.json
└── README.md
```

## 주의사항

- API 키는 절대 공개 저장소에 커밋하지 마세요
- `.env.local` 파일은 `.gitignore`에 포함되어 있습니다
- Claude API 사용 시 크레딧 소비가 발생합니다
- 의료법 준수를 위해 생성된 글을 검토 후 사용하세요

## 라이선스

MIT
