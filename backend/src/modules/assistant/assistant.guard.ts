const SECRET_PATTERNS: { pattern: RegExp; message: string }[] = [
  { pattern: /\bsk-[A-Za-z0-9_-]{8,}/, message: "This text looks like an API key. Remove it before sending." },
  { pattern: /\bxox[baprs]-[A-Za-z0-9-]+/, message: "This text looks like a Slack token. Remove it before sending." },
  { pattern: /\bya29\.[A-Za-z0-9._-]+/, message: "This text looks like a Google token. Remove it before sending." },
  { pattern: /\bpk_\d+_[A-Za-z0-9]+/, message: "This text looks like a ClickUp token. Remove it before sending." },
  { pattern: /-----BEGIN [A-Z0-9 ]+-----/, message: "This text looks like a private key. Remove it before sending." },
  {
    pattern: /\b(password|passwd|secret|api[_-]?key|access[_-]?token|bot[_-]?token)\s*[:=]\s*\S+/i,
    message: "This text looks like a password or secret. Remove it before sending.",
  },
  {
    pattern: /\bBearer\s+[A-Za-z0-9\-._~+/]{12,}/i,
    message: "This text looks like an access token. Remove it before sending.",
  },
  {
    pattern: /\b(OPENAI_API_KEY|ANTHROPIC_API_KEY|SLACK_BOT_TOKEN|CLICKUP_API_TOKEN|GOOGLE_ACCESS_TOKEN|JWT_SECRET)\s*=\s*\S+/,
    message: "This text looks like an environment secret. Remove it before sending.",
  },
];

export function findConfidential(text: string): string | null {
  for (const rule of SECRET_PATTERNS) {
    if (rule.pattern.test(text)) return rule.message;
  }
  return null;
}
