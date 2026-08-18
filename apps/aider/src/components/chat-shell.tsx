"use client";

import { Button, Textarea } from "@jf/ui";
import { PaperPlaneRightIcon } from "@phosphor-icons/react/dist/ssr";
import { useEffect, useRef, useState } from "react";

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
}

interface ChatShellProps {
  userName?: string | null | undefined;
}

export function ChatShell({ userName }: ChatShellProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const listRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    listRef.current?.scrollTo({ top: listRef.current.scrollHeight, behavior: "smooth" });
  }, []);

  function handleSend() {
    const content = input.trim();
    if (!content) return;

    setMessages((prev) => [...prev, { id: crypto.randomUUID(), role: "user", content }]);
    setInput("");
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  }

  return (
    <div className="flex flex-col flex-1 min-h-0 w-full max-w-2xl mx-auto">
      <div ref={listRef} className="flex-1 min-h-0 overflow-y-auto py-4 flex flex-col gap-3">
        {messages.length === 0 ? (
          <p className="m-auto text-center text-sm text-(--grey-400)">
            {userName ? `Hi ${userName}, ask` : "Ask"} me anything — no model is wired up yet, but
            the chat is ready.
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
        />
        <Button size="icon" onClick={handleSend} disabled={!input.trim()} aria-label="Send message">
          <PaperPlaneRightIcon size={18} />
        </Button>
      </div>
    </div>
  );
}
