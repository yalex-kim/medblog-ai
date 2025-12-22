import { ImageGenerationProvider, ImageProvider } from './types';
import { OpenAIImageProvider } from './openai-provider';
import { GeminiImageProvider } from './gemini-provider';

/**
 * Factory for creating image generation providers
 */
export class ImageProviderFactory {
  /**
   * Create an image generation provider based on configuration
   * @param provider - Provider type (defaults to environment variable or OpenAI)
   * @returns Image generation provider instance
   */
  static createProvider(
    provider?: ImageProvider | string
  ): ImageGenerationProvider {
    // Default to environment variable or OpenAI
    const providerType =
      provider ||
      process.env.IMAGE_PROVIDER?.toLowerCase() ||
      ImageProvider.OPENAI;

    switch (providerType) {
      case ImageProvider.GEMINI:
      case 'gemini':
        return new GeminiImageProvider();

      case ImageProvider.OPENAI:
      case 'openai':
      default:
        return new OpenAIImageProvider();
    }
  }
}

/**
 * Get the default image generation provider
 * Convenience function that uses the factory with default settings
 */
export function getImageProvider(): ImageGenerationProvider {
  return ImageProviderFactory.createProvider();
}
