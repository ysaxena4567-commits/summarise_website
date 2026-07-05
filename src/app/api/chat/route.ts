export const runtime = "edge";
export const dynamic = "force-dynamic";

const DEEPSEEK_MODEL = process.env.DEEPSEEK_MODEL || "deepseek-chat";
const MAX_MESSAGE_CHARS = 12_000;
const MAX_MESSAGES = 12;
const UPSTREAM_TIMEOUT_MS = 25_000;
const SYSTEM_INSTRUCTION =
  "You are JustFlamsit, a precise academic study assistant. Give accurate, concise, student-friendly help. Do not invent facts.";

type IncomingMessage = {
  role?: unknown;
  content?: unknown;
};

type ChatRequest = {
  messages?: unknown;
};

type DeepSeekMessage = {
  role: "system" | "user" | "assistant";
  content: string;
};

type DeepSeekStreamChunk = {
  choices?: Array<{
    delta?: {
      content?: string;
    };
  }>;
};

function formatSse(event: string, payload: unknown) {
  return `event: ${event}\ndata: ${JSON.stringify(payload)}\n\n`;
}

function createStreamResponse(stream: ReadableStream<Uint8Array>, status = 200) {
  return new Response(stream, {
    status,
    headers: {
      "Content-Type": "text/event-stream; charset=utf-8",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
      "X-Accel-Buffering": "no",
    },
  });
}

function createErrorResponse(message: string, status: number) {
  const encoder = new TextEncoder();

  return createStreamResponse(
    new ReadableStream<Uint8Array>({
      start(controller) {
        controller.enqueue(encoder.encode(formatSse("error", { message })));
        controller.enqueue(encoder.encode(formatSse("done", {})));
        controller.close();
      },
    }),
    status,
  );
}

function getAllowedOrigins(request: Request) {
  const origins = new Set([new URL(request.url).origin]);
  const configuredSiteUrl = process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, "");

  if (configuredSiteUrl) origins.add(configuredSiteUrl);

  if (process.env.NODE_ENV !== "production") {
    origins.add("http://localhost:3000");
    origins.add("http://127.0.0.1:3000");
  }

  return origins;
}

function getDeepSeekApiKey() {
  return (process.env.DEEPSEEK_API_KEY || "").trim();
}

function normalizeMessages(value: unknown): DeepSeekMessage[] {
  if (!Array.isArray(value)) return [];

  return value
    .map((message): DeepSeekMessage | null => {
      if (!message || typeof message !== "object") return null;

      const { role, content } = message as IncomingMessage;
      if (typeof content !== "string") return null;

      const text = content.trim().slice(0, MAX_MESSAGE_CHARS);
      if (!text) return null;

      return {
        role: role === "assistant" ? "assistant" : "user",
        content: text,
      };
    })
    .filter((message): message is DeepSeekMessage => message !== null)
    .slice(-MAX_MESSAGES);
}

function parseDeepSeekStreamChunk(line: string) {
  const trimmed = line.trim();
  if (!trimmed.startsWith("data:")) return "";

  const payload = trimmed.slice(5).trim();
  if (!payload || payload === "[DONE]") return "";

  try {
    const parsed = JSON.parse(payload) as DeepSeekStreamChunk;
    return parsed.choices?.[0]?.delta?.content || "";
  } catch {
    return "";
  }
}

export async function POST(request: Request) {
  try {
    const origin = request.headers.get("origin");
    if (!origin || !getAllowedOrigins(request).has(origin)) {
      return createErrorResponse("Invalid request origin.", 403);
    }

    const contentLength = Number(request.headers.get("content-length") || 0);
    if (Number.isFinite(contentLength) && contentLength > 64_000) {
      return createErrorResponse("Chat request is too large.", 413);
    }

    const body = (await request.json().catch(() => null)) as ChatRequest | null;
    const messages = normalizeMessages(body?.messages);
    if (!messages.length) {
      return createErrorResponse("Enter a message before sending.", 400);
    }

    const apiKey = getDeepSeekApiKey();
    if (!apiKey) {
      console.error("Chat route is missing DEEPSEEK_API_KEY.");
      return createErrorResponse("The AI service is not configured.", 503);
    }

    const abortController = new AbortController();
    const timeoutId = setTimeout(() => abortController.abort(), UPSTREAM_TIMEOUT_MS);

    try {
      const upstreamResponse = await fetch("https://api.deepseek.com/chat/completions", {
        method: "POST",
        signal: abortController.signal,
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: DEEPSEEK_MODEL,
          temperature: 0.2,
          stream: true,
          messages: [
            {
              role: "system",
              content: SYSTEM_INSTRUCTION,
            },
            ...messages,
          ],
        }),
      });

      if (!upstreamResponse.ok || !upstreamResponse.body) {
        clearTimeout(timeoutId);
        console.error("DeepSeek chat request failed.", { status: upstreamResponse.status });
        return createErrorResponse("The AI service is not configured.", 502);
      }

      const encoder = new TextEncoder();
      const decoder = new TextDecoder();

      return createStreamResponse(
        new ReadableStream<Uint8Array>({
          async start(controller) {
            const reader = upstreamResponse.body!.getReader();
            let bufferedText = "";

            try {
              while (true) {
                const { value, done } = await reader.read();
                if (done) break;

                bufferedText += decoder.decode(value, { stream: true });
                const lines = bufferedText.split("\n");
                bufferedText = lines.pop() || "";

                for (const line of lines) {
                  const chunkText = parseDeepSeekStreamChunk(line);
                  if (chunkText) {
                    controller.enqueue(encoder.encode(formatSse("token", { text: chunkText })));
                  }
                }
              }

              controller.enqueue(encoder.encode(formatSse("done", {})));
            } catch (error) {
              const timedOut = error instanceof DOMException && error.name === "AbortError";
              console.error("DeepSeek chat stream failed.", { timedOut, error });
              controller.enqueue(
                encoder.encode(
                  formatSse("error", {
                    message: timedOut
                      ? "The AI service took too long. Please try again."
                      : "The AI response was interrupted. Please try again.",
                  }),
                ),
              );
              controller.enqueue(encoder.encode(formatSse("done", {})));
            } finally {
              clearTimeout(timeoutId);
              controller.close();
            }
          },
          cancel() {
            abortController.abort();
            clearTimeout(timeoutId);
          },
        }),
      );
    } catch (error) {
      clearTimeout(timeoutId);
      const timedOut = error instanceof DOMException && error.name === "AbortError";
      console.error("DeepSeek chat request failed.", { timedOut, error });
      return createErrorResponse(
        timedOut ? "The AI service took too long. Please try again." : "The AI service is temporarily unavailable.",
        timedOut ? 504 : 502,
      );
    }
  } catch (error) {
    console.error("Unhandled chat route failure.", error);
    return createErrorResponse("Unable to start the AI response. Please try again.", 500);
  }
}
