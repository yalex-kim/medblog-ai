/**
 * Standardized image prompt templates for different image types
 * Used by the image generation API to create consistent, type-appropriate medical blog images
 */

export type ImageType =
  | 'INTRO'
  | 'MEDICAL'
  | 'LIFESTYLE'
  | 'WARNING'
  | 'CTA'
  | 'INFOGRAPHIC'
  | 'THUMBNAIL';

interface PromptTemplate {
  style: string;
  colors: string;
  mood: string;
  elements: string;
  camera?: string;
}

const PROMPT_TEMPLATES: Record<ImageType, PromptTemplate> = {
  INTRO: {
    style: 'Highly realistic natural photo captured with a DSLR camera (not illustration, not digital art, not painting)',
    colors: 'Soft pastel tones (peach, lavender, mint green)',
    mood: 'Warm, calm, empathetic, and reassuring atmosphere',
    elements: 'Natural lighting, shallow depth of field, soft focus, peaceful indoor setting, relatable human subjects',
    camera: 'DSLR 50mm lens, realistic lighting, photo-quality textures',
  },

  MEDICAL: {
    style: 'Clean, professional medical diagram or 3D-rendered model',
    colors: 'Clinical whites, medical blues, and subtle accent tones',
    mood: 'Professional, trustworthy, educational tone',
    elements: 'Clear lines, labeled visuals, accurate anatomy when relevant',
  },

  LIFESTYLE: {
    style: 'Realistic lifestyle photo captured with a DSLR camera (not illustration, not digital art)',
    colors: 'Bright, energetic tones (fresh greens, soft blues, gentle yellows)',
    mood: 'Positive, healthy, and encouraging atmosphere',
    elements: 'Everyday realistic scenarios, natural body language, approachable environment',
    camera: 'DSLR 35mm lens, daylight, soft shadows',
  },

  WARNING: {
    style: 'Clean, soft-edged illustration with clear caution symbols',
    colors: 'Soft coral or amber tones for gentle emphasis',
    mood: 'Caring yet cautionary tone, informative without alarming',
    elements: 'Clear icons, balanced composition, smooth gradients',
  },

  CTA: {
    style: 'Inviting, modern medical environment photo or render',
    colors: 'Cool, professional hospital tones with warm human touches',
    mood: 'Welcoming, professional, and reassuring atmosphere',
    elements: 'Modern clinic interior, friendly doctor-patient interaction',
  },

  INFOGRAPHIC: {
    style: 'Minimalist, icon-based flat infographic',
    colors: '2–3 high-contrast colors for readability',
    mood: 'Clear, structured, and educational tone',
    elements: 'Simple icons, numbered steps, grid layout, minimal decoration',
  },

  // THUMBNAIL is built by buildThumbnailPrompt(), not from this template — the
  // entry exists so the record stays exhaustive over ImageType.
  THUMBNAIL: {
    style: 'Korean blog title card (썸네일): bold typography is the subject, not a photographic scene',
    colors: 'One soft background tone with a single saturated accent for the headline',
    mood: 'Friendly, trustworthy, scroll-stopping',
    elements: 'Large two-line Korean headline, small eyebrow line, short subtitle, clinic footer, decorative frame',
  },
};

/**
 * Layout motifs for THUMBNAIL cards. One is picked per generation so that
 * regenerating a thumbnail produces a genuinely different design instead of the
 * same card with reshuffled words.
 */
export const THUMBNAIL_LAYOUTS = [
  'A white rounded card floating on a soft gradient background, held by a realistic metal clipboard clip at the top center. Add a few flat starburst/sparkle shapes behind the headline and a thin colored underline stroke near the bottom.',
  'A ribbon banner across the top carrying the clinic name, the headline centered below it, a thin horizontal divider under the headline, and the subtitle beneath the divider. Small rounded corner ornaments frame the card.',
  'A white card framed by a soft wavy/scalloped border in the accent color, with the headline dead center. Add one small flat 3D-style prop cluster (megaphone, envelope, star) tucked into a bottom corner.',
  'A rounded off-white card on a tinted background, with flat botanical leaves and one blossom overlapping the card corners (top-left and bottom-right). Text stays centered and fully clear of the foliage.',
  'A two-column split: a flat vector illustration of a Korean woman (and, if the topic fits, a baby) occupying one side, with the headline right-aligned on the other side. Place 2–4 rounded hashtag pills in the bottom corner opposite the illustration.',
  'A memo-paper card taped at two corners on a plain tinted background, with a hand-drawn highlighter stroke behind part of the headline, a small checkbox line under it, and a marker-pen doodle beside the text.',
] as const;

/**
 * Colour schemes for THUMBNAIL cards, rotated alongside the layouts.
 */
