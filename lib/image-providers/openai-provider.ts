import OpenAI from 'openai';
import {
  ImageGenerationProvider,
  ImageGenerationConfig,
  ImageGenerationResult,
} from './types';

/**
 * OpenAI image generation provider (GPT-Image-1.5)
 */
export class OpenAIImageProvider implements ImageGenerationProvider {
  private client: OpenAI;
  public readonly providerName = 'OpenAI GPT-Image-1.5';

  constructor(apiKey?: string) {
    this.client = new OpenAI({
      apiKey: apiKey || process.env.OPENAI_API_KEY,
    });
  }

  async generateImage(
    config: ImageGenerationConfig
  ): Promise<ImageGenerationResult> {
    const { prompt, size = '1024x1024', model = 'gpt-image-1.5' } = config;

    const response = await this.client.images.generate({
      model,
      prompt,
      n: 1,
      size: size as '1024x1024' | '1024x1536' | '1536x1024',
    });

    // gpt-image-1.5 returns b64_json by default
    const b64Image = response.data?.[0]?.b64_json;

    if (!b64Image) {
      throw new Error('No image data received from OpenAI');
    }

    return {
      imageData: b64Image,
      mimeType: 'image/png',
    };
  }
}
