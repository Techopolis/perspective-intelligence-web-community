import Fluent
import Vapor

struct ChatController: RouteCollection {
    func boot(routes: RoutesBuilder) throws {
        let chats = routes.grouped("api", "chats")
        
        chats.get(use: index)
        chats.post(use: create)
        chats.group(":chatID") { chat in
            chat.get(use: show)
            chat.delete(use: delete)
            chat.patch(use: update)
        }
    }
    
    /// GET /api/chats - List all chats for current user
    @Sendable
    func index(req: Request) async throws -> [ChatDTO] {
        let user = try req.auth.require(User.self)
        
        let chats = try await Chat.query(on: req.db)
            .filter(\.$user.$id == user.id)
            .with(\.$messages)
            .sort(\.$updatedAt, .descending)
            .all()
        
        return chats.map { chat in
            ChatDTO(from: chat, messageCount: chat.messages.count)
        }
    }
    
    /// POST /api/chats - Create a new chat for current user
    @Sendable
    func create(req: Request) async throws -> ChatDTO {
        let user = try req.auth.require(User.self)
        let input = try? req.content.decode(CreateChatDTO.self)
        let title = input?.title ?? "New Chat"
        
        let chat = Chat(userID: user.id, title: title)
        try await chat.save(on: req.db)
        
        return ChatDTO(from: chat)
    }
    
    /// GET /api/chats/:chatID - Get a single chat with messages
    @Sendable
    func show(req: Request) async throws -> ChatDTO {
        let user = try req.auth.require(User.self)
        
        guard let chat = try await Chat.find(req.parameters.get("chatID"), on: req.db) else {
            throw Abort(.notFound)
        }
        
        // Verify ownership
        guard chat.$user.id == user.id else {
            throw Abort(.forbidden)
        }
        
        try await chat.$messages.load(on: req.db)
        return ChatDTO(from: chat, messageCount: chat.messages.count)
    }
    
    /// PATCH /api/chats/:chatID - Update chat title
    @Sendable
    func update(req: Request) async throws -> ChatDTO {
        let user = try req.auth.require(User.self)
        
        guard let chat = try await Chat.find(req.parameters.get("chatID"), on: req.db) else {
            throw Abort(.notFound)
        }
        
        // Verify ownership
        guard chat.$user.id == user.id else {
            throw Abort(.forbidden)
        }
        
        let input = try req.content.decode(CreateChatDTO.self)
        if let title = input.title {
            chat.title = title
        }
        
        try await chat.save(on: req.db)
        return ChatDTO(from: chat)
    }
    
    /// DELETE /api/chats/:chatID - Delete a chat
    @Sendable
    func delete(req: Request) async throws -> HTTPStatus {
        let user = try req.auth.require(User.self)
        
        guard let chat = try await Chat.find(req.parameters.get("chatID"), on: req.db) else {
            throw Abort(.notFound)
        }
        
        // Verify ownership
        guard chat.$user.id == user.id else {
            throw Abort(.forbidden)
        }
        
        try await chat.delete(on: req.db)
        return .noContent
    }
}