export const THUMBNAIL_PALETTES = [
  'Cream and warm sand background, deep espresso-brown headline, mustard-yellow highlight accent',
  'Pale lilac background, deep violet headline, charcoal secondary text, soft white card',
  'Sky-blue to mint gradient background, dark forest-green headline, amber accent',
  'Blush pink background, plum-red headline, dusty rose illustration tones',
  'Soft mint background, charcoal headline, coral-pink accent shapes',
  'Butter-yellow background, teal headline, warm grey secondary text',
] as const;

export interface ThumbnailBranding {
  /** Real clinic name, rendered verbatim in the footer. Never invented. */
  hospitalName?: string;
  /** Neighbourhood/district label such as "풍무동" or "광진구". */
  location?: string;
  /** Forces a specific layout/palette pair; random when omitted. */
  variant?: number;
}

const LOCATION_TOKEN = /([가-힣]+(?:동|구|시|읍|면))/g;

/**
 * Pulls a short neighbourhood label out of a Korean street address, the way the
 * reference thumbnails label themselves ("풍무동, 패트라산부인과").
 *
 * Prefers the most specific token (동 > 구 > 시), because that is what local
 * search traffic actually uses. Returns '' when nothing usable is present.
 */
export function deriveLocationLabel(address?: string | null): string {
  if (!address) return '';
  const tokens = address.match(LOCATION_TOKEN);
  if (!tokens) return '';

  // "서울특별시" / "경기도 고양시" are too coarse to be worth printing when a
  // 동 or 구 is available, so rank by specificity rather than taking the first.
  const bySuffix = (suffix: string) => tokens.find((t) => t.endsWith(suffix) && t.length > 1);
  return bySuffix('동') || bySuffix('구') || bySuffix('읍') || bySuffix('면') || bySuffix('시') || '';
}

function buildThumbnailPrompt(
  topic: string,
  visualDescription: string,
  textContent: string | undefined,
  branding: ThumbnailBranding
): string {
  const variant =
    branding.variant !== undefined
      ? Math.abs(Math.trunc(branding.variant))
      : Math.floor(Math.random() * THUMBNAIL_LAYOUTS.length);

  const layout = THUMBNAIL_LAYOUTS[variant % THUMBNAIL_LAYOUTS.length];
  const palette = THUMBNAIL_PALETTES[variant % THUMBNAIL_PALETTES.length];

  const footerParts = [branding.location, branding.hospitalName].filter(Boolean);
  const footerInstruction = footerParts.length
    ? `Footer line (small, muted, bottom of the card): "${footerParts.join(', ')}". Reproduce this text exactly, character for character.`
    : 'Do not add any clinic name or footer line — leave that area empty.';

  const subtitleInstruction = textContent
    ? `Subtitle (one or two short centred lines under the headline): "${textContent}". You may break it across two lines at a natural word boundary, but do not reword it.`
    : 'Subtitle: write one short, natural Korean line (15–25 characters) that expands on the headline.';

  return `
KOREAN BLOG TITLE CARD (썸네일): This is a flat graphic design cover image for a Korean obstetrics and gynecology clinic blog post about "${topic}". It is a typographic poster, NOT a photograph and NOT a scene.

Square 1:1 composition. Typography is the main subject and must dominate the frame.

Text hierarchy, from top to bottom:
1. Eyebrow — one small line above the headline (a qualifier, symptom, or location; roughly 5–15 characters), set in the accent colour.
2. Headline — the key term drawn from the content below, split across EXACTLY TWO lines, in an extremely large, heavy, rounded Korean sans-serif (think 여기어때 잘난체 / G마켓 산스 Bold). It must fill most of the card's width. Colouring the two lines differently is encouraged.
3. ${subtitleInstruction}
4. ${footerInstruction}

Content to draw the headline and eyebrow from:
${visualDescription}

Layout motif:
${layout}

Colour scheme:
${palette}

Typography and text rules:
- All text is Korean (한글). Every character must be a real, correctly formed Hangul syllable — no invented glyphs, no broken jamo, no Latin filler, no Japanese or Chinese characters.
- Keep the total word count low. A crowded card is a failed card: eyebrow + two headline lines + one short subtitle + one footer line, nothing more.
- Centre-align the text block unless the layout motif explicitly calls for a side-aligned column.
- Leave generous margins; nothing may touch or run off the card edge.
- Decorative elements must sit behind or beside the text, never on top of it.

BRANDING RULE: Do NOT invent any hospital, clinic, or company name, and do NOT draw any logo, emblem, or watermark. ${
    footerParts.length
      ? 'The only permitted brand text is the exact footer line given above.'
      : 'No brand or clinic name may appear anywhere on the card.'
  }

MEDICAL ADVERTISING RULE: No superlatives or guarantees (최고, 유일, 완치, 100% and the like). Keep the tone informative and reassuring, never sensational. No nudity, no graphic or clinical imagery — this is a friendly cover image.
`;
}

