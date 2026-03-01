import Vapor

#if canImport(FoundationModels)
import FoundationModels
#endif

// MARK: - OpenAI-Compatible Request/Response DTOs

struct ChatCompletionRequest: Content {
    var model: String?
    var messages: [MessageItem]
    var stream: Bool?
    var maxTokens: Int?
    var temperature: Double?

    struct MessageItem: Content {
        var role: String
        var content: String
    }

    enum CodingKeys: String, CodingKey {
        case model, messages, stream, temperature
        case maxTokens = "max_tokens"
    }
}

/// OpenAI-compatible non-streaming response
struct ChatCompletionResponse: Content {
    var id: String
    var object: String
    var created: Int
    var model: String
    var choices: [Choice]
    var usage: Usage?

    struct Choice: Content {
        var index: Int
        var message: Message
        var finishReason: String?

        struct Message: Content {
            var role: String
            var content: String
        }

        enum CodingKeys: String, CodingKey {
            case index, message
            case finishReason = "finish_reason"
        }
    }

    struct Usage: Content {
        var promptTokens: Int?
        var completionTokens: Int?
        var totalTokens: Int?

        enum CodingKeys: String, CodingKey {
            case promptTokens = "prompt_tokens"
            case completionTokens = "completion_tokens"
            case totalTokens = "total_tokens"
        }
    }
}

// MARK: - Foundation Models Service with Session Persistence

actor FoundationModelsService {
    private let useMockMode: Bool

    /// Persistent sessions keyed by session ID (chat ID from the client).
    /// Each session retains its full conversation history internally.
    #if canImport(FoundationModels)
    private var sessions: [String: Any] = [:]  // LanguageModelSession stored as Any for availability
    #endif
    private var sessionLastUsed: [String: Date] = [:]

    /// Max idle time before a session is cleaned up (15 minutes)
    private let sessionTTL: TimeInterval = 900

    init(useMockMode: Bool = false) {
        self.useMockMode = useMockMode
    }

    /// Generate a chat completion, reusing a persistent session when a sessionId is provided.
    func complete(
        messages: [ChatCompletionRequest.MessageItem],
        sessionId: String?
    ) async throws -> String {
        if useMockMode {
            return mockResponse(for: messages)
        }

        #if canImport(FoundationModels)
        if #available(macOS 26.0, *) {
            return try await realComplete(messages: messages, sessionId: sessionId)
        } else {
            return mockResponse(for: messages)
        }
        #else
        return mockResponse(for: messages)
        #endif
    }

    #if canImport(FoundationModels)
    @available(macOS 26.0, *)
    private func realComplete(
        messages: [ChatCompletionRequest.MessageItem],
        sessionId: String?
    ) async throws -> String {
        // Clean up stale sessions periodically
        cleanupStaleSessions()

        let session: LanguageModelSession

        if let sid = sessionId, let existing = sessions[sid] as? LanguageModelSession {
            // Reuse existing session — it already has conversation history
            session = existing
            sessionLastUsed[sid] = Date()
        } else {
            // Create a new session with system instructions from the messages
            let systemContent = messages
                .first { $0.role == "system" }?
                .content

            if let instructions = systemContent {
                session = LanguageModelSession(instructions: instructions)
            } else {
                session = LanguageModelSession(
                    instructions: "You are Perspective Intelligence, a helpful AI assistant. Be concise, helpful, and friendly."
                )
            }

            // If we have a session ID, store for reuse
            if let sid = sessionId {
                sessions[sid] = session
                sessionLastUsed[sid] = Date()
            }

            // Replay any prior conversation turns to seed the session
            // (Skip system messages and the last user message — those are handled separately)
            let conversationMessages = messages.filter { $0.role != "system" }
            let priorTurns = conversationMessages.dropLast()

            for msg in priorTurns {
                if msg.role == "user" {
                    // Feed prior user messages to build session context
                    let _ = try? await session.respond(to: msg.content)
                }
            }
        }

        // Send the latest user message
        let lastUserMessage = messages.last { $0.role == "user" }?.content ?? ""
        let response = try await session.respond(to: lastUserMessage)
        return response.content
    }

    @available(macOS 26.0, *)
    private func cleanupStaleSessions() {
        let now = Date()
        let staleKeys = sessionLastUsed.filter { now.timeIntervalSince($0.value) > sessionTTL }.map(\.key)
        for key in staleKeys {
            sessions.removeValue(forKey: key)
            sessionLastUsed.removeValue(forKey: key)
        }
    }
    #endif

    /// Remove a specific session (e.g. when a chat is deleted)
    func removeSession(id: String) {
        #if canImport(FoundationModels)
        sessions.removeValue(forKey: id)
        #endif
        sessionLastUsed.removeValue(forKey: id)
    }

    private func mockResponse(for messages: [ChatCompletionRequest.MessageItem]) -> String {
        let lastMessage = messages.last { $0.role == "user" }?.content ?? messages.last?.content ?? ""
        let lower = lastMessage.lowercased()

        if lower.contains("hello") || lower.contains("hi") {
            return "Hello! I'm Perspective Intelligence, your AI assistant. How can I help you today?"
        } else if lower.contains("how are you") {
            return "I'm doing great, thank you for asking! I'm running on Apple Foundation Models and ready to assist you."
        } else if lower.contains("what can you do") {
            return "I can help with answering questions, having conversations, coding, writing, and more. What would you like help with?"
        } else {
            return "I understand you said: \"\(lastMessage)\". I'm here to help — what would you like to know?"
        }
    }
}

