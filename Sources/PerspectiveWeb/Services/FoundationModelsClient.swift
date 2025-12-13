import Vapor

/// Client for communicating with the Mac server running Foundation Models
actor FoundationModelsClient {
    private let client: Client
    private let serverURL: String
    
    init(client: Client, serverURL: String = "http://localhost:8081") {
        self.client = client
        self.serverURL = serverURL
    }
    
    /// Request structure sent to Mac server
    struct CompletionRequest: Content {
        var messages: [MessageItem]
        var stream: Bool
        
        struct MessageItem: Content {
            var role: String
            var content: String
        }
    }
    
    /// Response structure from Mac server
    struct CompletionResponse: Content {
        var content: String
        var finishReason: String?
    }
    
    /// Streaming chunk from Mac server
    struct StreamChunk: Content {
        var type: String  // "chunk", "done", "error"
        var content: String?
    }
    
    /// Send a completion request to the Mac server
    func complete(messages: [(role: String, content: String)]) async throws -> String {
        let request = CompletionRequest(
            messages: messages.map { .init(role: $0.role, content: $0.content) },
            stream: false
        )
        
        let response = try await client.post(
            URI(string: "\(serverURL)/v1/completions")
        ) { req in
            try req.content.encode(request)
        }
        
        guard response.status == .ok else {
            throw Abort(.badGateway, reason: "Mac server returned status: \(response.status)")
        }
        
        let completionResponse = try response.content.decode(CompletionResponse.self)
        return completionResponse.content
    }
    
    /// Check if the Mac server is healthy
    func healthCheck() async throws -> Bool {
        let response = try await client.get(URI(string: "\(serverURL)/health"))
        return response.status == .ok
    }
}

/// Extension to make FoundationModelsClient available in Request
extension Request {
    var foundationModels: FoundationModelsClient {
        .init(
            client: self.client,
            serverURL: Environment.get("FOUNDATION_MODELS_URL") ?? "http://localhost:8081"
        )
    }
}

