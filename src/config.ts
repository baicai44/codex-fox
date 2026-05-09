import dotenv from "dotenv";

dotenv.config();

export interface Config {
  openaiApiKey: string;
  port: number;
  upstreamUrl: string;
}

export function loadConfig(): Config {
  const openaiApiKey = process.env.OPENAI_API_KEY;
  if (!openaiApiKey) {
    throw new Error("OPENAI_API_KEY environment variable is required");
  }

  return {
    openaiApiKey,
    port: parseInt(process.env.PORT || "3000", 10),
    upstreamUrl:
      process.env.UPSTREAM_URL || "https://api.openai.com/v1/responses",
  };
}
