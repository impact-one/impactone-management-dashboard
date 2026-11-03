import "dotenv/config";

function optional(name: string): string | undefined {
  const value = process.env[name]?.trim();
  return value ? value : undefined;
}

const nodeEnv = process.env.NODE_ENV ?? "development";
const jwtFromEnv = process.env.JWT_SECRET?.trim();

if (nodeEnv === "production" && !jwtFromEnv) {
  throw new Error("JWT_SECRET is required when NODE_ENV is production.");
}

if (!jwtFromEnv) {
  console.warn("JWT_SECRET is not set. Using a development-only secret. Do not deploy this way.");
}

export const env = {
  nodeEnv,
  port: Number(process.env.PORT ?? 4000),
  jwtSecret: jwtFromEnv || "dev-only-change-me",
  corsOrigin: process.env.CORS_ORIGIN?.trim() || "http://localhost:5173",
  clickupToken: optional("CLICKUP_API_TOKEN"),
  clickupTeamId: optional("CLICKUP_TEAM_ID"),
  googleAccessToken: optional("GOOGLE_ACCESS_TOKEN"),
  googleCalendarId: process.env.GOOGLE_CALENDAR_ID?.trim() || "primary",
  slackBotToken: optional("SLACK_BOT_TOKEN"),
  slackChannelId: optional("SLACK_CHANNEL_ID"),
  openaiApiKey: optional("OPENAI_API_KEY"),
  openaiModel: process.env.OPENAI_MODEL?.trim() || "gpt-4o-mini",
  anthropicApiKey: optional("ANTHROPIC_API_KEY"),
  anthropicModel: process.env.ANTHROPIC_MODEL?.trim() || "claude-sonnet-5-5",
  otterApiKey: optional("OTTER_API_KEY"),
  webRoot: optional("WEB_ROOT"),
};
