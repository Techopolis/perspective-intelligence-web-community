import Fluent
import Vapor

/// Serializes WebSocket message processing for a single connection.
/// One actor instance per WebSocket connection ensures messages are
/// processed one-at-a-time with no interleaving.
actor ChatConnectionHandler {
    private let chatID: UUID
    private let db: any Database
    private let client: FoundationModelsClient
    private let logger: Logger

    init(chatID: UUID, db: any Database, client: FoundationModelsClient, logger: Logger) {
        self.chatID = chatID
        self.db = db
        self.client = client
        self.logger = logger
    }

    /// Process a single incoming user message: save it, query history,
    /// stream Ollama response tokens over WebSocket, then save the full reply.
    func handleMessage(_ text: String, ws: WebSocket) async {
        do {
            let decoder = JSONDecoder()
            guard let data = text.data(using: .utf8) else { return }
            let input = try decoder.decode(CreateMessageDTO.self, from: data)

            // Save user message
            let userMessage = Message(chatID: chatID, role: "user", content: input.content)
            try await userMessage.save(on: db)

            // Send user message confirmation back
            let userDTO = MessageDTO(from: userMessage)
            let encoder = JSONEncoder()
            let userWsMsg = WebSocketMessage(type: "user_message", message: userDTO)
            if let jsonData = try? encoder.encode(userWsMsg),
               let jsonString = String(data: jsonData, encoding: .utf8) {
                try await ws.send(jsonString)
            }

            // Auto-title: set chat title on first message
            let messageCount = try await Message.query(on: db)
                .filter(\.$chat.$id == chatID)
                .count()
            if messageCount == 1 {
                let newTitle = String(input.content.prefix(50))
                try await Chat.query(on: db)
                    .filter(\.$id == chatID)
                    .filter(\.$title == "New Chat")
                    .set(\.$title, to: newTitle.isEmpty ? "New Chat" : newTitle)
                    .update()
            }

            // Query full history for context
            let allMessages = try await Message.query(on: db)
                .filter(\.$chat.$id == chatID)
                .sort(\.$createdAt, .ascending)
                .all()
            let messageHistory = allMessages.map { (role: $0.role, content: $0.content) }

            // Signal stream start
            try await ws.send("{\"type\":\"stream_start\"}")

            // Stream from Ollama
            var fullContent = ""
            let stream = client.completeStreaming(messages: messageHistory)

            do {
                for try await chunk in stream {
                    fullContent += chunk
                    let chunkDTO = StreamChunkDTO(type: "chunk", content: chunk, messageId: nil)
                    if let jsonData = try? encoder.encode(chunkDTO),
                       let jsonString = String(data: jsonData, encoding: .utf8) {
                        try await ws.send(jsonString)
                    }
                }
            } catch {
                logger.error("Ollama streaming error: \(error)")
                fullContent = fullContent.isEmpty ? "Unable to connect to AI service." : fullContent
            }

            // Save the complete assistant message
            let assistantMessage = Message(chatID: chatID, role: "assistant", content: fullContent)
            try await assistantMessage.save(on: db)

            // Send done signal with the final message
            let assistantDTO = MessageDTO(from: assistantMessage)
            let doneMsg = WebSocketMessage(type: "done", message: assistantDTO)
            if let jsonData = try? encoder.encode(doneMsg),
               let jsonString = String(data: jsonData, encoding: .utf8) {
                try await ws.send(jsonString)
            }
        } catch {
            logger.error("WebSocket handler error: \(error)")
            try? await ws.send("{\"type\":\"error\",\"message\":\"An error occurred\"}")
        }
    }
}
