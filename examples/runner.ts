#!/usr/bin/env tsx

import { resolve } from "node:path";

async function runExample() {
  const [, , exampleFile, functionName] = process.argv;

  if (!exampleFile || !functionName) {
    console.error("Usage: pnpm example <file> <function>");
    console.error("Example: pnpm example embeddings basicEmbeddingExample");
    process.exit(1);
  }

  const fileName = `${exampleFile}.example.ts`;

  try {
    const exampleModule = await import(
      resolve(process.cwd(), "examples", fileName)
    );

    if (typeof exampleModule[functionName] !== "function") {
      console.error(`Function '${functionName}' not found in ${fileName}`);
      console.error(
        "Available functions:",
        Object.keys(exampleModule).filter(
          (key) => typeof exampleModule[key] === "function",
        ),
      );
      process.exit(1);
    }

    console.log(`Running ${functionName} from ${exampleFile}.ts...`);
    console.log("─".repeat(50));

    await exampleModule[functionName]();

    console.log("─".repeat(50));
    console.log(`✅ ${functionName} completed successfully`);
  } catch (error) {
    console.error(`❌ Error running ${functionName}:`, error);
    process.exit(1);
  }
}

runExample();
