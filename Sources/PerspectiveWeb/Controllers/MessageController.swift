import Fluent
import Vapor

struct MessageController: RouteCollection {
    func boot(routes: RoutesBuilder) throws {
        let messages = routes.grouped("api", "chats", ":chatID", "messages")
        
        messages.get(use: index)
        messages.post(use: create)
    }
    
    /// GET /api/chats/:chatID/messages - List messages in a chat
    @Sendable
    func index(req: Request) async throws -> [MessageDTO] {
        let user = try req.auth.require(User.self)
        
        guard let chatID = req.parameters.get("chatID", as: UUID.self) else {
            throw Abort(.badRequest, reason: "Invalid chat ID")
        }
        
        guard let chat = try await Chat.find(chatID, on: req.db) else {
            throw Abort(.notFound, reason: "Chat not found")
        }
        
        // Verify ownership
        guard chat.$user.id == user.id else {
            throw Abort(.forbidden)
        }
        
        let messages = try await Message.query(on: req.db)
            .filter(\.$chat.$id == chatID)
            .sort(\.$createdAt, .ascending)
            .all()
        
        return messages.map { MessageDTO(from: $0) }
    }
    
    /// POST /api/chats/:chatID/messages - Send a message and get AI response
    @Sendable
    func create(req: Request) async throws -> [MessageDTO] {
        let user = try req.auth.require(User.self)
        
        guard let chatID = req.parameters.get("chatID", as: UUID.self) else {
            throw Abort(.badRequest, reason: "Invalid chat ID")
        }
        
        guard let chat = try await Chat.find(chatID, on: req.db) else {
            throw Abort(.notFound, reason: "Chat not found")
        }
        
        // Verify ownership
        guard chat.$user.id == user.id else {
            throw Abort(.forbidden)
        }
        
        let input = try req.content.decode(CreateMessageDTO.self)
        
        // Save user message
        let userMessage = Message(chatID: chatID, role: "user", content: input.content)
        try await userMessage.save(on: req.db)
        
        // Update chat title if this is the first message
        try await chat.$messages.load(on: req.db)
        if chat.messages.count == 1 {
            // Use first 50 chars of message as title
            let newTitle = String(input.content.prefix(50))
            chat.title = newTitle.isEmpty ? "New Chat" : newTitle
            try await chat.save(on: req.db)
        }
        
        // Get all messages for context
        let allMessages = try await Message.query(on: req.db)
            .filter(\.$chat.$id == chatID)
            .sort(\.$createdAt, .ascending)
            .all()
        
        // Call Foundation Models via Mac server
        let messageHistory = allMessages.map { (role: $0.role, content: $0.content) }
        
        let aiResponse: String
        do {
            aiResponse = try await req.foundationModels.complete(messages: messageHistory)
        } catch {
            req.logger.error("Foundation Models error: \(error)")
            aiResponse = "I apologize, but I'm unable to connect to the AI service at the moment. Please ensure the Mac server is running."
        }
        
        // Save assistant message
        let assistantMessage = Message(chatID: chatID, role: "assistant", content: aiResponse)
        try await assistantMessage.save(on: req.db)
        
        return [
            MessageDTO(from: userMessage),
            MessageDTO(from: assistantMessage)
        ]
    }
}
