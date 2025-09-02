import {
  EmbeddingModelV2,
  NoSuchModelError,
  ProviderV2,
} from '@ai-sdk/provider';
import { FetchFunction, loadApiKey, loadSetting } from '@ai-sdk/provider-utils';
import { HerokuEmbeddingModel } from './heroku-embedding-model';
import { HerokuEmbeddingModelId } from './heroku-embedding-options';

/**
 * Heroku provider interface for the Vercel AI SDK.
 * 
 * Extends the base ProviderV2 interface to provide access to Heroku's
 * embedding models. This interface defines the contract for creating
 * embedding model instances using Heroku's AI infrastructure.
 * 
 * @extends ProviderV2
 */
export interface HerokuProvider extends ProviderV2 {
  /**
   * Creates a text embedding model instance.
   * 
   * @param modelId - The Heroku embedding model identifier
   * @returns A configured embedding model
   */
  embedding(modelId: HerokuEmbeddingModelId): EmbeddingModelV2<string>;
  
  /**
   * Creates a text embedding model instance (alias for embedding).
   * 
   * @param modelId - The Heroku embedding model identifier  
   * @returns A configured embedding model
   */
  textEmbeddingModel(modelId: HerokuEmbeddingModelId): EmbeddingModelV2<string>;
}

export interface HerokuProviderSettings {
  /**
   * Use a different URL prefix for API calls, e.g. to use proxy servers.
   * This value defaults to `HEROKU_EMBEDDING_URL`.
   */
  baseURL?: string;

  /**
   * API key that is being sent using the `Authorization` header.
   * It defaults to the `HEROKU_EMBEDDING_KEY` environment variable.
   */
  apiKey?: string;

  /**
   * Custom headers to include in the requests.
   */
  headers?: Record<string, string>;

  /**
   * Custom fetch implementation. You can use it as a middleware to intercept requests,
   * or to provide a custom fetch implementation for e.g. testing.
   */
  fetch?: FetchFunction;
}

/**
 * Creates a Heroku AI provider instance for use with the Vercel AI SDK.
 * 
 * This function initializes a provider that connects to Heroku's AI services,
 * specifically for text embedding capabilities.
 * 
 * @param options - Configuration options for the provider
 * @param options.baseURL - Custom base URL for API calls (defaults to HEROKU_EMBEDDING_URL env var)
 * @param options.apiKey - API key for authentication (defaults to HEROKU_EMBEDDING_KEY env var)  
 * @param options.headers - Additional headers to include in requests
 * @param options.fetch - Custom fetch implementation for requests
 * 
 * @returns A configured Heroku provider instance with embedding capabilities
 * 
 * @example
 * ```typescript
 * import { createHeroku } from './heroku-provider';
 * 
 * // Using environment variables
 * const heroku = createHeroku();
 * 
 * // With custom configuration
 * const heroku = createHeroku({
 *   baseURL: 'https://us.inference.heroku.com',
 *   apiKey: 'your-api-key',
 *   headers: { 'Custom-Header': 'value' }
 * });
 * 
 * const embeddingModel = heroku.embedding('cohere-embed-multilingual');
 * ```
 */
export function createHeroku(
  options: HerokuProviderSettings = {},
): HerokuProvider {
  const getHeaders = (apiKey: string) => ({
    Authorization: `Bearer ${apiKey}`,
    'Content-Type': 'application/json',
    ...options.headers,
  });

  /**
   * Creates a configured Heroku text embedding model instance.
   * 
   * @param modelId - The Heroku embedding model identifier
   * @returns A configured HerokuEmbeddingModel instance
   * @internal
   */
  const createTextEmbeddingModel = (modelId: HerokuEmbeddingModelId) => {
    const baseURL = loadSetting({
      settingName: 'baseUrl',
      settingValue: options.baseURL,
      environmentVariableName: 'HEROKU_EMBEDDING_URL',
      description: 'baseUrl',
    });

    const apiKey = loadApiKey({
      apiKey: options.apiKey,
      environmentVariableName: 'HEROKU_EMBEDDING_KEY',
      description: 'Heroku',
    });

    return new HerokuEmbeddingModel(modelId, {
      provider: 'heroku.textEmbedding',
      baseURL,
      headers: getHeaders(apiKey),
      fetch: options.fetch,
    });
  };

  /**
   * Provider function that handles model creation and error cases.
   * Currently only supports embedding models - language and image models throw errors.
   * 
   * @param modelId - The model identifier
   * @throws {NoSuchModelError} Always throws since language models are not supported
   * @internal
   */
  const provider = function (modelId: string) {
    if (new.target) {
      throw new Error(
        'The Heroku model function cannot be called with the new keyword.',
      );
    }

    throw new NoSuchModelError({ modelId, modelType: 'languageModel' });
  };

  provider.embedding = createTextEmbeddingModel;
  provider.textEmbeddingModel = createTextEmbeddingModel;

  provider.languageModel = (modelId: string) => {
    throw new NoSuchModelError({ modelId, modelType: 'languageModel' });
  };

  provider.imageModel = (modelId: string) => {
    throw new NoSuchModelError({ modelId, modelType: 'imageModel' });
  };

  return provider;
}

/**
 * Default Heroku provider instance with environment-based configuration.
 * 
 * This is a pre-configured provider instance that uses environment variables
 * for authentication and configuration. It's ready to use immediately without
 * additional setup, provided the required environment variables are set:
 * - `HEROKU_EMBEDDING_KEY`: API key for authentication
 * - `HEROKU_EMBEDDING_URL`: Base URL for API requests
 * 
 * @example
 * ```typescript
 * import { heroku } from './heroku-provider';
 * 
 * const embeddingModel = heroku.embedding('cohere-embed-multilingual');
 * const result = await embeddingModel.doEmbed({ values: ['Hello world'] });
 * ```
 */
export const heroku = createHeroku();