// MARK: - Application Setup

func configure(_ app: Application) throws {
    app.http.server.configuration.hostname = "0.0.0.0"
    app.http.server.configuration.port = Int(Environment.get("PORT") ?? "19840") ?? 19840
    app.routes.defaultMaxBodySize = "10mb"

    let useMock = Environment.get("USE_MOCK") == "true"
    let modelsService = FoundationModelsService(useMockMode: useMock)

    if useMock {
        app.logger.warning("Running in MOCK mode - responses are simulated")
    }

    // Health check
    app.get("health") { req -> HTTPStatus in
        .ok
    }

    // Also support /debug/health for Next.js client compatibility
    app.get("debug", "health") { req -> HTTPStatus in
        .ok
    }

    // OpenAI-compatible chat completions endpoint
    app.post("v1", "chat", "completions") { req async throws -> Response in
        let request = try req.content.decode(ChatCompletionRequest.self)

        // Extract optional session_id for session persistence
        struct SessionIdBody: Content {
            var sessionId: String?
            enum CodingKeys: String, CodingKey {
                case sessionId = "session_id"
            }
        }
        let sessionId = try? req.content.decode(SessionIdBody.self).sessionId

        let shouldStream = request.stream ?? false

        if shouldStream {
            // SSE streaming response
            let headers = HTTPHeaders([
                ("Content-Type", "text/event-stream"),
                ("Cache-Control", "no-cache"),
                ("Connection", "keep-alive"),
            ])

            let response = Response(status: .ok, headers: headers)
            response.body = .init(asyncStream: { writer in
                do {
                    let content = try await modelsService.complete(
                        messages: request.messages,
                        sessionId: sessionId
                    )

                    // Stream the response in chunks to simulate token-by-token delivery
                    let chunkSize = 4
                    var index = content.startIndex
                    while index < content.endIndex {
                        let end = content.index(index, offsetBy: chunkSize, limitedBy: content.endIndex) ?? content.endIndex
                        let chunk = String(content[index..<end])

                        let sseData: [String: Any] = [
                            "choices": [
                                [
                                    "index": 0,
                                    "delta": ["content": chunk],
                                    "finish_reason": NSNull()
                                ]
                            ]
                        ]

                        if let jsonData = try? JSONSerialization.data(withJSONObject: sseData),
                           let jsonString = String(data: jsonData, encoding: .utf8) {
                            try await writer.write(.buffer(.init(string: "data: \(jsonString)\n\n")))
                        }

                        index = end
                    }

                    // Send finish event
                    let doneData: [String: Any] = [
                        "choices": [
                            [
                                "index": 0,
                                "delta": [:] as [String: String],
                                "finish_reason": "stop"
                            ]
                        ],
                        "session_id": sessionId ?? ""
                    ]

                    if let jsonData = try? JSONSerialization.data(withJSONObject: doneData),
                       let jsonString = String(data: jsonData, encoding: .utf8) {
                        try await writer.write(.buffer(.init(string: "data: \(jsonString)\n\n")))
                    }

                    try await writer.write(.buffer(.init(string: "data: [DONE]\n\n")))
                    try await writer.write(.end)
                } catch {
                    let errorJSON = "{\"error\":{\"message\":\"\(error.localizedDescription)\"}}"
                    try await writer.write(.buffer(.init(string: "data: \(errorJSON)\n\n")))
                    try await writer.write(.end)
                }
            })

            return response
        } else {
            // Non-streaming response
            let content = try await modelsService.complete(
                messages: request.messages,
                sessionId: sessionId
            )

            let completionResponse = ChatCompletionResponse(
                id: "chatcmpl-\(UUID().uuidString.prefix(8))",
                object: "chat.completion",
                created: Int(Date().timeIntervalSince1970),
                model: "apple-foundation-models",
                choices: [
                    .init(
                        index: 0,
                        message: .init(role: "assistant", content: content),
                        finishReason: "stop"
                    )
                ],
                usage: nil
            )

            return try await completionResponse.encodeResponse(for: req)
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
            "name": "Perspective Intelligence Foundation Models Server",
            "version": "2.0.0",
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
        app.logger.info("Foundation Models Server starting on http://0.0.0.0:\(port)")
        app.logger.info("Ready to accept connections from Perspective Intelligence")

        #if canImport(FoundationModels)
        if #available(macOS 26.0, *) {
            app.logger.info("Apple Foundation Models available (macOS 26+)")
        } else {
            app.logger.warning("macOS 26 required for Foundation Models - using mock responses")
        }
        #else
        app.logger.warning("Foundation Models not available - using mock responses")
        #endif

        try await app.execute()
    }
}
