"use client";

import {
  createContext,
  useContext,
  useState,
  useCallback,
  ReactNode,
} from "react";

interface ChatSummary {
  id: string;
  title: string;
  createdAt: string;
  updatedAt: string;
  messageCount: number;
}

interface ChatMessage {
  id: string;
  chatId: string;
  role: string;
  content: string;
  createdAt: string;
  agent?: string;
}

interface ChatContextType {
  chats: ChatSummary[];
  activeChatId: string | null;
  messages: ChatMessage[];
  isLoadingChats: boolean;
  isLoadingMessages: boolean;
  isStreaming: boolean;
  streamingContent: string;
  activeAgent: string | null;
  selectedAgent: string | null;
  setSelectedAgent: (agent: string | null) => void;
  loadChats: () => Promise<void>;
  selectChat: (chatId: string) => Promise<void>;
  createChat: () => Promise<string | null>;
  deleteChat: (chatId: string) => Promise<void>;
  sendMessage: (content: string) => Promise<void>;
}

const ChatContext = createContext<ChatContextType | undefined>(undefined);

export function ChatProvider({ children }: { children: ReactNode }) {
  const [chats, setChats] = useState<ChatSummary[]>([]);
  const [activeChatId, setActiveChatId] = useState<string | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isLoadingChats, setIsLoadingChats] = useState(false);
  const [isLoadingMessages, setIsLoadingMessages] = useState(false);
  const [isStreaming, setIsStreaming] = useState(false);
  const [streamingContent, setStreamingContent] = useState("");
  const [activeAgent, setActiveAgent] = useState<string | null>(null);
  const [selectedAgent, setSelectedAgent] = useState<string | null>(null);

  const loadChats = useCallback(async () => {
    setIsLoadingChats(true);
    try {
      const response = await fetch("/api/chats");
      if (response.ok) {
        const data = await response.json();
        setChats(data);
      }
    } catch (error) {
      console.error("Error loading chats:", error);
    } finally {
      setIsLoadingChats(false);
    }
  }, []);

  const selectChat = useCallback(
    async (chatId: string) => {
      setActiveChatId(chatId);
      setIsLoadingMessages(true);
      setMessages([]);
      try {
        const response = await fetch(`/api/chats/${chatId}/messages`);
        if (response.ok) {
          const data = await response.json();
          setMessages(data);
        }
      } catch (error) {
        console.error("Error loading messages:", error);
      } finally {
        setIsLoadingMessages(false);
      }
    },
    []
  );

  const createChat = useCallback(async (): Promise<string | null> => {
    try {
      const response = await fetch("/api/chats", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      });
      if (response.ok) {
        const chat = await response.json();
        setChats((prev) => [chat, ...prev]);
        setActiveChatId(chat.id);
        setMessages([]);
        return chat.id;
      }
    } catch (error) {
      console.error("Error creating chat:", error);
    }
    return null;
  }, []);

  const deleteChat = useCallback(
    async (chatId: string) => {
      try {
        const response = await fetch(`/api/chats/${chatId}`, {
          method: "DELETE",
        });
        if (response.ok) {
          setChats((prev) => prev.filter((c) => c.id !== chatId));
          if (activeChatId === chatId) {
            setActiveChatId(null);
            setMessages([]);
          }
        }
      } catch (error) {
        console.error("Error deleting chat:", error);
      }
    },
    [activeChatId]
  );

  const sendMessage = useCallback(
    async (content: string) => {
      let chatId = activeChatId;

      // Create a new chat if none is active
      if (!chatId) {
        chatId = await createChat();
        if (!chatId) return;
      }

      // Add user message optimistically
      const userMsg: ChatMessage = {
        id: `temp-${Date.now()}`,
        chatId,
        role: "user",
        content,
        createdAt: new Date().toISOString(),
      };
      setMessages((prev) => [...prev, userMsg]);

      // Start streaming
      setIsStreaming(true);
      setStreamingContent("");

      try {
        const response = await fetch(`/api/chat/${chatId}/stream`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            content,
            agent: selectedAgent || undefined,
          }),
        });

        if (!response.ok) {
          throw new Error(`HTTP ${response.status}`);
        }

        const reader = response.body?.getReader();
        if (!reader) throw new Error("No response body");

        const decoder = new TextDecoder();
        let buffer = "";
        let fullContent = "";
        let resolvedAgent: string | null = null;

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split("\n\n");
          buffer = lines.pop() ?? "";

          for (const line of lines) {
            if (!line.startsWith("data: ")) continue;
            const data = JSON.parse(line.slice(6));

            if (data.type === "stream_start") {
              resolvedAgent = data.agent || null;
              setActiveAgent(resolvedAgent);
            } else if (data.type === "chunk") {
              fullContent += data.content;
              setStreamingContent(fullContent);
            } else if (data.type === "done") {
              // Add the assistant message to the list
              const assistantMsg: ChatMessage = {
                id: `assistant-${Date.now()}`,
                chatId: chatId!,
                role: "assistant",
                content: fullContent,
                createdAt: new Date().toISOString(),
                agent: resolvedAgent || selectedAgent || undefined,
              };
              setMessages((prev) => [...prev, assistantMsg]);
              setStreamingContent("");

              // Update chat title in sidebar
              if (chats.find((c) => c.id === chatId)?.title === "New Chat") {
                setChats((prev) =>
                  prev.map((c) =>
                    c.id === chatId
                      ? { ...c, title: content.substring(0, 50) }
                      : c
                  )
                );
              }
            } else if (data.type === "error") {
              console.error("Stream error:", data.error);
            }
          }
        }
      } catch (error) {
        console.error("Error sending message:", error);
        // Add error message
        const errorMsg: ChatMessage = {
          id: `error-${Date.now()}`,
          chatId: chatId!,
          role: "assistant",
          content:
            "Sorry, I could not connect to the AI service. Please try again.",
          createdAt: new Date().toISOString(),
        };
        setMessages((prev) => [...prev, errorMsg]);
        setStreamingContent("");
      } finally {
        setIsStreaming(false);
        setActiveAgent(null);
      }
    },
    [activeChatId, createChat, selectedAgent, chats]
  );

  return (
    <ChatContext.Provider
      value={{
        chats,
        activeChatId,
        messages,
        isLoadingChats,
        isLoadingMessages,
        isStreaming,
        streamingContent,
        activeAgent,
        selectedAgent,
        setSelectedAgent,
        loadChats,
        selectChat,
        createChat,
        deleteChat,
        sendMessage,
      }}
    >
      {children}
    </ChatContext.Provider>
  );
}

export function useChat() {
  const context = useContext(ChatContext);
  if (!context) {
    throw new Error("useChat must be used within a ChatProvider");
  }
  return context;
}
