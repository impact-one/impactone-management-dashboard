export interface LiveResult<T> {
  ok: boolean;
  configured: boolean;
  checkedAt: string;
  message: string;
  data: T | null;
}

export class ReadOnlyClient<T> {
  private cache: { at: number; result: LiveResult<T> } | null = null;
  private pending: Promise<LiveResult<T>> | null = null;

  constructor(
    private readonly options: {
      isConfigured: () => boolean;
      missingMessage: string;
      load: () => Promise<T>;
    },
  ) {}

  async get(): Promise<LiveResult<T>> {
    if (this.cache && Date.now() - this.cache.at < 60_000) return this.cache.result;
    if (this.pending) return this.pending;

    this.pending = this.read().finally(() => {
      this.pending = null;
    });
    return this.pending;
  }

  private async read(): Promise<LiveResult<T>> {
    const checkedAt = new Date().toISOString();
    let result: LiveResult<T>;

    if (!this.options.isConfigured()) {
      result = {
        ok: false,
        configured: false,
        checkedAt,
        message: this.options.missingMessage,
        data: null,
      };
    } else {
      try {
        result = {
          ok: true,
          configured: true,
          checkedAt,
          message: "Read completed. No write was sent.",
          data: await this.options.load(),
        };
      } catch (error) {
        const message = error instanceof Error ? error.message : "Read failed.";
        result = {
          ok: false,
          configured: true,
          checkedAt,
          message,
          data: null,
        };
      }
    }

    this.cache = { at: Date.now(), result };
    return result;
  }
}

export async function readJson(url: string, headers: Record<string, string>): Promise<unknown> {
  const response = await fetch(url, {
    method: "GET",
    headers,
    signal: AbortSignal.timeout(8000),
  });
  if (!response.ok) {
    throw new Error(`Read failed with status ${response.status}. No write was attempted.`);
  }
  return response.json() as Promise<unknown>;
}
