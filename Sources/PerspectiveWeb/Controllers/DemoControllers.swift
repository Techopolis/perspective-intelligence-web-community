import Fluent
import Vapor

// ============================================
// DEMO MODE CONTROLLERS
// No authentication required - for testing only
// ============================================

struct DemoChatController: RouteCollection {
    func boot(routes: any RoutesBuilder) throws {
        let chats = routes.grouped("api", "chats")
        
        chats.get(use: index)
        chats.post(use: create)
        chats.group(":chatID") { chat in
            chat.get(use: show)
            chat.delete(use: delete)
            chat.patch(use: update)
        }
    }
    
    @Sendable
    func index(req: Request) async throws -> [ChatDTO] {
        let chats = try await Chat.query(on: req.db)
            .with(\.$messages)
            .sort(\.$updatedAt, .descending)
            .all()
        
        return chats.map { chat in
            ChatDTO(from: chat, messageCount: chat.messages.count)
        }
    }
    
    @Sendable
    func create(req: Request) async throws -> ChatDTO {
        let input = try? req.content.decode(CreateChatDTO.self)
        let title = input?.title ?? "New Chat"
        
        let chat = Chat(title: title)
        try await chat.save(on: req.db)
        
        return ChatDTO(from: chat)
    }
    
    @Sendable
    func show(req: Request) async throws -> ChatDTO {
        guard let chat = try await Chat.find(req.parameters.get("chatID"), on: req.db) else {
            throw Abort(.notFound)
        }
        try await chat.$messages.load(on: req.db)
        return ChatDTO(from: chat, messageCount: chat.messages.count)
    }
    
    @Sendable
    func update(req: Request) async throws -> ChatDTO {
        guard let chat = try await Chat.find(req.parameters.get("chatID"), on: req.db) else {
            throw Abort(.notFound)
        }
        let input = try req.content.decode(CreateChatDTO.self)
        if let title = input.title {
            chat.title = title
        }
        try await chat.save(on: req.db)
        return ChatDTO(from: chat)
    }
    
    @Sendable
    func delete(req: Request) async throws -> HTTPStatus {
        guard let chat = try await Chat.find(req.parameters.get("chatID"), on: req.db) else {
            throw Abort(.notFound)
        }
        try await chat.delete(on: req.db)
        return .noContent
    }
}

struct DemoMessageController: RouteCollection {
    func boot(routes: any RoutesBuilder) throws {
        let messages = routes.grouped("api", "chats", ":chatID", "messages")
        
        messages.get(use: index)
        messages.post(use: create)
    }
    
    @Sendable
    func index(req: Request) async throws -> [MessageDTO] {
        guard let chatID = req.parameters.get("chatID", as: UUID.self) else {
            throw Abort(.badRequest, reason: "Invalid chat ID")
        }
        
        let messages = try await Message.query(on: req.db)
            .filter(\.$chat.$id == chatID)
            .sort(\.$createdAt, .ascending)
            .all()
        
        return messages.map { MessageDTO(from: $0) }
    }
    
    @Sendable
    func create(req: Request) async throws -> [MessageDTO] {
        guard let chatID = req.parameters.get("chatID", as: UUID.self) else {
            throw Abort(.badRequest, reason: "Invalid chat ID")
        }
        
        guard let chat = try await Chat.find(chatID, on: req.db) else {
            throw Abort(.notFound, reason: "Chat not found")
        }
        
        let input = try req.content.decode(CreateMessageDTO.self)

        // Determine effective agent
        let agentId: String
        if let requested = input.agent, !requested.isEmpty {
            agentId = requested
        } else {
            agentId = await req.foundationModels.classify(message: input.content)
        }

        // Save user message
        let userMessage = Message(chatID: chatID, role: "user", content: input.content)
        try await userMessage.save(on: req.db)
        
        // Update chat title if this is the first message (race-safe)
        let messageCount = try await Message.query(on: req.db)
            .filter(\.$chat.$id == chatID)
            .count()
        if messageCount == 1 {
            let newTitle = String(input.content.prefix(50))
            try await Chat.query(on: req.db)
                .filter(\.$id == chatID)
                .filter(\.$title == "New Chat")
                .set(\.$title, to: newTitle.isEmpty ? "New Chat" : newTitle)
                .update()
        }
        
        // Get all messages for context
        let allMessages = try await Message.query(on: req.db)
            .filter(\.$chat.$id == chatID)
            .sort(\.$createdAt, .ascending)
            .all()
        
        // Call Foundation Models via Mac server
        let rawHistory = allMessages.map { (role: $0.role, content: $0.content) }
        let systemMsg = (role: "system", content: FoundationModelsClient.systemPrompt(for: agentId))
        let messageHistory = [systemMsg] + rawHistory
        
        let aiResponse: String
        do {
            aiResponse = try await req.foundationModels.complete(messages: messageHistory)
        } catch {
            req.logger.error("Foundation Models error: \(error)")
            aiResponse = "I apologize, but I'm unable to connect to the AI service. Please ensure the Foundation Models Server is running on Michael's Mac."
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

