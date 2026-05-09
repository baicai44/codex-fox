import dotenv from "dotenv";

const dotenvResult = dotenv.config();
if (dotenvResult.error) {
  console.warn("Warning: Failed to parse .env file:", dotenvResult.error.message);
}

export interface Config {
  deepseekApiKey: string;
  deepseekUrl: string;
  port: number;
}

export function loadConfig(): Config {
  const deepseekApiKey = process.env.DEEPSEEK_API_KEY;
  if (!deepseekApiKey) {
    throw new Error("DEEPSEEK_API_KEY environment variable is required");
  }

  const deepseekUrl = process.env.DEEPSEEK_URL;
  if (!deepseekUrl) {
    throw new Error("DEEPSEEK_URL environment variable is required");
  }
  try {
    new URL(deepseekUrl);
  } catch {
    throw new Error(`DEEPSEEK_URL must be a valid URL, got: ${deepseekUrl}`);
  }

  const port = parseInt(process.env.PORT || "3000", 10);
  if (isNaN(port)) {
    throw new Error(`PORT must be a valid number, got: ${process.env.PORT}`);
  }

  return {
    deepseekApiKey,
    deepseekUrl,
    port,
  };
}
