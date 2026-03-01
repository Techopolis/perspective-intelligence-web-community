"use client";

import { useEffect } from "react";
import { useParams } from "next/navigation";
import { MessageList } from "@/components/chat/message-list";
import { MessageInput } from "@/components/chat/message-input";
import { useChat } from "@/components/chat/chat-provider";

export default function ChatDetailPage() {
  const params = useParams();
  const chatId = params.id as string;
  const {
    messages,
    streamingContent,
    isStreaming,
    isLoadingMessages,
    activeAgent,
    activeChatId,
    selectChat,
  } = useChat();

  useEffect(() => {
    if (chatId && chatId !== activeChatId) {
      selectChat(chatId);
    }
  }, [chatId, activeChatId, selectChat]);

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
