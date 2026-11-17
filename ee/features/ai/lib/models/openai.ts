import { OpenAI } from "openai";

let client: OpenAI | undefined;

/** Construct the real provider only when an AI operation is requested. */
export function getOpenAIClient(): OpenAI {
  client ??= new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  return client;
}
