import Vapor

/// DTO for creating a new message
struct CreateMessageDTO: Content {
    var content: String
    var agent: String?
}

/// DTO for message response
struct MessageDTO: Content {
    var id: UUID
    var chatId: UUID
    var role: String
    var content: String
    var createdAt: Date?
    
    init(from message: Message) {
        self.id = message.id!
        self.chatId = message.$chat.id
        self.role = message.role
        self.content = message.content
        self.createdAt = message.createdAt
    }
}

/// DTO for streaming response chunks
struct StreamChunkDTO: Content {
    var type: String  // "chunk", "done", "error"
    var content: String?
    var messageId: UUID?
}

