import { createGoogleGenerativeAI } from '@ai-sdk/google';
import { generateText, streamText, tool, LanguageModel } from 'ai';
import { getConfig } from './config.js';

// Default model - Gemini Flash Latest
const DEFAULT_MODEL_ID = 'gemini-flash-latest';

/**
 * Get the configured AI model
 * Uses Vercel AI SDK for unified multi-provider abstraction
 */
export function getModel(): LanguageModel {
  const config = getConfig();
  const modelId = config.modelId || DEFAULT_MODEL_ID;

  // Create Google AI provider with explicit API key
  const google = createGoogleGenerativeAI({
    apiKey: config.googleApiKey,
  });

  return google(modelId);
}

/**
 * Re-export AI SDK utilities for convenience
 */
export { generateText, streamText, tool };

/**
 * Example usage:
 *
 * import { model, generateText, tool } from './model.js';
 * import { z } from 'zod';
 *
 * const result = await generateText({
 *   model,
 *   tools: {
 *     readFile: tool({
 *       description: 'Read a file from the repository',
 *       parameters: z.object({
 *         path: z.string().describe('Path to the file'),
 *       }),
 *       execute: async ({ path }) => {
 *         // implementation
 *       },
 *     }),
 *   },
 *   maxSteps: 10,
 *   system: 'You are a helpful assistant.',
 *   prompt: 'Analyze this code.',
 * });
 */
