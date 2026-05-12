import dotenv from "dotenv";
import path from "path";

// 开发时从项目根目录读 .env，打包后由主进程注入 process.env（dotenv 作为 fallback）
const envPath = (process as any).resourcesPath
  ? path.join((process as any).resourcesPath, ".env")
  : path.resolve(".env");

const dotenvResult = dotenv.config({ path: envPath });
if (dotenvResult.error) {
  console.warn(`Warning: Failed to parse .env from ${envPath}:`, dotenvResult.error.message);
}

export interface Config {
  upstreamApiKey: string;
  upstreamUrl: string;
  port: number;
}

export function loadConfig(): Config {
  const upstreamApiKey = process.env.UPSTREAM_API_KEY || "";
  const upstreamUrl = process.env.UPSTREAM_URL;
  if (!upstreamUrl) {
    throw new Error("UPSTREAM_URL environment variable is required");
  }
  try {
    new URL(upstreamUrl);
  } catch {
    throw new Error(`UPSTREAM_URL must be a valid URL, got: ${upstreamUrl}`);
  }

  const port = parseInt(process.env.PORT || "3000", 10);
  if (isNaN(port)) {
    throw new Error(`PORT must be a valid number, got: ${process.env.PORT}`);
  }

  return { upstreamApiKey, upstreamUrl, port };
}
