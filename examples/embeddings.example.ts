import { embed, embedMany } from "ai";
import { getEmbeddingModelFromEnv, cosineSimilarity } from "./utils";

/**
 * This examples uses the Heroku embeddings model to generate embeddings
 * for a single string, and prints the embedding result.
 *
 * Expects the following environment variables to be present:
 *
 * - HEROKU_EMBEDDING_URL
 * - HEROKU_EMBEDDING_MODEL_ID
 * - HEROKU_EMBEDDING_KEY
 *
 * run command: `pnpm example embeddings basic`
 *
 */
export async function basic() {
  const model = getEmbeddingModelFromEnv();

  const { embedding } = await embed({
    model,
    value: "I was hot, and I was hungry.",
  });

  console.log("Basic embedding result:", embedding);
}

export async function similarity() {
  const model = getEmbeddingModelFromEnv();

  const documents = [
    "JavaScript is a programming language for web development.",
    "Python is popular for data science and machine learning.",
    "React is a JavaScript library for building user interfaces.",
    "TensorFlow is a machine learning framework.",
    "Node.js allows JavaScript to run on the server.",
    "Pandas is a Python library for data manipulation.",
    "Vue.js is a progressive JavaScript framework.",
    "Scikit-learn provides machine learning tools for Python.",
  ];

  const query = "web development frameworks";

  const { embeddings: docEmbeddings } = await embedMany({
    model,
    values: documents,
  });

  const { embedding: queryEmbedding } = await embed({
    model,
    value: query,
  });

  const similarities = docEmbeddings.map((de, i) => ({
    document: documents[i],
    similarity: cosineSimilarity(de, queryEmbedding),
    i,
  }));

  similarities.sort((a, b) => b.similarity - a.similarity);

  console.log(`For the query: "${query}"...`);
  console.log("These are the top 3 most similar documents:");
  console.log("-".repeat(50));

  similarities
    .slice(0, 3)
    .forEach((similarity, rank) =>
      console.log(`${rank + 1}. ${similarity.document}`),
    );
}

export async function batch() {
  const model = getEmbeddingModelFromEnv();

  const documents = Array.from(
    { length: 50 },
    (_, i) =>
      `This is document number ${i + 1}. It pertains to the topic ${(i % 5) + 1}`,
  );

  console.log(`Processing ${documents.length} documents...`);
  const start = Date.now();

  const { embeddings } = await embedMany({
    model,
    values: documents,
  });

  const end = Date.now();
  const elapsedTime = end - start;
  const avgTime = (elapsedTime / documents.length).toFixed(2);

  console.log(`Documents processed:          ${documents.length}`);
  console.log(`Embeddings generated:         ${embeddings.length}`);
  console.log(`Embedding dimensions:         ${embeddings[0]?.length}`);
  console.log(`Processing time:              ${elapsedTime}ms`);
  console.log(`Processing time per document: ${avgTime}ms`);
}
