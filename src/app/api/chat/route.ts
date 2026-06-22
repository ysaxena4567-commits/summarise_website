export const runtime = "edge";
export const dynamic = "force-dynamic";

const GEMINI_MODEL = process.env.GEMINI_CHAT_MODEL || "gemini-2.5-flash-lite";
const MAX_MESSAGE_CHARS = 12_000;
const UPSTREAM_TIMEOUT_MS = 25_000;

type ChatMessage = {
  role?: unknown;
  content?: unknown;
};

type ChatRequest = {
  messages?: unknown;
};

function sse(event: string, payload: unknown) {
  return `event: ${event}\ndata: ${JSON.stringify(payload)}\n\n`;
}

function streamResponse(stream: ReadableStream<Uint8Array>, status = 200) {
  return new Response(stream, {
    status,
    headers: {
      "Cache-Control": "no-store, no-transform",
      "Content-Type": "text/event-stream; charset=utf-8",
      Connection: "keep-alive",
      "X-Accel-Buffering": "no",
    },
  });
}

function errorStream(message: string, status: number) {
  const encoder = new TextEncoder();
  return streamResponse(
    new ReadableStream({
      start(controller) {
        controller.enqueue(encoder.encode(sse("error", { message })));
        controller.enqueue(encoder.encode(sse("done", {})));
        controller.close();
      },
    }),
    status,
  );
}

function normalizeMessages(value: unknown) {
  if (!Array.isArray(value)) return [];

  return value
    .map((message): { role: "user" | "model"; text: string } | null => {
      if (!message || typeof message !== "object") return null;

      const { role, content } = message as ChatMessage;
      if (typeof content !== "string") return null;

      const text = content.trim().slice(0, MAX_MESSAGE_CHARS);
      if (!text) return null;

      return {
        role: role === "assistant" ? "model" : "user",
        text,
      };
    })
    .filter((message): message is { role: "user" | "model"; text: string } => message !== null)
    .slice(-12);
}

function isAllowedOrigin(request: Request) {
  const origin = request.headers.get("origin");
  const requestOrigin = new URL(request.url).origin;
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, "");

  if (!origin) return false;
  if (origin === requestOrigin || origin === siteUrl) return true;

  return process.env.NODE_ENV !== "production" && (origin === "http://localhost:3000" || origin === "http://127.0.0.1:3000");
}

function extractText(payload: unknown) {
  if (!payload || typeof payload !== "object") return "";

  const data = payload as {
    candidates?: Array<{ content?: { parts?: Array<{ text?: unknown }> } }>;
  };

  return data.candidates?.[0]?.content?.parts
    ?.map((part) => (typeof part.text === "string" ? part.text : ""))
    .join("") || "";
}

function extractError(payload: unknown) {
  if (!payload || typeof payload !== "object") return "The AI service returned an invalid response.";

  const data = payload as { error?: { message?: unknown } };
  return typeof data.error?.message === "string" ? data.error.message : "The AI service is temporarily unavailable.";
}

export async function POST(request: Request) {
  try {
    if (!isAllowedOrigin(request)) {
      return errorStream("Invalid request origin.", 403);
    }

    const contentLength = Number(request.headers.get("content-length") || 0);
    if (Number.isFinite(contentLength) && contentLength > 64_000) {
      return errorStream("Chat request is too large.", 413);
    }

    const body = (await request.json().catch(() => null)) as ChatRequest | null;
    const messages = normalizeMessages(body?.messages);
    if (!messages.length) {
      return errorStream("Enter a message before sending.", 400);
    }

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      console.error("Chat route is missing GEMINI_API_KEY.");
      return errorStream("The AI service is not configured.", 503);
    }

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), UPSTREAM_TIMEOUT_MS);
    const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(GEMINI_MODEL)}:streamGenerateContent?alt=sse&key=${encodeURIComponent(apiKey)}`;

    let upstream: Response;
    try {
      upstream = await fetch(endpoint, {
        method: "POST",
        signal: controller.signal,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          systemInstruction: {
            parts: [
              {
                text: "You are JustFlamsit. Give accurate, concise, student-friendly academic help. Return a valid JSON object with one string field named answer. Do not invent facts.",
              },
            ],
          },
          contents: messages.map((message) => ({
            role: message.role,
            parts: [{ text: message.text }],
          })),
          generationConfig: {
            temperature: 0.1,
            responseMimeType: "application/json",
          },
        }),
      });
    } catch (error) {
      const timedOut = error instanceof DOMException && error.name === "AbortError";
      console.error("Gemini chat upstream request failed.", { timedOut, error });
      clearTimeout(timeout);
      return errorStream(timedOut ? "The AI service took too long. Please try again." : "The AI service is temporarily unavailable.", timedOut ? 504 : 502);
    }

    if (!upstream.ok || !upstream.body) {
      const payload = await upstream.json().catch(() => null);
      console.error("Gemini chat upstream returned an error.", { status: upstream.status, message: extractError(payload) });
      clearTimeout(timeout);
      return errorStream(extractError(payload), upstream.status >= 500 ? 502 : upstream.status);
    }

    const encoder = new TextEncoder();
    const decoder = new TextDecoder();
    const reader = upstream.body.getReader();
    let buffered = "";

    return streamResponse(
      new ReadableStream({
        async start(controller) {
          try {
            while (true) {
              const { done, value } = await reader.read();
              if (done) break;

              buffered += decoder.decode(value, { stream: true });
              const events = buffered.split("\n\n");
              buffered = events.pop() || "";

              for (const event of events) {
                const dataLine = event.split("\n").find((line) => line.startsWith("data:"));
                if (!dataLine) continue;

                const payloadText = dataLine.slice(5).trim();
                if (!payloadText || payloadText === "[DONE]") continue;

                const payload = JSON.parse(payloadText) as unknown;
                const text = extractText(payload);
                if (text) controller.enqueue(encoder.encode(sse("token", { text })));
              }
            }

            controller.enqueue(encoder.encode(sse("done", {})));
          } catch (error) {
            console.error("Gemini chat stream processing failed.", error);
            controller.enqueue(encoder.encode(sse("error", { message: "The AI response was interrupted. Please try again." })));
            controller.enqueue(encoder.encode(sse("done", {})));
          } finally {
            clearTimeout(timeout);
            reader.releaseLock();
            controller.close();
          }
        },
        async cancel() {
          await reader.cancel().catch(() => undefined);
        },
      }),
    );
  } catch (error) {
    console.error("Unhandled chat route failure.", error);
    return errorStream("Unable to start the AI response. Please try again.", 500);
  }
}
