"use client";

import { useSidebar } from "@/components/sidebar-provider";
import { appendMessage, createConversation } from "@/lib/actions";
import { Button, Select, SelectItem, Textarea } from "@jf/ui";
import { PaperPlaneRightIcon } from "@phosphor-icons/react/dist/ssr";
import { useEffect, useRef, useState } from "react";

interface ToolUse {
  name: string;
  arguments?: string;
}

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  // Present when the assistant fetched real data via a tool for this reply, so
  // the user can tell a grounded answer from one spoken from memory.
  tool?: ToolUse;
}

// Friendly labels for known tools; unknown tools fall back to their raw name.
const TOOL_LABELS: Record<string, string> = {
  get_workouts_in_range: "Looked up your workouts",
};

const MONTH_NAMES = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];

// Turn the raw tool arguments into a short human phrase for the chip, so the
// user can see exactly what the model requested (e.g. a wrong date range).
function describeToolArgs(rawArguments: string | undefined): string | null {
  if (!rawArguments) return null;
  try {
    const args = JSON.parse(rawArguments) as Record<string, unknown>;
    if (typeof args.period === "string") return args.period.replace(/_/g, " ");
    if (typeof args.month === "string") {
      const match = /^(\d{4})-(\d{2})$/.exec(args.month);
      if (match) {
        const name = MONTH_NAMES[Number(match[2]) - 1];
        if (name) return `${name} ${match[1]}`;
      }
      return args.month;
    }
    if (typeof args.start_date === "string" && typeof args.end_date === "string") {
      return `${args.start_date} → ${args.end_date}`;
    }
    return null;
  } catch {
    return null;
  }
}

function toolChipText(tool: ToolUse): string {
  const label = TOOL_LABELS[tool.name] ?? tool.name;
  const detail = describeToolArgs(tool.arguments);
  return detail ? `${label} · ${detail}` : label;
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
  type: "meta" | "tool" | "token" | "done" | "error";
  content?: string;
  message?: string;
  name?: string;
  arguments?: string;
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
  const { setActiveId, upsertToTop } = useSidebar();

  // biome-ignore lint/correctness/useExhaustiveDependencies: intentionally re-runs on every new message/token to keep the view scrolled to the bottom
  useEffect(() => {
    listRef.current?.scrollTo({ top: listRef.current.scrollHeight, behavior: "smooth" });
  }, [messages]);

  // Drive the sidebar's active highlight from the current conversation.
  useEffect(() => {
    setActiveId(conversationId);
  }, [conversationId, setActiveId]);

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
    // A `tool` event arrives before the first token; hold it until the assistant
    // message is created so the chip attaches to the right reply.
    let pendingTool: ToolUse | undefined;

    try {
      // Persist the user message, creating the conversation on the first send.
      let activeConversationId = conversationId;
      if (!activeConversationId) {
        const newId = crypto.randomUUID();
        const title = content.slice(0, 50);
        await createConversation(newId, title, model);
        await appendMessage(newId, "user", content, model);
        activeConversationId = newId;
        setConversationId(newId);
        // Shallow URL update — flips to /chat/[id] without remounting mid-stream.
        window.history.replaceState(null, "", `/chat/${newId}`);
        // Reflect the new conversation in the sidebar (top of the list).
        upsertToTop(newId, title);
      } else {
        await appendMessage(activeConversationId, "user", content, model);
        // Bump the existing conversation to the top of the sidebar.
        upsertToTop(activeConversationId);
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

          if (event.type === "tool" && event.name) {
            pendingTool = {
              name: event.name,
              ...(event.arguments ? { arguments: event.arguments } : {}),
            };
          }

          if (event.type === "token" && event.content) {
            assistantContent += event.content;
            if (!assistantStarted) {
              assistantStarted = true;
              setMessages((prev) => [
                ...prev,
                {
                  id: assistantId,
                  role: "assistant",
                  content: event.content ?? "",
                  ...(pendingTool ? { tool: pendingTool } : {}),
                },
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
          {MODEL_OPTIONS.map((option) => (
            <SelectItem key={option.id} value={option.id}>
              {option.label}
            </SelectItem>
          ))}
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
                  ? "self-end max-w-[80%] flex flex-col items-end gap-1"
                  : "self-start max-w-[80%] flex flex-col items-start gap-1"
              }
            >
              {message.tool && (
                <span className="inline-flex items-center gap-1 rounded-full bg-(--surface-200) px-2 py-0.5 text-xs text-(--grey-500)">
                  <span aria-hidden>🔧</span>
                  {toolChipText(message.tool)}
                </span>
              )}
              <div
                className={
                  message.role === "user"
                    ? "rounded-[12px] bg-(--primary) px-3 py-2 text-sm"
                    : "rounded-[12px] bg-(--surface-150) px-3 py-2 text-sm"
                }
              >
                {message.content}
              </div>
            </div>
          ))
        )}
        {isSending && messages.at(-1)?.role === "user" && (
          <output
            className="self-start flex items-center gap-1 max-w-[80%] rounded-[12px] bg-(--surface-150) px-3 py-2"
            aria-label="Aider is thinking"
          >
            {[0, 1, 2].map((i) => (
              <span
                key={i}
                className="h-1.5 w-1.5 rounded-full bg-(--primary) animate-[typing-bounce_1.2s_ease-in-out_infinite]"
                style={{ animationDelay: `${i * 0.15}s` }}
              />
            ))}
          </output>
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
