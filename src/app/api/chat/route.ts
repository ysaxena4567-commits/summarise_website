import { GoogleGenerativeAI, type Content } from "@google/generative-ai";

export const runtime = "edge";
export const dynamic = "force-dynamic";

const GEMINI_MODEL = process.env.GEMINI_CHAT_MODEL || "gemini-2.5-flash-lite";
const MAX_MESSAGE_CHARS = 12_000;
const MAX_MESSAGES = 12;
const UPSTREAM_TIMEOUT_MS = 25_000;
const SYSTEM_INSTRUCTION = "You are JustFlamsit, a precise academic study assistant. Give accurate, concise, student-friendly help. Return a valid JSON object with exactly one string field named answer. Do not invent facts.";

type IncomingMessage = {
  role?: unknown;
  content?: unknown;
};

type ChatRequest = {
  messages?: unknown;
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

function normalizeMessages(value: unknown): Content[] {
  if (!Array.isArray(value)) return [];

  return value
    .map((message): Content | null => {
      if (!message || typeof message !== "object") return null;

      const { role, content } = message as IncomingMessage;
      if (typeof content !== "string") return null;

      const text = content.trim().slice(0, MAX_MESSAGE_CHARS);
      if (!text) return null;

      return {
        role: role === "assistant" ? "model" : "user",
        parts: [{ text }],
      };
    })
    .filter((message): message is Content => message !== null)
    .slice(-MAX_MESSAGES);
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
    const contents = normalizeMessages(body?.messages);
    if (!contents.length) {
      return createErrorResponse("Enter a message before sending.", 400);
    }

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      console.error("Chat route is missing GEMINI_API_KEY.");
      return createErrorResponse("The AI service is not configured.", 503);
    }

    const abortController = new AbortController();
    const timeoutId = setTimeout(() => abortController.abort(), UPSTREAM_TIMEOUT_MS);
    const client = new GoogleGenerativeAI(apiKey);
    const model = client.getGenerativeModel({
      model: GEMINI_MODEL,
      systemInstruction: SYSTEM_INSTRUCTION,
      generationConfig: {
        temperature: 0.1,
        responseMimeType: "application/json",
      },
    });

    try {
      const result = await model.generateContentStream({ contents }, { signal: abortController.signal });
      const encoder = new TextEncoder();

      return createStreamResponse(
        new ReadableStream<Uint8Array>({
          async start(controller) {
            try {
              for await (const chunk of result.stream) {
                const chunkText = chunk.text();
                if (chunkText) {
                  controller.enqueue(encoder.encode(formatSse("token", { text: chunkText })));
                }
              }

              controller.enqueue(encoder.encode(formatSse("done", {})));
            } catch (error) {
              const timedOut = error instanceof DOMException && error.name === "AbortError";
              console.error("Gemini chat stream failed.", { timedOut, error });
              controller.enqueue(encoder.encode(formatSse("error", {
                message: timedOut ? "The AI service took too long. Please try again." : "The AI response was interrupted. Please try again.",
              })));
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
      console.error("Gemini chat request failed.", { timedOut, error });
      return createErrorResponse(timedOut ? "The AI service took too long. Please try again." : "The AI service is temporarily unavailable.", timedOut ? 504 : 502);
    }
  } catch (error) {
    console.error("Unhandled chat route failure.", error);
    return createErrorResponse("Unable to start the AI response. Please try again.", 500);
  }
}
