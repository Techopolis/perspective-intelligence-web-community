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
    app.logger.info("Foundation Models URL: \(Environment.get("FOUNDATION_MODELS_URL") ?? "http://localhost:8081")")
    
    // Register routes
    try routes(app)
}
