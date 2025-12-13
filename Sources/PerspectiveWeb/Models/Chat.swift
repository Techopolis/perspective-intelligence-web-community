import Fluent
import Vapor

/// Represents a chat conversation
final class Chat: Model, Content, @unchecked Sendable {
    static let schema = "chats"
    
    @ID(key: .id)
    var id: UUID?
    
    /// The user who owns this chat
    @OptionalParent(key: "user_id")
    var user: User?
    
    @Field(key: "title")
    var title: String
    
    @Timestamp(key: "created_at", on: .create)
    var createdAt: Date?
    
    @Timestamp(key: "updated_at", on: .update)
    var updatedAt: Date?
    
    @Children(for: \.$chat)
    var messages: [Message]
    
    init() { }
    
    init(id: UUID? = nil, userID: UUID? = nil, title: String) {
        self.id = id
        self.$user.id = userID
        self.title = title
    }
}

