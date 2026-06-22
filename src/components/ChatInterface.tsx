"use client";

import { FormEvent, useCallback, useEffect, useRef, useState } from "react";

type ChatMessage = {
  id: string;
  role: "user" | "assistant";
  content: string;
};

type StreamEvent = {
  event: string;
  data: string;
};

function parseEvents(buffer: string) {
  const blocks = buffer.split("\n\n");
  const remainder = blocks.pop() || "";
  const events: StreamEvent[] = [];

  for (const block of blocks) {
    const event = block.split("\n").find((line) => line.startsWith("event:"))?.slice(6).trim() || "message";
    const data = block.split("\n").find((line) => line.startsWith("data:"))?.slice(5).trim();
    if (data) events.push({ event, data });
  }

  return { events, remainder };
}

export function ChatInterface() {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [draft, setDraft] = useState("");
  const [isStreaming, setIsStreaming] = useState(false);
  const [error, setError] = useState("");
  const controllerRef = useRef<AbortController | null>(null);
  const activeResponseRef = useRef("");
  const frameRef = useRef<number | null>(null);

  const flushResponse = useCallback((id: string) => {
    frameRef.current = null;
    const content = activeResponseRef.current;
    setMessages((current) => current.map((message) => (message.id === id ? { ...message, content } : message)));
  }, []);

  useEffect(() => {
    return () => {
      controllerRef.current?.abort();
      if (frameRef.current !== null) cancelAnimationFrame(frameRef.current);
    };
  }, []);

  const submit = useCallback(async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const content = draft.trim();
    if (!content || isStreaming) return;

    const userMessage: ChatMessage = { id: crypto.randomUUID(), role: "user", content };
    const assistantId = crypto.randomUUID();
    const outgoing = [...messages, userMessage];
    const controller = new AbortController();

    controllerRef.current?.abort();
    controllerRef.current = controller;
    activeResponseRef.current = "";
    setMessages([...outgoing, { id: assistantId, role: "assistant", content: "" }]);
    setDraft("");
    setError("");
    setIsStreaming(true);

    try {
      const response = await fetch("/api/chat", {
        method: "POST",
        signal: controller.signal,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: outgoing.map(({ role, content: messageContent }) => ({ role, content: messageContent })),
        }),
      });

      if (!response.body) throw new Error("The AI service returned an empty response.");

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const parsed = parseEvents(buffer);
        buffer = parsed.remainder;

        for (const eventData of parsed.events) {
          const payload = JSON.parse(eventData.data) as { text?: unknown; message?: unknown };

          if (eventData.event === "token" && typeof payload.text === "string") {
            activeResponseRef.current += payload.text;
            if (frameRef.current === null) {
              frameRef.current = requestAnimationFrame(() => flushResponse(assistantId));
            }
          }

          if (eventData.event === "error" && typeof payload.message === "string") {
            throw new Error(payload.message);
          }
        }
      }

      if (frameRef.current !== null) {
        cancelAnimationFrame(frameRef.current);
        frameRef.current = null;
      }
      flushResponse(assistantId);
    } catch (requestError) {
      if (requestError instanceof DOMException && requestError.name === "AbortError") return;
      setError(requestError instanceof Error ? requestError.message : "Unable to reach the AI service.");
      setMessages((current) => current.filter((message) => message.id !== assistantId));
    } finally {
      if (controllerRef.current === controller) controllerRef.current = null;
      setIsStreaming(false);
    }
  }, [draft, flushResponse, isStreaming, messages]);

  return (
    <section aria-label="AI chat" className="mx-auto w-full max-w-3xl rounded-lg border border-white/10 bg-zinc-950 p-4 shadow-2xl shadow-black/30">
      <div aria-live="polite" className="min-h-56 space-y-4 overflow-y-auto rounded-md bg-black/20 p-3">
        {messages.length === 0 ? <p className="text-sm text-zinc-400">Ask a focused academic question to get a concise answer.</p> : null}
        {messages.map((message) => (
          <article key={message.id} className={message.role === "user" ? "ml-auto max-w-[85%] rounded-md bg-[#c5b358] px-3 py-2 text-sm text-zinc-950" : "max-w-[85%] whitespace-pre-wrap rounded-md border border-white/10 bg-zinc-900 px-3 py-2 text-sm text-zinc-100"}>
            {message.content || (isStreaming && message.role === "assistant" ? "Thinking..." : "")}
          </article>
        ))}
      </div>
      {error ? <p role="alert" className="mt-3 text-sm text-red-300">{error}</p> : null}
      <form onSubmit={submit} className="mt-4 flex gap-2">
        <label className="sr-only" htmlFor="chat-message">Ask JustFlamsit</label>
        <input id="chat-message" value={draft} onChange={(event) => setDraft(event.target.value)} disabled={isStreaming} maxLength={12_000} className="min-w-0 flex-1 rounded-md border border-white/15 bg-zinc-900 px-3 py-2 text-sm text-white outline-none placeholder:text-zinc-500 focus:border-[#c5b358]" placeholder="Ask a question about your study material" />
        <button type="submit" disabled={isStreaming || !draft.trim()} className="rounded-md bg-[#c5b358] px-4 py-2 text-sm font-semibold text-zinc-950 transition hover:bg-[#dec96a] disabled:cursor-not-allowed disabled:opacity-50">
          {isStreaming ? "Generating" : "Send"}
        </button>
      </form>
    </section>
  );
}
