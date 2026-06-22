"use client";

import { FormEvent, useEffect, useRef, useState } from "react";

type ChatMessage = {
  id: string;
  role: "user" | "assistant";
  content: string;
};

type ServerEvent = {
  event: string;
  data: string;
};

function parseSseEvents(buffer: string) {
  const blocks = buffer.split("\n\n");
  const remainder = blocks.pop() || "";
  const events: ServerEvent[] = [];

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
  const [response, setResponse] = useState("");
  const [isStreaming, setIsStreaming] = useState(false);
  const [error, setError] = useState("");
  const abortControllerRef = useRef<AbortController | null>(null);
  const responseRef = useRef("");

  useEffect(() => {
    return () => abortControllerRef.current?.abort();
  }, []);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const question = draft.trim();
    if (!question || isStreaming) return;

    const userMessage: ChatMessage = {
      id: crypto.randomUUID(),
      role: "user",
      content: question,
    };
    const outgoingMessages = [...messages, userMessage];
    const abortController = new AbortController();

    abortControllerRef.current?.abort();
    abortControllerRef.current = abortController;
    responseRef.current = "";
    setMessages(outgoingMessages);
    setResponse("");
    setDraft("");
    setError("");
    setIsStreaming(true);

    try {
      const networkResponse = await fetch("/api/chat", {
        method: "POST",
        signal: abortController.signal,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: outgoingMessages.map(({ role, content }) => ({ role, content })),
        }),
      });

      if (!networkResponse.body) {
        throw new Error("The AI service returned an empty response.");
      }

      const reader = networkResponse.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const parsed = parseSseEvents(buffer);
        buffer = parsed.remainder;

        for (const serverEvent of parsed.events) {
          let payload: { text?: unknown; message?: unknown };

          try {
            payload = JSON.parse(serverEvent.data) as { text?: unknown; message?: unknown };
          } catch {
            continue;
          }

          if (serverEvent.event === "token" && typeof payload.text === "string") {
            const chunkText = payload.text;
            responseRef.current += chunkText;
            setResponse((previousResponse) => previousResponse + chunkText);
          }

          if (serverEvent.event === "error" && typeof payload.message === "string") {
            throw new Error(payload.message);
          }
        }
      }

      if (responseRef.current) {
        setMessages((currentMessages) => [
          ...currentMessages,
          { id: crypto.randomUUID(), role: "assistant", content: responseRef.current },
        ]);
      }
      setResponse("");
    } catch (requestError) {
      if (!(requestError instanceof DOMException && requestError.name === "AbortError")) {
        setError(requestError instanceof Error ? requestError.message : "Unable to reach the AI service.");
      }
    } finally {
      if (abortControllerRef.current === abortController) abortControllerRef.current = null;
      setIsStreaming(false);
    }
  }

  return (
    <section aria-label="AI chat" className="mx-auto w-full max-w-3xl rounded-lg border border-white/10 bg-zinc-950 p-4 shadow-2xl shadow-black/30">
      <div aria-live="polite" className="min-h-56 space-y-4 overflow-y-auto rounded-md bg-black/20 p-3">
        {messages.length === 0 && !response ? <p className="text-sm text-zinc-400">Ask a focused academic question to get a concise answer.</p> : null}
        {messages.map((message) => (
          <article key={message.id} className={message.role === "user" ? "ml-auto max-w-[85%] rounded-md bg-[#c5b358] px-3 py-2 text-sm text-zinc-950" : "max-w-[85%] whitespace-pre-wrap rounded-md border border-white/10 bg-zinc-900 px-3 py-2 text-sm text-zinc-100"}>
            {message.content}
          </article>
        ))}
        {isStreaming ? <article className="max-w-[85%] whitespace-pre-wrap rounded-md border border-white/10 bg-zinc-900 px-3 py-2 text-sm text-zinc-100">{response || "Thinking..."}</article> : null}
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
