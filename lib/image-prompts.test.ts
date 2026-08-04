import { describe, it, expect } from 'vitest';
import {
  generateImagePrompt,
  parseImageType,
  deriveLocationLabel,
  THUMBNAIL_LAYOUTS,
  THUMBNAIL_PALETTES,
} from './image-prompts';

describe('deriveLocationLabel', () => {
  it('prefers the most specific token', () => {
    expect(deriveLocationLabel('경기도 김포시 풍무동 123-4')).toBe('풍무동');
    expect(deriveLocationLabel('서울특별시 광진구 아차산로 100')).toBe('광진구');
    expect(deriveLocationLabel('경기도 고양시 일산로 5')).toBe('고양시');
  });

  it('returns an empty string when there is nothing usable', () => {
    expect(deriveLocationLabel('')).toBe('');
    expect(deriveLocationLabel(null)).toBe('');
    expect(deriveLocationLabel(undefined)).toBe('');
    expect(deriveLocationLabel('123 Main Street')).toBe('');
  });
});

describe('parseImageType', () => {
  it('recognises THUMBNAIL in the legacy prefix format', () => {
    expect(parseImageType('THUMBNAIL|자궁근종 초음파')).toEqual({
      type: 'THUMBNAIL',
      description: '자궁근종 초음파',
    });
  });
});

describe('generateImagePrompt for THUMBNAIL', () => {
  const branding = { hospitalName: '패트라산부인과', location: '풍무동', variant: 0 };

  it('builds a title-card prompt rather than a photographic one', () => {
    const prompt = generateImagePrompt('THUMBNAIL', '자궁근종', '자궁근종 초음파', undefined, branding);

    expect(prompt).toContain('KOREAN BLOG TITLE CARD');
    expect(prompt).toContain('자궁근종 초음파');
    expect(prompt).not.toContain('DSLR');
  });

  it('prints the real clinic footer verbatim and forbids invented names', () => {
    const prompt = generateImagePrompt('THUMBNAIL', '자궁근종', '자궁근종 초음파', undefined, branding);

    expect(prompt).toContain('"풍무동, 패트라산부인과"');
    expect(prompt).toContain('Do NOT invent any hospital');
  });

  it('omits the footer entirely when the clinic is unknown', () => {
    const prompt = generateImagePrompt('THUMBNAIL', '자궁근종', '자궁근종 초음파', undefined, { variant: 0 });

    expect(prompt).toContain('Do not add any clinic name or footer line');
    expect(prompt).not.toContain('Reproduce this text exactly');
  });

  it('uses the supplied text as the subtitle', () => {
    const prompt = generateImagePrompt(
      'THUMBNAIL',
      '자궁근종',
      '자궁근종 초음파',
      '생리량이 많아졌다면 꼭 확인하세요',
      branding
    );

    expect(prompt).toContain('Subtitle');
    expect(prompt).toContain('생리량이 많아졌다면 꼭 확인하세요');
  });

  it('gives a different layout and palette for each variant', () => {
    const prompts = THUMBNAIL_LAYOUTS.map((_, i) =>
      generateImagePrompt('THUMBNAIL', '자궁근종', '자궁근종 초음파', undefined, { variant: i })
    );

    expect(new Set(prompts).size).toBe(THUMBNAIL_LAYOUTS.length);
    THUMBNAIL_LAYOUTS.forEach((layout, i) => expect(prompts[i]).toContain(layout));
    THUMBNAIL_PALETTES.forEach((palette, i) => expect(prompts[i]).toContain(palette));
  });

  it('wraps out-of-range variants instead of producing an undefined layout', () => {
    const prompt = generateImagePrompt('THUMBNAIL', '자궁근종', '자궁근종 초음파', undefined, {
      variant: THUMBNAIL_LAYOUTS.length + 2,
    });

    expect(prompt).not.toContain('undefined');
    expect(prompt).toContain(THUMBNAIL_LAYOUTS[2]);
  });

  it('leaves the other types on the photographic template', () => {
    const prompt = generateImagePrompt('INTRO', '자궁근종', '햇살이 비치는 방', undefined, branding);

    expect(prompt).toContain('DSLR');
    expect(prompt).not.toContain('KOREAN BLOG TITLE CARD');
    expect(prompt).not.toContain('패트라산부인과');
  });
});
