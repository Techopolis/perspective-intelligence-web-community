import Vapor
import Logging
import AsyncHTTPClient

/// Client for communicating with Ollama server (compatible API).
/// Stored as a shared singleton on `Application.storage` so actor
/// isolation is reused across requests instead of recreated each time.
final class FoundationModelsClient: Sendable {
    private let client: Client
    private let httpClient: HTTPClient
    private let serverURL: String
    private let model: String
    private let logger: Logger

    init(client: Client, httpClient: HTTPClient, serverURL: String, model: String, logger: Logger) {
        self.client = client
        self.httpClient = httpClient
        self.serverURL = serverURL
        self.model = model
        self.logger = logger
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
        var promptEvalCount: Int?
        var evalCount: Int?

        struct OllamaMessage: Content {
            var role: String
            var content: String
        }

        enum CodingKeys: String, CodingKey {
            case model, message, done
            case promptEvalCount = "prompt_eval_count"
            case evalCount = "eval_count"
        }
    }

    /// Events emitted by the streaming API
    enum StreamEvent {
        case content(String)
        case done(promptTokens: Int?, completionTokens: Int?)
    }

    /// Error response from Ollama
    struct OllamaErrorResponse: Content {
        var error: String?
    }

    /// Send a chat completion request to Ollama with a 120-second timeout.
    func complete(messages: [(role: String, content: String)]) async throws -> String {
        let request = OllamaChatRequest(
            model: model,
            messages: messages.map { .init(role: $0.role, content: $0.content) },
            stream: false
        )

        let url = URI(string: "\(serverURL)/api/chat")
        logger.info("Ollama: POST \(url) model=\(model)")

        let response: ClientResponse
        do {
            response = try await client.post(url) { req in
                try req.content.encode(request)
                req.headers.contentType = .json
                req.timeout = .seconds(120)
            }
        } catch {
            logger.error("Ollama: Connection failed - \(error)")
            throw Abort(.badGateway, reason: "Failed to connect to Ollama at \(serverURL)")
        }

        guard response.status == .ok else {
            let body = response.body.map { String(buffer: $0) } ?? "no body"
            logger.error("Ollama: Error \(response.status) - \(body)")

            if let errorResponse = try? response.content.decode(OllamaErrorResponse.self),
               let errorMessage = errorResponse.error {
                throw Abort(.badGateway, reason: "Ollama error: \(errorMessage)")
            }

            throw Abort(.badGateway, reason: "Ollama returned status: \(response.status)")
        }

        let chatResponse = try response.content.decode(OllamaChatResponse.self)
        let content = chatResponse.message?.content ?? ""
        logger.info("Ollama: Response received (\(content.count) chars)")
        return content
    }

