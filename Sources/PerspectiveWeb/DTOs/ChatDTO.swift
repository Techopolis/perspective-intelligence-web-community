import Vapor

/// DTO for creating a new chat
struct CreateChatDTO: Content {
    var title: String?
}

/// DTO for chat response
struct ChatDTO: Content {
    var id: UUID
    var title: String
    var createdAt: Date?
    var updatedAt: Date?
    var messageCount: Int?
    
    init(from chat: Chat, messageCount: Int? = nil) {
        self.id = chat.id!
        self.title = chat.title
        self.createdAt = chat.createdAt
        self.updatedAt = chat.updatedAt
        self.messageCount = messageCount
    }
}

