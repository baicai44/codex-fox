import dotenv from "dotenv";

const dotenvResult = dotenv.config();
if (dotenvResult.error) {
  console.warn("Warning: Failed to parse .env file:", dotenvResult.error.message);
}

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

  const port = parseInt(process.env.PORT || "3000", 10);
  if (isNaN(port)) {
    throw new Error(`PORT must be a valid number, got: ${process.env.PORT}`);
  }

  const upstreamUrl = process.env.UPSTREAM_URL || "https://api.openai.com/v1/responses";
  try {
    new URL(upstreamUrl);
  } catch {
    throw new Error(`UPSTREAM_URL must be a valid URL, got: ${upstreamUrl}`);
  }

  return {
    openaiApiKey,
    port,
    upstreamUrl,
  };
}
