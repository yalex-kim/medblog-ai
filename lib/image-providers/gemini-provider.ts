import { GoogleGenAI } from '@google/genai';
import {
  ImageGenerationProvider,
  ImageGenerationConfig,
  ImageGenerationResult,
} from './types';

/**
 * Google Gemini image generation provider (Gemini 2.5 Flash Image)
 */
export class GeminiImageProvider implements ImageGenerationProvider {
  private client: GoogleGenAI;
  public readonly providerName = 'Google Gemini 2.5 Flash Image';

  constructor(apiKey?: string) {
    this.client = new GoogleGenAI({
      apiKey: apiKey || process.env.GEMINI_API_KEY,
    });
  }

  async generateImage(
    config: ImageGenerationConfig
  ): Promise<ImageGenerationResult> {
    const { prompt, model = 'gemini-2.5-flash-image' } = config;

    const response = await this.client.models.generateContent({
      model,
      contents: prompt,
    });

    // Extract image data from response
    const parts = response.candidates?.[0]?.content?.parts;
    if (!parts) {
      throw new Error('No response from Gemini');
    }

    for (const part of parts) {
      if (part.inlineData && part.inlineData.data) {
        return {
          imageData: part.inlineData.data,
          mimeType: part.inlineData.mimeType || 'image/png',
        };
      }
    }

    throw new Error('No image data received from Gemini');
  }
}