    /// Send a streaming chat completion request to Ollama.
    /// Returns an AsyncThrowingStream that yields `StreamEvent` values: content chunks and a final done event with token counts.
    func completeStreaming(messages: [(role: String, content: String)]) -> AsyncThrowingStream<StreamEvent, Error> {
        let request = OllamaChatRequest(
            model: model,
            messages: messages.map { .init(role: $0.role, content: $0.content) },
            stream: true
        )

        let urlString = "\(serverURL)/api/chat"
        let logger = self.logger
        let httpClient = self.httpClient

        return AsyncThrowingStream { continuation in
            let task = Task {
                do {
                    var httpRequest = HTTPClientRequest(url: urlString)
                    httpRequest.method = .POST
                    httpRequest.headers.add(name: "Content-Type", value: "application/json")
                    let body = try JSONEncoder().encode(request)
                    httpRequest.body = .bytes(body)

                    logger.info("Ollama: Streaming POST \(urlString) model=\(request.model)")

                    let response = try await httpClient.execute(httpRequest, timeout: .seconds(120))

                    guard response.status == .ok else {
                        logger.error("Ollama: Streaming error \(response.status)")
                        continuation.finish(throwing: Abort(.badGateway, reason: "Ollama returned status: \(response.status)"))
                        return
                    }

                    // Buffer incoming bytes and split on newlines for NDJSON parsing
                    var lineBuffer = ""
                    for try await buffer in response.body {
                        let chunk = String(buffer: buffer)
                        lineBuffer += chunk

                        while let newlineIndex = lineBuffer.firstIndex(of: "\n") {
                            let line = String(lineBuffer[lineBuffer.startIndex..<newlineIndex])
                            lineBuffer = String(lineBuffer[lineBuffer.index(after: newlineIndex)...])

                            guard !line.isEmpty,
                                  let data = line.data(using: .utf8) else { continue }

                            let decoded = try JSONDecoder().decode(OllamaChatResponse.self, from: data)
                            if let content = decoded.message?.content, !content.isEmpty {
                                continuation.yield(.content(content))
                            }
                            if decoded.done == true {
                                continuation.yield(.done(
                                    promptTokens: decoded.promptEvalCount,
                                    completionTokens: decoded.evalCount
                                ))
                                continuation.finish()
                                return
                            }
                        }
                    }

                    continuation.finish()
                } catch {
                    logger.error("Ollama streaming error: \(error)")
                    continuation.finish(throwing: error)
                }
            }

            continuation.onTermination = { @Sendable _ in
                task.cancel()
            }
        }
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

    /// Returns the system prompt string for a given agent ID.
    static func systemPrompt(for agentId: String) -> String {
        switch agentId {
        case "code":
            return "You are a code generation and debugging expert. Write correct, clean code with brief explanations. Always use appropriate code blocks."
        case "writer":
            return "You are a professional writing assistant. Help with writing, editing, proofreading, and improving clarity and style."
        case "summarizer":
            return "You are a summarization expert. Provide clear, concise summaries that capture the key points and main ideas."
        case "translator":
            return "You are a translation expert fluent in all languages. Translate accurately while preserving tone and meaning."
        case "creative":
            return "You are a creative brainstorming partner. Generate imaginative ideas, stories, and creative content."
        case "tutor":
            return "You are a patient tutor. Explain concepts step by step with clear examples suited to the learner's level."
        case "accessibility":
            return "You are an accessibility expert. Review content and code for accessibility issues and provide guidance on WCAG standards, ARIA usage, and inclusive design."
        default:
            return "You are a helpful, knowledgeable assistant. Be clear, accurate, and concise."
        }
    }

    /// Run a quick non-streaming classification to determine the best agent for a message.
    /// Returns one of: general, code, writer, summarizer, translator, creative, tutor, accessibility
    func classify(message: String) async -> String {
        let prompt = """
        You are a routing assistant. Based on the user's message, determine which assistant mode is most appropriate. \
        Reply with ONLY one word from this exact list, nothing else: general, code, writer, summarizer, translator, creative, tutor, accessibility

        User message: \(message)
        """
        let messages: [(role: String, content: String)] = [("user", prompt)]
        let result = (try? await complete(messages: messages)) ?? "general"
        let cleaned = result.trimmingCharacters(in: .whitespacesAndNewlines).lowercased()
        let validAgents = ["general", "code", "writer", "summarizer", "translator", "creative", "tutor", "accessibility"]
        for agent in validAgents {
            if cleaned.hasPrefix(agent) { return agent }
        }
        return "general"
    }
}

// MARK: - Application Storage

/// Storage key for the shared FoundationModelsClient singleton
struct FoundationModelsClientKey: StorageKey {
    typealias Value = FoundationModelsClient
}

extension Application {
    var foundationModelsClient: FoundationModelsClient {
        get {
            guard let client = self.storage[FoundationModelsClientKey.self] else {
                fatalError("FoundationModelsClient not configured. Call app.initializeFoundationModelsClient() in configure.swift")
            }
            return client
        }
        set {
            self.storage[FoundationModelsClientKey.self] = newValue
        }
    }

    /// Initialize the shared FoundationModelsClient from environment variables.
    func initializeFoundationModelsClient() {
        let serverURL = Environment.get("OLLAMA_URL") ?? "http://michaels-mbp:11435"
        let model = Environment.get("OLLAMA_MODEL") ?? "apple.local:latest"
        self.foundationModelsClient = FoundationModelsClient(
            client: self.client,
            httpClient: self.http.client.shared,
            serverURL: serverURL,
            model: model,
            logger: self.logger
        )
    }
}

extension Request {
    var foundationModels: FoundationModelsClient {
        self.application.foundationModelsClient
    }
}
