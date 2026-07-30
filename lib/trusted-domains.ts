// Default allowlist of authoritative Korean (and Korean-language) medical sources
// used to ground blog-post generation via the web_search tool. Hospitals can
// customize this per-account (see hospitals.trusted_domains); this list is the
// fallback when a hospital hasn't set any, and the seed value in the DB migration.
export const DEFAULT_TRUSTED_DOMAINS = [
  'health.kr', // 약학정보원 - 약물 정보
  'nedrug.mfds.go.kr', // 식약처 의약품안전나라
  'mfds.go.kr', // 식품의약품안전처
  'health.kdca.go.kr', // 질병관리청 국가건강정보포털
  'kogs.or.kr', // 대한산부인과학회
  'amc.seoul.kr', // 서울아산병원 질환백과
  'snuh.org', // 서울대학교병원
  'samsunghospital.com', // 삼성서울병원
  'nhis.or.kr', // 국민건강보험공단
];

// Bare domain with an optional path, no scheme — matches the shape the
// web_search tool's allowed_domains expects (e.g. "example.com" or
// "example.com/blog").
const DOMAIN_PATTERN = /^[a-z0-9]([a-z0-9-]{0,61}[a-z0-9])?(\.[a-z0-9]([a-z0-9-]{0,61}[a-z0-9])?)+(\/[\w\-./]*)?$/i;

export function isValidDomainEntry(value: string): boolean {
  return DOMAIN_PATTERN.test(value.trim());
}
