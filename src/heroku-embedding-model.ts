import {
  EmbeddingModelV2,
  TooManyEmbeddingValuesForCallError,
} from "@ai-sdk/provider";
import {
  combineHeaders,
  createJsonResponseHandler,
  FetchFunction,
  parseProviderOptions,
  postJsonToApi,
} from "@ai-sdk/provider-utils";
import { z } from "zod/v4";
import {
  HerokuEmbeddingModelId,
  herokuEmbeddingOptions,
} from "./heroku-embedding-options";
import { herokuFailedResponseHandler } from "./heroku-error";

/**
 * Configuration object for HerokuEmbeddingModel instances.
 *
 * @interface HerokuEmbeddingConfig
 * @property provider - The provider name identifier (e.g., 'heroku')
 * @property baseURL - The base URL for the Heroku embedding API endpoint
 * @property headers - HTTP headers to include with API requests (values can be undefined)
 * @property fetch - Optional custom fetch function for HTTP requests (defaults to global fetch)
 */
interface HerokuEmbeddingConfig {
  provider: string;
  baseURL: string;
  headers: Record<string, string | undefined>;
  fetch?: FetchFunction;
}

/**
 * Heroku embedding model implementation for the Vercel AI SDK.
 *
 * This class provides text embedding capabilities using Heroku's embedding API.
 * It implements the EmbeddingModelV2 interface from the Vercel AI SDK, allowing it to be
 * used with the SDK for generating vector embeddings from text.
 *
 * The model supports batch processing up to 96 text inputs per API call and includes
 * various configuration options for different embedding use cases like search,
 * classification, and clustering.
 *
 * @example
 * ```typescript
 * import { HerokuEmbeddingModel } from './heroku-embedding-model';
 *
 * const model = new HerokuEmbeddingModel('cohere-embed-multilingual', {
 *   provider: 'heroku',
 *   baseURL: 'https://us.inference.heroku.com',
 *   headers: { 'Authorization': 'Bearer your-token' }
 * });
 *
 * const result = await model.doEmbed({
 *   values: ['Hello world', 'How are you?']
 * });
 * ```
 */
export class HerokuEmbeddingModel implements EmbeddingModelV2<string> {
  /** The Vercel AI SDK specification version this model implements. */
  readonly specificationVersion = "v2";

  /** The Heroku model identifier used for API requests. */
  readonly modelId: HerokuEmbeddingModelId;

  /**
   * Maximum number of text values that can be processed in a single API call.
   * Exceeding this limit will cause a TooManyEmbeddingValuesForCallError to be thrown.
   */
  readonly maxEmbeddingsPerCall = 96;

  /**
   * Indicates whether this model supports parallel API calls.
   * When true, multiple embedding requests can be processed simultaneously.
   */
  readonly supportsParallelCalls = true;

  private readonly config: HerokuEmbeddingConfig;

  /**
   * Constructs a new instance of the HerokuEmbeddingModel.
   *
   * @param modelId a valid model identifier. This is normally provided by the HEROKU_EMBEDDING_MODEL_ID
   *                environment variable..
   * @param config see HerokuEmbeddingConfig.
   */
  constructor(modelId: HerokuEmbeddingModelId, config: HerokuEmbeddingConfig) {
    this.modelId = modelId;
    this.config = config;
  }

  /**
   * Returns the provider specified in the constructor's `config` argument.
   */
  get provider(): string {
    return this.config.provider;
  }

  /**
   * Generates embeddings for the provided text values using Heroku's embedding API.
   *
   * This method processes an array of text strings and returns their vector embeddings.
   * The returned embeddings can be used for semantic search, clustering, classification, and other
   * machine learning tasks.
   *
   * @param values - Array of text strings to generate embeddings for.
   *                 Maximum of 96 values per call (see maxEmbeddingsPerCall).
   * @param headers - Optional HTTP headers to include in the API request.
   * @param abortSignal - Optional AbortSignal to cancel the request if needed.
   * @param providerOptions - Optional Heroku-specific embedding configuration:
   *   - `inputType`: Type of input text ('search_document', 'search_query', 'classification', 'clustering')
   *   - `encodingFormat`: Output encoding format ('raw' or 'base64')
   *   - `embeddingType`: Embedding data type ('float', 'int8', 'uint8', 'binary', 'ubinary')
   *   - `allowIgnoredParams`: Whether to ignore unsupported parameters instead of throwing errors
   *
   * @returns Promise resolving to an object containing:
   *   - `embeddings`: Array of number arrays representing the vector embeddings for each input
   *   - `usage`: Optional token usage information with prompt token count
   *   - `response`: Raw API response with headers and body for debugging
   *
   * @throws {TooManyEmbeddingValuesForCallError} When more than 96 values are provided
   *
   * @example
   * ```typescript
   * const embeddings = await model.doEmbed({
   *   values: ['Hello world', 'How are you?'],
   *   providerOptions: {
   *     inputType: 'search_document',
   *     encodingFormat: 'raw'
   *   }
   * });
   *
   * console.log(embeddings.embeddings); // [[0.1, 0.2, ...], [0.3, 0.4, ...]]
   * console.log(embeddings.usage?.tokens); // 4
   * ```
   */
  async doEmbed({
    values,
    headers,
    abortSignal,
    providerOptions,
  }: Parameters<EmbeddingModelV2<string>["doEmbed"]>[0]): Promise<
    Awaited<ReturnType<EmbeddingModelV2<string>["doEmbed"]>>
  > {
    const embeddingOptions = await parseProviderOptions({
      provider: "heroku",
      providerOptions,
      schema: herokuEmbeddingOptions,
    });

    if (values.length > this.maxEmbeddingsPerCall) {
      throw new TooManyEmbeddingValuesForCallError({
        provider: this.provider,
        modelId: this.modelId,
        maxEmbeddingsPerCall: this.maxEmbeddingsPerCall,
        values,
      });
    }

    const {
      responseHeaders,
      value: response,
      rawValue,
    } = await postJsonToApi({
      url: `${this.config.baseURL}/v1/embeddings`,
      headers: combineHeaders(this.config.headers, headers),
      body: {
        model: this.modelId,
        input: values,
        input_type: embeddingOptions?.inputType,
        encoding_format: embeddingOptions?.encodingFormat,
        embedding_type: embeddingOptions?.embeddingType,
        allow_ignored_params: embeddingOptions?.allowIgnoredParams,
      },
      failedResponseHandler: herokuFailedResponseHandler,
      successfulResponseHandler: createJsonResponseHandler(
        herokuTextEmbeddingResponseSchema,
      ),
      abortSignal,
      fetch: this.config.fetch,
    });

    return {
      embeddings: response.data.map((item) => item.embedding),
      usage: response.usage
        ? { tokens: response.usage.prompt_tokens }
        : undefined,
      response: { headers: responseHeaders, body: rawValue },
    };
  }
}

// minimal version of the schema, focussed on what is needed for the implementation
// this approach limits breakages when the API changes and increases efficiency
const herokuTextEmbeddingResponseSchema = z.object({
  data: z.array(
    z.object({
      embedding: z.array(z.number()),
      index: z.number(),
    }),
  ),
  usage: z
    .object({
      prompt_tokens: z.number(),
      total_tokens: z.number(),
    })
    .optional(),
});