/**
 * Generates a standardized prompt for image generation based on type
 * @param type - The image type (THUMBNAIL, INTRO, MEDICAL, LIFESTYLE, WARNING, CTA, INFOGRAPHIC)
 * @param topic - The blog post topic
 * @param visualDescription - Description of what should be in the image
 * @param textContent - Korean text to overlay on the image (optional)
 * @param branding - Real clinic name/location, used by THUMBNAIL only
 * @returns A complete prompt string for DALL·E / GPT-Image generation
 */
export function generateImagePrompt(
  type: ImageType,
  topic: string,
  visualDescription: string,
  textContent?: string,
  branding: ThumbnailBranding = {}
): string {
  // Title cards are typography, not scenes, so they get their own builder
  // instead of being squeezed through the photographic template above.
  if (type === 'THUMBNAIL') {
    return buildThumbnailPrompt(topic, visualDescription, textContent, branding);
  }

  const template = PROMPT_TEMPLATES[type];

  // Photographic types stay mostly text-free; design-oriented types may carry
  // supporting Korean labels so the layout can breathe instead of dumping one
  // verbatim text block.
  const isPhotoType = type === 'INTRO' || type === 'LIFESTYLE';

  const overlayInstruction = textContent
    ? `Convey this Korean message in the image: "${textContent}". Weave it naturally into the design as part of the composition — you may split it into a headline plus shorter supporting lines, distribute the pieces across the layout, and adjust spacing, sizing, and emphasis so it reads as intentional graphic design rather than one verbatim line of copied text. Use clean, legible Korean typography that fits the overall style.`
    : '';

  const supportingTextInstruction = isPhotoType
    ? 'Keep this scene mostly free of text; only add a short Korean label if it genuinely fits the photo.'
    : 'You may add brief, natural Korean titles, headings, labels, or captions that complement the content and fit the design (for example section titles, icon captions, or numbered steps). Keep all text accurate, correctly spelled, and meaningful.';

  const textInstruction = [overlayInstruction, supportingTextInstruction]
    .filter(Boolean)
    .join(' ');

  // Forbid fabricated hospital branding (real branding is added separately, never
  // generated) and garbled lettering — without banning legitimate content labels.
  const noBrandingInstruction = `CRITICAL BRANDING RULE: Do NOT generate any hospital logos, brand logos, emblems, watermarks, or invented hospital/clinic/company names on signboards, building exteriors, nameplates, uniforms, or documents. Do NOT produce garbled, distorted, or meaningless lettering. Any text that appears must be accurate, meaningful Korean relevant to the content above.`;

  // Medical/educational context for all types
  const medicalContext = `MEDICAL EDUCATIONAL CONTENT: This is a professional medical illustration for patient education and healthcare information purposes at a women's health clinic.`;

  const contextInstruction =
    type === 'INTRO' || type === 'LIFESTYLE'
      ? `Create an educational health and wellness image for a blog post about "${topic}".`
      : `Create a medical educational image for a Korean obstetrics and gynecology hospital blog post about "${topic}".`;


  return `
${medicalContext}

${contextInstruction}

Visual Content:
${visualDescription}

Style Guidelines:
- ${template.style}
- Colors: ${template.colors}
- Mood: ${template.mood}
- Key Visual Elements: ${template.elements}
${template.camera ? `- Camera & Realism: ${template.camera}` : ''}

${textInstruction}

${noBrandingInstruction}

Technical Requirements:
- This image is for medical education and patient information purposes only
- Content must be clinically accurate, professionally appropriate, and suitable for healthcare settings
- Maintain a warm, patient-friendly, and professional medical tone
- If the image includes people, ensure natural skin tones, realistic proportions, and appropriate medical context
- Use soft, natural lighting and avoid any cartoonish or painterly effects
- Never render hospital logos, brand marks, or invented hospital/clinic names; any text that appears must be accurate, meaningful Korean relevant to the content
- Focus on educational value and clinical accuracy
`;
}

/**
 * Parses image type from a description string
 * Fallback to 'MEDICAL' if no type is specified
 */
export function parseImageType(description: string): {
  type: ImageType;
  description: string;
} {
  const typeMatch = description.match(
    /^(INTRO|MEDICAL|LIFESTYLE|WARNING|CTA|INFOGRAPHIC|THUMBNAIL)\|(.+)$/ // ex: "INTRO|여성의 복통"
  );

  if (typeMatch) {
    return {
      type: typeMatch[1] as ImageType,
      description: typeMatch[2].trim(),
    };
  }

  return {
    type: 'MEDICAL',
    description: description.trim(),
  };
}
