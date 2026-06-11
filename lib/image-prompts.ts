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
  | 'INFOGRAPHIC';

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
};

/**
 * Generates a standardized prompt for image generation based on type
 * @param type - The image type (INTRO, MEDICAL, LIFESTYLE, WARNING, CTA, INFOGRAPHIC)
 * @param topic - The blog post topic
 * @param visualDescription - Description of what should be in the image
 * @param textContent - Korean text to overlay on the image (optional)
 * @returns A complete prompt string for DALL·E / GPT-Image generation
 */
export function generateImagePrompt(
  type: ImageType,
  topic: string,
  visualDescription: string,
  textContent?: string
): string {
  const template = PROMPT_TEMPLATES[type];

  // Infographics and medical diagrams rely on titles and labels to be useful, so
  // we allow meaningful Korean labels for them while still blocking fake branding.
  const allowsLabels = type === 'INFOGRAPHIC' || type === 'MEDICAL';

  const overlayInstruction = textContent
    ? `Include a clear Korean text overlay with this exact wording: "${textContent}". Use a clean sans-serif Korean font with excellent legibility and strong contrast against the background.`
    : '';

  const labelInstruction = allowsLabels
    ? 'You may include short, accurate Korean titles, headings, and labels that directly describe the content (for example section titles, icon captions, or numbered steps). Every label must be correctly spelled, meaningful, and relevant.'
    : textContent
      ? 'Do not add any other text besides the overlay above.'
      : 'Do not include any text, captions, or labels in this image.';

  const textInstruction = [overlayInstruction, labelInstruction]
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
    /^(INTRO|MEDICAL|LIFESTYLE|WARNING|CTA|INFOGRAPHIC)\|(.+)$/ // ex: "INTRO|여성의 복통"
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
