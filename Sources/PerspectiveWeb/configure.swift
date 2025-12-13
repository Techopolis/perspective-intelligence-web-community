import NIOSSL
import Fluent
import FluentSQLiteDriver
import Leaf
import Vapor

// configures your application
public func configure(_ app: Application) async throws {
    // Serve files from /Public folder
    app.middleware.use(FileMiddleware(publicDirectory: app.directory.publicDirectory))
    
    // Configure sessions (required for Auth0)
    app.sessions.use(.fluent)
    app.middleware.use(app.sessions.middleware)
    
    // Configure database
    app.databases.use(DatabaseConfigurationFactory.sqlite(.file("db.sqlite")), as: .sqlite)
    
    // Register migrations in order
    app.migrations.add(CreateUser())
    app.migrations.add(CreateChat())
    app.migrations.add(CreateMessage())
    app.migrations.add(AddUserToChat())
    app.migrations.add(SessionRecord.migration)
    
    // Auto-migrate on startup
    try await app.autoMigrate()
    
    // Configure Leaf views
    app.views.use(.leaf)
    
    // Configure Auth0
    app.auth0Config = Auth0Config.fromEnvironment()
    
    // Log startup info
    app.logger.info("Perspective Web starting...")
    app.logger.info("Auth0 Domain: \(app.auth0Config.domain)")
    
    let ollamaURL = Environment.get("OLLAMA_URL") ?? "http://michaels-mbp:11435"
    let ollamaModel = Environment.get("OLLAMA_MODEL") ?? "apple.local:latest"
    
    if Environment.get("OLLAMA_URL") == nil {
        app.logger.warning("OLLAMA_URL not set - using default: \(ollamaURL)")
    } else {
        app.logger.info("Ollama URL: \(ollamaURL)")
    }
    app.logger.info("Ollama Model: \(ollamaModel)")
    
    // Test connection to Ollama server at startup
    app.logger.info("Testing connection to Ollama server...")
    do {
        let response = try await app.client.get(URI(string: "\(ollamaURL)/api/tags"))
        if response.status == .ok {
            app.logger.info("Ollama server is reachable!")
            
            // Parse and show available models
            struct ModelsResponse: Content {
                var models: [ModelInfo]?
                struct ModelInfo: Content {
                    var name: String
                }
            }
            if let modelsResponse = try? response.content.decode(ModelsResponse.self),
               let models = modelsResponse.models {
                let modelNames = models.map { $0.name }.joined(separator: ", ")
                app.logger.info("Available models: \(modelNames)")
            }
        } else {
            app.logger.error("Ollama server returned: \(response.status)")
        }
    } catch {
        app.logger.warning("Cannot connect to Ollama at \(ollamaURL) - will retry on first request")
    }
    
    // Register routes
    try routes(app)
}
