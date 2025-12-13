import Vapor

#if canImport(FoundationModels)
import FoundationModels
#endif

// MARK: - Request/Response DTOs

struct CompletionRequest: Content {
    var messages: [MessageItem]
    var stream: Bool?
    
    struct MessageItem: Content {
        var role: String
        var content: String
    }
}

struct CompletionResponse: Content {
    var content: String
    var finishReason: String?
}

// MARK: - Foundation Models Service

actor FoundationModelsService {
    private let useMockMode: Bool
    
    init(useMockMode: Bool = false) {
        self.useMockMode = useMockMode
    }
    
    /// Generate a completion using Apple Foundation Models
    func complete(messages: [CompletionRequest.MessageItem]) async throws -> String {
        // Mock mode for testing without Foundation Models
        if useMockMode {
            return mockResponse(for: messages)
        }
        
        #if canImport(FoundationModels)
        if #available(macOS 26.0, *) {
            return try await realComplete(messages: messages)
        } else {
            return mockResponse(for: messages)
        }
        #else
        return mockResponse(for: messages)
        #endif
    }
    
    #if canImport(FoundationModels)
    @available(macOS 26.0, *)
    private func realComplete(messages: [CompletionRequest.MessageItem]) async throws -> String {
        // Build the conversation for Foundation Models
        let session = LanguageModelSession()
        
        // Get the last user message
        let lastUserMessage = messages.last { $0.role == "user" }?.content ?? ""
        
        // Build context from previous messages
        var context = "You are Perspective, a helpful AI assistant running on Apple Foundation Models. "
        context += "Be concise, helpful, and friendly.\n\n"
        
        for message in messages.dropLast() {
            if message.role == "user" {
                context += "User: \(message.content)\n"
            } else if message.role == "assistant" {
                context += "Assistant: \(message.content)\n"
            }
        }
        
        if !context.isEmpty {
            context += "\nUser: \(lastUserMessage)"
        }
        
        // Generate response
        let response = try await session.respond(to: context.isEmpty ? lastUserMessage : context)
        return response.content
    }
    #endif
    
    private func mockResponse(for messages: [CompletionRequest.MessageItem]) -> String {
        let lastMessage = messages.last?.content ?? ""
        
        // Simple mock responses for testing
        if lastMessage.lowercased().contains("hello") || lastMessage.lowercased().contains("hi") {
            return "Hello! I'm Perspective, your AI assistant. How can I help you today?"
        } else if lastMessage.lowercased().contains("how are you") {
            return "I'm doing great, thank you for asking! I'm running on Apple Foundation Models and ready to assist you."
        } else if lastMessage.lowercased().contains("what can you do") {
            return "I can help you with a variety of tasks including answering questions, having conversations, and assisting with document understanding. What would you like help with?"
        } else {
            return "I understand you said: \"\(lastMessage)\". I'm here to help! What would you like to know?"
        }
    }
}

// MARK: - Application Setup

func configure(_ app: Application) throws {
    // Allow connections from any host (for Tailscale access)
    app.http.server.configuration.hostname = "0.0.0.0"
    app.http.server.configuration.port = Int(Environment.get("PORT") ?? "19840") ?? 19840
    
    // Increase payload size for large messages
    app.routes.defaultMaxBodySize = "10mb"
    
    // Check if we should use mock mode
    let useMock = Environment.get("USE_MOCK") == "true"
    let modelsService = FoundationModelsService(useMockMode: useMock)
    
    if useMock {
        app.logger.warning("⚠️ Running in MOCK mode - responses are simulated")
    }
    
    // Health check
    app.get("health") { req -> HTTPStatus in
        .ok
    }
    
    // Completions endpoint
    app.post("v1", "completions") { req async throws -> CompletionResponse in
        let request = try req.content.decode(CompletionRequest.self)
        
        do {
            let response = try await modelsService.complete(messages: request.messages)
            return CompletionResponse(content: response, finishReason: "stop")
        } catch {
            req.logger.error("Foundation Models error: \(error)")
            throw Abort(.internalServerError, reason: "Failed to generate response: \(error.localizedDescription)")
        }
    }
    
    // Info endpoint
    app.get("info") { req -> [String: String] in
        var modelStatus = "Mock mode"
        
        #if canImport(FoundationModels)
        if #available(macOS 26.0, *) {
            modelStatus = "Apple Foundation Models (macOS 26+)"
        }
        #endif
        
        return [
            "name": "Perspective Foundation Models Server",
            "version": "1.0.0",
            "model": modelStatus,
            "status": "running"
        ]
    }
}

// MARK: - Entry Point

@main
struct FoundationModelsServerApp {
    static func main() async throws {
        var env = try Environment.detect()
        try LoggingSystem.bootstrap(from: &env)
        
        let app = try await Application.make(env)
        
        defer { Task { try? await app.asyncShutdown() } }
        
        try configure(app)
        
        let port = app.http.server.configuration.port
        app.logger.info("🚀 Foundation Models Server starting on http://0.0.0.0:\(port)")
        app.logger.info("📡 Ready to accept connections from Perspective Web")
        
        #if canImport(FoundationModels)
        if #available(macOS 26.0, *) {
            app.logger.info("✅ Apple Foundation Models available (macOS 26+)")
        } else {
            app.logger.warning("⚠️ macOS 26 required for Foundation Models - using mock responses")
        }
        #else
        app.logger.warning("⚠️ Foundation Models not available - using mock responses")
        #endif
        
        try await app.execute()
    }
}
