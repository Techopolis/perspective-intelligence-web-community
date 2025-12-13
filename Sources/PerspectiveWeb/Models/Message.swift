import Fluent
import Vapor

/// Represents a message in a chat conversation
final class Message: Model, Content, @unchecked Sendable {
    static let schema = "messages"
    
    @ID(key: .id)
    var id: UUID?
    
    @Parent(key: "chat_id")
    var chat: Chat
    
    @Field(key: "role")
    var role: String  // "user" or "assistant"
    
    @Field(key: "content")
    var content: String
    
    @Timestamp(key: "created_at", on: .create)
    var createdAt: Date?
    
    init() { }
    
    init(id: UUID? = nil, chatID: UUID, role: String, content: String) {
        self.id = id
        self.$chat.id = chatID
        self.role = role
        self.content = content
    }
}

