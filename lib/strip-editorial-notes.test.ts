import { describe, expect, it } from 'vitest';
import { stripEditorialNotes } from './strip-editorial-notes';

describe('stripEditorialNotes', () => {
  it('removes the "작성자 참고 메모" block Claude appends after the draft', () => {
    const content = [
      '# 제목',
      '',
      '본문 마지막 문단입니다.',
      '',
      '[#6 | CTA | 상담실에서 환자를 맞이하는 의료진 | text : 상담 안내]',
      '',
      '---',
      '',
      '**작성자 참고 메모**: 위 초안은 이미지 제안이 본문에 6개(#1~#6)로 표기되어 있으나, 게시 시에는 본문 중 LIFESTYLE 이미지([#5])를 삭제해 주세요.',
    ].join('\n');

    const result = stripEditorialNotes(content);
    expect(result).not.toContain('작성자 참고 메모');
    expect(result).toContain('[#6 | CTA |');
    expect(result.endsWith(']')).toBe(true);
  });

  it('removes the "최종 이미지 5종 정리" duplicate list and its 안내 블록', () => {
    const content = [
      '## 마무리하며',
      '',
      '서울 마포구 **테스트산부인과의원**에서 편하게 상담받으세요.',
      '',
      '[#6 | CTA | 따뜻한 조명의 상담실 | text : 임신 확인·초기 검진 상담 안내]',
      '',
      '> ※ 본 글은 일반적인 건강 정보 제공을 목적으로 하며, 진단과 치료는 의료진과의 상담이 필요합니다.',
      '',
      '> **이미지 제안 안내**: 위 본문에는 규칙상 #1~#5를 사용해야 하나, CTA 이미지를 #5로 정리한 최종본은 아래와 같습니다.',
      '',
      '**[최종 이미지 5종 정리]**',
      '- [#1 | THUMBNAIL | 임신 초기 증상 | text : 언제 병원에 가야 할까요?]',
      '- [#5 | CTA | 상담실 | text : 상담 안내]',
      '',
      '(WARNING 이미지는 텍스트 박스로 대체 가능합니다.)',
    ].join('\n');

    const result = stripEditorialNotes(content);
    expect(result).not.toContain('최종 이미지 5종 정리');
    expect(result).not.toContain('이미지 제안 안내');
    expect(result).not.toContain('대체 가능합니다');
    // The reader-facing disclaimer above the note stays.
    expect(result).toContain('일반적인 건강 정보 제공');
    expect(result).toContain('## 마무리하며');
  });

  it('removes a "작성자 메모" block that starts with the note in bold', () => {
    const content = [
      '본문입니다.',
      '',
      '[#6 | CTA | 상담실 | text : 상담]',
      '',
      '**작성자 메모:** 위 본문에서 이미지 5개(#1~#5)를 배치했으나 CTA가 빠져 있어 마무리 부분에 교체 삽입해 주세요.',
      '',
      '**최종 확정 이미지 구성 (정확히 5개)**',
      '- [#5 | CTA | 상담실 | text : 상담 안내]',
    ].join('\n');

    const result = stripEditorialNotes(content);
    expect(result).not.toContain('작성자 메모');
    expect(result).not.toContain('최종 확정 이미지 구성');
    expect(result).toBe('본문입니다.\n\n[#6 | CTA | 상담실 | text : 상담]');
  });

  it('removes the "[#6 삭제 없음 - CTA는 아래 이미지를 사용합니다]" style instruction', () => {
    const content = ['본문입니다.', '', '[#6 삭제 없음 - CTA는 아래 이미지를 사용합니다]', '', '[#6 | CTA | 상담 | text : 문의]'].join('\n');
    const result = stripEditorialNotes(content);
    expect(result).not.toContain('삭제 없음');
    expect(result).toContain('[#6 | CTA | 상담 | text : 문의]');
  });

  it('leaves an article without an editorial note untouched', () => {
    const content = '# 제목\n\n## 섹션\n\n참고: 이 글은 일반적인 정보 제공을 위한 것입니다.\n\n[#5 | CTA | 상담 | text : 문의]';
    expect(stripEditorialNotes(content)).toBe(content);
  });

  it('keeps a reader-facing 참고 line even when it mentions images', () => {
    const content = '본문입니다.\n\n참고로 검사 이미지는 병원에서 직접 촬영한 것입니다.';
    expect(stripEditorialNotes(content)).toBe(content);
  });

  it('refuses to cut when the match would discard most of the article', () => {
    // A short note-like sentence first in the document must not truncate the
    // post: nothing but the note would be left.
    const body = Array.from({ length: 20 }, (_, i) => `본문 문단 ${i + 1}입니다.`).join('\n\n');
    const content = `작성자 메모: 초안 검토 부탁드립니다.\n\n${body}`;
    expect(stripEditorialNotes(content)).toBe(content);
  });

  it('refuses to cut when a section heading follows the match', () => {
    const content = [
      '## 첫 번째 섹션',
      '',
      '위 이미지 제안은 참고용입니다.',
      '',
      '## 두 번째 섹션',
      '',
      '이어지는 본문입니다.',
    ].join('\n');
    expect(stripEditorialNotes(content)).toBe(content);
  });
});
