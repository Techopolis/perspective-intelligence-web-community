import Vapor

/// Client for communicating with Ollama server (compatible API)
actor FoundationModelsClient {
    private let client: Client
    private let serverURL: String
    private let model: String
    
    init(client: Client, serverURL: String = "http://localhost:11434", model: String = "llama3.2") {
        self.client = client
        self.serverURL = serverURL
        self.model = model
    }
    
    // ============================================
    // Ollama API Structures
    // ============================================
    
    /// Request structure for Ollama /api/chat endpoint
    struct OllamaChatRequest: Content {
        var model: String
        var messages: [OllamaMessage]
        var stream: Bool
        
        struct OllamaMessage: Content {
            var role: String
            var content: String
        }
    }
    
    /// Response structure from Ollama /api/chat endpoint
    struct OllamaChatResponse: Content {
        var model: String?
        var message: OllamaMessage?
        var done: Bool?
        
        struct OllamaMessage: Content {
            var role: String
            var content: String
        }
    }
    
    /// Error response from Ollama
    struct OllamaErrorResponse: Content {
        var error: String?
    }
    
    /// Send a chat completion request to Ollama
    func complete(messages: [(role: String, content: String)]) async throws -> String {
        let request = OllamaChatRequest(
            model: model,
            messages: messages.map { .init(role: $0.role, content: $0.content) },
            stream: false
        )
        
        let url = URI(string: "\(serverURL)/api/chat")
        print("Ollama: POST \(url) model=\(model)")
        
        let response: ClientResponse
        do {
            response = try await client.post(url) { req in
                try req.content.encode(request)
                req.headers.contentType = .json
            }
        } catch {
            print("Ollama: Connection failed - \(error)")
            throw Abort(.badGateway, reason: "Failed to connect to Ollama at \(serverURL)")
        }
        
        guard response.status == .ok else {
            let body = response.body.map { String(buffer: $0) } ?? "no body"
            print("Ollama: Error \(response.status) - \(body)")
            
            if let errorResponse = try? response.content.decode(OllamaErrorResponse.self),
               let errorMessage = errorResponse.error {
                throw Abort(.badGateway, reason: "Ollama error: \(errorMessage)")
            }
            
            throw Abort(.badGateway, reason: "Ollama returned status: \(response.status)")
        }
        
        let chatResponse = try response.content.decode(OllamaChatResponse.self)
        let content = chatResponse.message?.content ?? ""
        print("Ollama: Response received (\(content.count) chars)")
        return content
    }
    
    /// Check if Ollama server is healthy by listing models
    func healthCheck() async throws -> Bool {
        let url = URI(string: "\(serverURL)/api/tags")
        do {
            let response = try await client.get(url)
            return response.status == .ok
        } catch {
            return false
        }
    }
}

/// Extension to make FoundationModelsClient available in Request
extension Request {
    var foundationModels: FoundationModelsClient {
        .init(
            client: self.client,
            serverURL: Environment.get("OLLAMA_URL") ?? "http://localhost:11434",
            model: Environment.get("OLLAMA_MODEL") ?? "llama3.2"
        )
    }
}

