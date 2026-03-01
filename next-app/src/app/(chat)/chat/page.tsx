"use client";

import { MessageList } from "@/components/chat/message-list";
import { MessageInput } from "@/components/chat/message-input";
import { useChat } from "@/components/chat/chat-provider";

export default function ChatPage() {
  const { messages, streamingContent, isStreaming, isLoadingMessages, activeAgent } =
    useChat();

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <MessageList
        messages={messages}
        streamingContent={streamingContent}
        isStreaming={isStreaming}
        isLoading={isLoadingMessages}
        activeAgent={activeAgent}
      />
      <MessageInput />
    </div>
  );
}
