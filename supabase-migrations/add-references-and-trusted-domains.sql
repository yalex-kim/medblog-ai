-- Adds support for grounding blog posts in authoritative sources via the
-- Claude web_search tool:
--   - hospitals.trusted_domains: per-hospital allowlist of domains web_search
--     is restricted to. Seeded with a default set of authoritative Korean
--     medical sources; hospitals can add/remove domains from /settings.
--   - blog_posts.reference_links: the "[참고자료]" section Claude appends to
--     generated content, parsed out and stored as {title, url}[].

ALTER TABLE hospitals
ADD COLUMN IF NOT EXISTS trusted_domains TEXT[] DEFAULT ARRAY[
  'health.kr',
  'nedrug.mfds.go.kr',
  'mfds.go.kr',
  'health.kdca.go.kr',
  'kogs.or.kr',
  'amc.seoul.kr',
  'snuh.org',
  'samsunghospital.com',
  'nhis.or.kr'
];

COMMENT ON COLUMN hospitals.trusted_domains IS 'Domain allowlist passed to the web_search tool when generating blog posts';

-- Backfill existing rows created before the DEFAULT above existed.
UPDATE hospitals
SET trusted_domains = ARRAY[
  'health.kr',
  'nedrug.mfds.go.kr',
  'mfds.go.kr',
  'health.kdca.go.kr',
  'kogs.or.kr',
  'amc.seoul.kr',
  'snuh.org',
  'samsunghospital.com',
  'nhis.or.kr'
]
WHERE trusted_domains IS NULL;

ALTER TABLE blog_posts
ADD COLUMN IF NOT EXISTS reference_links JSONB DEFAULT '[]'::jsonb;

COMMENT ON COLUMN blog_posts.reference_links IS 'Sources cited by Claude via web_search, as [{"title": "...", "url": "..."}]';
