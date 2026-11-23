import { describe, expect, it } from 'vitest';
import {
  ensureCtaMarker,
  parseImageSuggestions,
  stripUnusedImageSuggestions,
} from './parse-image-suggestions';

describe('parseImageSuggestions', () => {
  it('parses INTRO/LIFESTYLE entries without a text field', () => {
    const content = '[#1 | INTRO | 창가에 앉아 배를 감싸쥔 여성의 모습]';
    const result = parseImageSuggestions(content);
    expect(result).toHaveLength(1);
    expect(result[0]).toMatchObject({ id: '1', type: 'INTRO', description: '창가에 앉아 배를 감싸쥔 여성의 모습', text: '' });
  });

  it('parses entries with a text overlay', () => {
    const content = '[#2 | INFOGRAPHIC | 체크리스트 이미지 | text : 1. 배가 아프다 2. 생리량이 많다]';
    const result = parseImageSuggestions(content);
    expect(result[0]).toMatchObject({
      id: '2',
      type: 'INFOGRAPHIC',
      description: '체크리스트 이미지',
      text: '1. 배가 아프다 2. 생리량이 많다',
    });
  });

  it('extracts multiple suggestions in document order', () => {
    const content = `
      본문 시작
      [#1 | INTRO | 도입부 장면]
      본문 중간
      [#2 | MEDICAL | 진료 장면 | text : 검진 안내]
      결론
      [#3 | CTA | 상담 유도 | text : 지금 상담하세요]
    `;
    const result = parseImageSuggestions(content);
    expect(result.map((r) => r.id)).toEqual(['1', '2', '3']);
  });

  it('caps results at the given limit', () => {
    const content = Array.from({ length: 7 }, (_, i) => `[#${i + 1} | MEDICAL | 장면 ${i + 1}]`).join('\n');
    const result = parseImageSuggestions(content, 5);
    expect(result).toHaveLength(5);
  });

  it('keeps a CTA that the model pushed past the limit, and puts it last', () => {
    // Sonnet 5.5 regression: six images with the CTA at #6.
    const content = [
      '[#1 | THUMBNAIL | 자궁근종 초음파 | text : 증상 없어도 확인이 필요할까요?]',
      '[#2 | INTRO | 아랫배를 감싸쥔 여성]',
      '[#3 | INFOGRAPHIC | 증상 체크리스트 | text : 1. 생리량 증가 2. 골반 통증]',
      '[#4 | MEDICAL | 초음파 화면 설명 | text : 크기·위치·개수 확인]',
      '[#5 | WARNING | 주의 카드 | text : 극심한 통증은 즉시 진료]',
      '[#6 | CTA | 상담실에서 환자를 맞이하는 의료진 | text : 편안한 상담을 기다립니다]',
    ].join('\n');

    const six = parseImageSuggestions(content);
    expect(six).toHaveLength(6);
    expect(six[six.length - 1].type).toBe('CTA');

    // Even a caller still asking for five must not lose the CTA.
    const five = parseImageSuggestions(content, 5);
    expect(five).toHaveLength(5);
    expect(five.map((r) => r.type)).toEqual(['THUMBNAIL', 'INTRO', 'INFOGRAPHIC', 'MEDICAL', 'CTA']);
  });

  it('keeps the CTA when it is the only entry beyond a seven-image overshoot', () => {
    const content = [
      '#1 | THUMBNAIL | 썸네일 | text : 제목',
      '#2 | INTRO | 도입 장면',
      '#3 | MEDICAL | 진료 장면 | text : 진단',
      '#4 | INFOGRAPHIC | 요약 카드 | text : 체크리스트',
      '#5 | LIFESTYLE | 산책하는 모습',
      '#6 | WARNING | 경고 카드 | text : 주의',
      '#7 | CTA | 상담 안내 | text : 문의하세요',
    ]
      .map((line) => `[${line}]`)
      .join('\n');

    const result = parseImageSuggestions(content);
    expect(result).toHaveLength(6);
    expect(result.at(-1)?.type).toBe('CTA');
  });

  it('moves a CTA that is not last to the end', () => {
    const content = [
      '[#1 | THUMBNAIL | 썸네일 | text : 제목]',
      '[#2 | INTRO | 도입 장면]',
      '[#3 | CTA | 상담 안내 | text : 문의하세요]',
      '[#4 | WARNING | 경고 카드 | text : 주의]',
    ].join('\n');

    expect(parseImageSuggestions(content).map((r) => r.type)).toEqual([
      'THUMBNAIL',
      'INTRO',
      'WARNING',
      'CTA',
    ]);
  });

  it('drops a repeated "final image list" that reuses the same ids', () => {
    // The model appends a second list of #1–#5 after the body; the body copy is
    // the one that sits in the article, so the repeats must not be counted.
    const content = [
      '#1 | THUMBNAIL | 본문 썸네일 | text : 본문',
      '#2 | INTRO | 본문 도입',
      '#5 | CTA | 본문 상담 안내 | text : 본문 문의',
      '**[최종 이미지 5종 정리]**',
      '#1 | THUMBNAIL | 정리 썸네일 | text : 정리',
      '#2 | INTRO | 정리 도입',
      '#5 | CTA | 정리 상담 안내 | text : 정리 문의',
    ]
      .map((line) => `[${line}]`)
      .join('\n');

    const result = parseImageSuggestions(content);
    expect(result.map((r) => r.description)).toEqual(['본문 썸네일', '본문 도입', '본문 상담 안내']);
  });

  it('returns every marker in document order (limit 0) so the article can be sliced', () => {
    const content = '[#1 | THUMBNAIL | 썸네일 | text : 제목]\n본문\n[#2 | CTA | 상담 | text : 문의]';
    const result = parseImageSuggestions(content, 0);
    expect(result.map((r) => r.id)).toEqual(['1', '2']);
    expect(result[0].position).toBe(0);
    expect(result[1].position).toBeGreaterThan(result[0].end);
  });
});

