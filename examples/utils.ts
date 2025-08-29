import { createHeroku } from "../src/heroku-provider";

class HerokuExampleError extends Error { }

export function getEmbeddingModelFromEnv() {
  const heroku = createHeroku();
  const modelId = process.env.HEROKU_EMBEDDING_MODEL_ID;

  if (modelId === null || modelId === undefined) {
    throw new HerokuExampleError(
      'The `HEROKU_EMBEDDING_MODEL_ID` was not found in the environment. Please set it to a valid model ID.'
    );
  }

  return heroku.embedding(modelId);
}

export function cosineSimilarity(a: number[], b: number[]): number {
  if(a.length !== b.length) {
    throw new HerokuExampleError('Cannot calculate cosine similarity on vectors of unequal length');
  }

  const dotProduct = a.reduce((sum, ai, i) => sum + ai * b[i]!, 0);
  const magnitudeA = Math.sqrt(a.reduce((sum, ai) => sum + ai * ai, 0));
  const magnitudeB = Math.sqrt(b.reduce((sum, bi) => sum + bi * bi, 0));
  
  return dotProduct / (magnitudeA * magnitudeB) 
}