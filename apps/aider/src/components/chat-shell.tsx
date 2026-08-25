"use client";

import { appendMessage, createConversation } from "@/lib/actions";
import { Button, Select, SelectContent, SelectItem, Textarea } from "@jf/ui";
import { PaperPlaneRightIcon } from "@phosphor-icons/react/dist/ssr";
import { useEffect, useRef, useState } from "react";

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
}

interface ChatShellProps {
  userName?: string | null | undefined;
  initialConversationId?: string;
  initialMessages?: Message[];
  initialModel?: string;
}

const MODEL_OPTIONS = [
  { id: "qwen2.5:3b-instruct", label: "Fast" },
  { id: "llama3.1:8b", label: "Capable" },
] as const;

const FALLBACK_ERROR_MESSAGE =
  "Aider isn't reachable right now. The Pi might be offline or the model isn't loaded — try again in a bit.";

interface ChatEvent {
  type: "meta" | "token" | "done" | "error";
  content?: string;
  message?: string;
}

function isChatEvent(value: unknown): value is ChatEvent {
  return (
    typeof value === "object" &&
    value !== null &&
    typeof (value as { type?: unknown }).type === "string"
  );
}

export function ChatShell({
  userName,
  initialConversationId,
  initialMessages,
  initialModel,
}: ChatShellProps) {
  const [messages, setMessages] = useState<Message[]>(initialMessages ?? []);
  const [input, setInput] = useState("");
  const [model, setModel] = useState<string>(initialModel ?? MODEL_OPTIONS[0].id);
  const [conversationId, setConversationId] = useState<string | undefined>(initialConversationId);
  const [isSending, setIsSending] = useState(false);
  const listRef = useRef<HTMLDivElement>(null);

  // biome-ignore lint/correctness/useExhaustiveDependencies: intentionally re-runs on every new message/token to keep the view scrolled to the bottom
  useEffect(() => {
    listRef.current?.scrollTo({ top: listRef.current.scrollHeight, behavior: "smooth" });
  }, [messages]);

  async function handleSend() {
    const content = input.trim();
    if (!content || isSending) return;

    const userMessage: Message = { id: crypto.randomUUID(), role: "user", content };
    const history = [...messages, userMessage];
    setMessages(history);
    setInput("");
    setIsSending(true);

    const assistantId = crypto.randomUUID();
    let assistantStarted = false;
    let assistantContent = "";

    try {
      // Persist the user message, creating the conversation on the first send.
      let activeConversationId = conversationId;
      if (!activeConversationId) {
        const newId = crypto.randomUUID();
        await createConversation(newId, content.slice(0, 50), model);
        await appendMessage(newId, "user", content, model);
        activeConversationId = newId;
        setConversationId(newId);
        // Shallow URL update — flips to /chat/[id] without remounting mid-stream.
        window.history.replaceState(null, "", `/chat/${newId}`);
      } else {
        await appendMessage(activeConversationId, "user", content, model);
      }

      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          model,
          messages: history.map(({ role, content: messageContent }) => ({
            role,
            content: messageContent,
          })),
        }),
      });

      if (!res.ok || !res.body) {
        throw new Error("Backend error");
      }

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";

      while (true) {
        const { value, done } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        let newlineIndex = buffer.indexOf("\n");
        while (newlineIndex >= 0) {
          const line = buffer.slice(0, newlineIndex).trim();
          buffer = buffer.slice(newlineIndex + 1);
          newlineIndex = buffer.indexOf("\n");
          if (!line) continue;

          const event: unknown = JSON.parse(line);
          if (!isChatEvent(event)) continue;

          if (event.type === "token" && event.content) {
            assistantContent += event.content;
            if (!assistantStarted) {
              assistantStarted = true;
              setMessages((prev) => [
                ...prev,
                { id: assistantId, role: "assistant", content: event.content ?? "" },
              ]);
            } else {
              setMessages((prev) =>
                prev.map((m) =>
                  m.id === assistantId ? { ...m, content: m.content + event.content } : m
                )
              );
            }
          }

          if (event.type === "error") {
            throw new Error(event.message ?? "Model backend error");
          }
        }
      }

      if (!assistantStarted) throw new Error("Empty response");

      // Persist the assistant reply now that streaming is complete.
      await appendMessage(activeConversationId, "assistant", assistantContent);
    } catch {
      setMessages((prev) => {
        if (assistantStarted) return prev;
        return [...prev, { id: assistantId, role: "assistant", content: FALLBACK_ERROR_MESSAGE }];
      });
    } finally {
      setIsSending(false);
    }
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      void handleSend();
    }
  }

  return (
    <div className="flex flex-col flex-1 min-h-0 w-full max-w-2xl mx-auto">
      <div className="flex justify-end pt-4">
        <Select value={model} onValueChange={setModel} disabled={isSending} className="w-auto">
          <SelectContent>
            {MODEL_OPTIONS.map((option) => (
              <SelectItem key={option.id} value={option.id}>
                {option.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div ref={listRef} className="flex-1 min-h-0 overflow-y-auto py-4 flex flex-col gap-3">
        {messages.length === 0 ? (
          <p className="m-auto text-center text-sm text-(--grey-400)">
            {userName ? `Hi ${userName}, ask` : "Ask"} me anything.
          </p>
        ) : (
          messages.map((message) => (
            <div
              key={message.id}
              className={
                message.role === "user"
                  ? "self-end max-w-[80%] rounded-[12px] bg-(--primary) px-3 py-2 text-sm"
                  : "self-start max-w-[80%] rounded-[12px] bg-(--surface-150) px-3 py-2 text-sm"
              }
            >
              {message.content}
            </div>
          ))
        )}
      </div>

      <div className="flex items-end gap-2 pb-4 pt-2">
        <Textarea
          value={input}
          onChange={setInput}
          onKeyDown={handleKeyDown}
          placeholder="Message Aider..."
          className="flex-1"
          disabled={isSending}
        />
        <Button
          size="icon"
          onClick={() => void handleSend()}
          disabled={!input.trim() || isSending}
          aria-label="Send message"
        >
          <PaperPlaneRightIcon size={18} />
        </Button>
      </div>
    </div>
  );
}