describe('stripUnusedImageSuggestions', () => {
  it('removes markers that are not part of the kept set, keeping the prose', () => {
    const content = [
      '# 제목',
      '',
      '[#1 | THUMBNAIL | 썸네일 | text : 제목]',
      '',
      '본문입니다.',
      '',
      '[#2 | INTRO | 도입 장면]',
      '[#3 | INFOGRAPHIC | 요약 카드 | text : 체크리스트]',
      '[#4 | MEDICAL | 진료 장면 | text : 진단]',
      '[#5 | WARNING | 경고 카드 | text : 주의]',
      '[#6 | CTA | 상담 안내 | text : 문의]',
      '[#7 | MEDICAL | 일곱 번째 이미지 | text : 넘치면 안 됨]',
      '[#8 | LIFESTYLE | 여덟 번째 이미지 | text : 넘치면 안 됨]',
    ].join('\n');

    const kept = parseImageSuggestions(content);
    const result = stripUnusedImageSuggestions(content, kept);

    expect(kept.map((s) => s.id)).toEqual(['1', '2', '3', '4', '5', '6']);
    expect(result).not.toContain('#7');
    expect(result).not.toContain('#8');
    expect(result).toContain('본문입니다.');
    expect(result).toContain('[#6 | CTA | 상담 안내 | text : 문의]');
    expect(result.startsWith('# 제목')).toBe(true);
    // No run of blank lines is left where the marker's line used to be.
    expect(result).not.toMatch(/\n{3,}/);
  });

  it('keeps six markers when the article uses five plus a CTA', () => {
    const content = [
      '# 제목',
      '[#1 | THUMBNAIL | 썸네일 | text : 제목]',
      '[#2 | INTRO | 도입 장면]',
      '[#3 | INFOGRAPHIC | 요약 카드 | text : 체크리스트]',
      '[#4 | MEDICAL | 진료 장면 | text : 진단]',
      '[#5 | WARNING | 경고 카드 | text : 주의]',
      '[#6 | CTA | 상담 안내 | text : 문의]',
    ].join('\n');

    const kept = parseImageSuggestions(content);
    expect(kept).toHaveLength(6);
    expect(stripUnusedImageSuggestions(content, kept)).toBe(content);
  });

  it('leaves content untouched when every marker is kept', () => {
    const content = '# 제목\n\n[#1 | THUMBNAIL | 썸네일 | text : 제목]\n\n본문';
    const kept = parseImageSuggestions(content);
    expect(stripUnusedImageSuggestions(content, kept)).toBe(content);
  });
});

describe('ensureCtaMarker', () => {
  it('puts the CTA marker back when its marker was cut with a note block', () => {
    const article = '# 제목\n\n본문입니다.\n\n[#5 | WARNING | 경고 카드 | text : 주의]';
    const suggestions = [
      ...parseImageSuggestions(article),
      {
        id: '6',
        type: 'CTA',
        description: '상담실에서 환자를 맞이하는 의료진',
        text: '편안한 상담을 기다립니다',
        position: 0,
        end: 0,
      },
    ];

    const result = ensureCtaMarker(article, suggestions);
    expect(result.endsWith('[#6 | CTA | 상담실에서 환자를 맞이하는 의료진 | text : 편안한 상담을 기다립니다]')).toBe(true);
    expect(result).toContain('본문입니다.');
  });

  it('leaves an article that already has a CTA marker alone', () => {
    const content = '# 제목\n\n본문\n\n[#5 | CTA | 상담 | text : 문의]';
    const suggestions = parseImageSuggestions(content);
    expect(ensureCtaMarker(content, suggestions)).toBe(content);
  });

  it('does nothing when there is no CTA suggestion', () => {
    const content = '# 제목\n\n본문';
    expect(ensureCtaMarker(content, parseImageSuggestions(content))).toBe(content);
  });
});
