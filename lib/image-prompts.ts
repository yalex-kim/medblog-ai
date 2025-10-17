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

  const textInstruction = textContent
    ? `Include large, clear Korean text overlay: "${textContent}". Use a clean sans-serif Korean font with excellent legibility and strong contrast against the background.`
    : 'Do not include any text overlay in this image.';

  // 🎯 INTRO / LIFESTYLE에서는 병원 문구 제거
  const contextInstruction =
    type === 'INTRO' || type === 'LIFESTYLE'
      ? ''
      : `Create an image for a Korean obstetrics and gynecology hospital blog post about "${topic}".`;


  return `
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

Technical Requirements:
- Maintain a warm, patient-friendly, and professional tone
- If the image includes people, ensure natural skin tones and realistic proportions
- Use soft, natural lighting and avoid any cartoonish or painterly effects
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
