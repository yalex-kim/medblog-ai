/**
 * Standardized image prompt templates for different image types
 * Used by the image generation API to create consistent, type-appropriate medical blog images
 */

export type ImageType = 'INTRO' | 'MEDICAL' | 'LIFESTYLE' | 'WARNING' | 'CTA' | 'INFOGRAPHIC';

interface PromptTemplate {
  style: string;
  colors: string;
  mood: string;
  elements: string;
}

const PROMPT_TEMPLATES: Record<ImageType, PromptTemplate> = {
  INTRO: {
    style: 'Natural photo captured with a DSLR camera(not illustration, not paint)',
    colors: 'Soft pastel colors (peach, lavender, mint green)',
    mood: 'Calm, empathetic, reassuring atmosphere',
    elements: 'Gentle lighting, soft focus, peaceful ambiance, relatable characters',
  },

  MEDICAL: {
    style: 'Clean, professional medical diagram or illustration',
    colors: 'Medical blues, clinical whites, with accent colors for emphasis',
    mood: 'Professional, trustworthy, educational tone',
    elements: 'Clear lines, simplified medical visuals, anatomically accurate when relevant',
  },

  LIFESTYLE: {
    style: 'Natural photo captured with a DSLR camera(not illustration, not paint)',
    colors: 'Bright, energetic colors (fresh greens, sunny yellows, light blues)',
    mood: 'Encouraging, active, positive energy',
    elements: 'Realistic everyday scenarios, actionable steps shown visually, relatable situations',
  },

  WARNING: {
    style: 'Clear, attention-grabbing yet gentle illustration',
    colors: 'Soft orange or coral for caution, maintaining a caring approach',
    mood: 'Cautious yet caring, informative without alarming',
    elements: 'Visual contrast for emphasis, clear cautionary symbols, gentle but noticeable',
  },

  CTA: {
    style: 'Inviting, professional hospital environment illustration',
    colors: 'Welcoming hospital tones, modern clinic aesthetics',
    mood: 'Welcoming, professional, accessible atmosphere',
    elements: 'Modern clinic interior, friendly medical staff, approachable doctor-patient interaction',
  },

  INFOGRAPHIC: {
    style: 'Minimalist, icon-based infographic design',
    colors: 'Limited color palette (2-3 main colors), high contrast for readability',
    mood: 'Clear, organized, easy-to-scan information',
    elements: 'Simple icons, numbered lists or steps, structured grid layout, minimal decoration',
  },
};

/**
 * Generates a standardized prompt for image generation based on type
 * @param type - The image type (INTRO, MEDICAL, LIFESTYLE, WARNING, CTA, INFOGRAPHIC)
 * @param topic - The blog post topic
 * @param visualDescription - Description of what should be in the image
 * @param textContent - Korean text to overlay on the image (optional)
 * @returns A complete prompt string for DALL-E image generation
 */
export function generateImagePrompt(
  type: ImageType,
  topic: string,
  visualDescription: string,
  textContent?: string
): string {
  const template = PROMPT_TEMPLATES[type];

  const textInstruction = textContent
    ? `Include Korean text overlay: "${textContent}". Make the text large, clear, and highly readable with good contrast against the background.`
    : 'No text overlay in this image.';

  return `Create a ${template.style} for a Korean obstetrics/gynecology hospital blog about "${topic}".

Visual Content: ${visualDescription}

Style Guidelines:
- ${template.style}
- Colors: ${template.colors}
- Mood: ${template.mood}
- Key Elements: ${template.elements}

${textInstruction}

Technical Requirements:
- If text is included, use a clean sans-serif Korean font with excellent legibility
- Maintain warm, patient-friendly approach while being professional`;
}

/**
 * Parses image type from a description string
 * Fallback to 'MEDICAL' if no type is specified
 * @param description - Description that may include type prefix (e.g., "MEDICAL|description")
 * @returns Object with type and cleaned description
 */
export function parseImageType(description: string): {
  type: ImageType;
  description: string;
} {
  const typeMatch = description.match(/^(INTRO|MEDICAL|LIFESTYLE|WARNING|CTA|INFOGRAPHIC)\|(.+)$/);

  if (typeMatch) {
    return {
      type: typeMatch[1] as ImageType,
      description: typeMatch[2].trim(),
    };
  }

  // Default to MEDICAL if no type specified
  return {
    type: 'MEDICAL',
    description: description.trim(),
  };
}
