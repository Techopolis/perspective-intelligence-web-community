import Fluent
import Leaf
import Vapor

/// WebSocket message wrapper for encoding
struct WebSocketMessage: Content {
    var type: String
    var message: MessageDTO?
    var error: String?
}

/// Context for rendering the main chat view
struct ChatViewContext: Content {
    var includeChat: Bool
    var userName: String
    var chatID: String?
}

func routes(_ app: Application) throws {
    // ============================================
    // DEMO MODE - Set to false to require login
    // ============================================
    let demoMode = true
    
    // Health check endpoint (always public)
    app.get("health") { req async -> HTTPStatus in
        .ok
    }
    
    if demoMode {
        // ============================================
        // DEMO MODE ROUTES - No authentication required
        // ============================================
        
        // Main chat page (demo)
        app.get { req async throws -> View in
            let context = ChatViewContext(includeChat: true, userName: "Demo User", chatID: nil)
            return try await req.view.render("index", context)
        }
        
        // Chat view for specific chat (demo)
        app.get("chat", ":chatID") { req async throws -> View in
            guard let chatID = req.parameters.get("chatID", as: UUID.self) else {
                throw Abort(.badRequest)
            }
            let context = ChatViewContext(includeChat: true, userName: "Demo User", chatID: chatID.uuidString)
            return try await req.view.render("index", context)
        }
        
        // API routes (demo - no user filtering)
        try app.register(collection: DemoChatController())
        try app.register(collection: DemoMessageController())
        
        // WebSocket for streaming (demo - no auth)
        app.webSocket("ws", "chat", ":chatID") { req, ws async in
            guard let chatID = req.parameters.get("chatID", as: UUID.self) else {
                try? await ws.close(code: .unacceptableData)
                return
            }

            let handler = ChatConnectionHandler(
                chatID: chatID,
                db: req.db,
                client: req.application.foundationModelsClient,
                logger: req.logger
            )

            ws.onText { ws, text async in
                await handler.handleMessage(text, ws: ws)
            }
        }
        
    } else {
        // ============================================
        // PRODUCTION ROUTES - Authentication required
        // ============================================
        
        // Login page
        app.get("login") { req async throws -> View in
            if req.auth.has(User.self) {
                throw Abort.redirect(to: "/")
            }
            let state = UUID().uuidString
            req.session.data["auth_state"] = state
            let loginURL = req.auth0Config.authorizationURL(state: state)
            return try await req.view.render("login", ["loginURL": loginURL])
        }
        
        // Logout
        app.get("logout") { req async throws -> Response in
            req.auth.logout(User.self)
            req.session.destroy()
            let logoutURL = req.auth0Config.logoutRedirectURL()
            return req.redirect(to: logoutURL)
        }
        
        // Auth callback routes
        try app.register(collection: AuthController())
        
        // Protected routes
        let protected = app.grouped(UserSessionAuthenticator())
            .grouped(AuthMiddleware())
            .grouped(OnboardingMiddleware())
        
        // Main chat page
        protected.get { req async throws -> View in
            let user = try req.auth.require(User.self)
            let context = ChatViewContext(includeChat: true, userName: user.name, chatID: nil)
            return try await req.view.render("index", context)
        }
        
        // Chat view for specific chat
        protected.get("chat", ":chatID") { req async throws -> View in
            guard let chatID = req.parameters.get("chatID", as: UUID.self) else {
                throw Abort(.badRequest)
            }
            let user = try req.auth.require(User.self)
            guard let chat = try await Chat.find(chatID, on: req.db),
                  chat.$user.id == user.id else {
                throw Abort(.notFound)
            }
            let context = ChatViewContext(includeChat: true, userName: user.name, chatID: chatID.uuidString)
            return try await req.view.render("index", context)
        }
        
        // Onboarding routes
        let authOnly = app.grouped(UserSessionAuthenticator())
            .grouped(AuthMiddleware())
        try authOnly.register(collection: OnboardingController())
        
        // API routes (protected)
        try protected.register(collection: ChatController())
        try protected.register(collection: MessageController())
        
        // WebSocket for streaming (protected)
        protected.webSocket("ws", "chat", ":chatID") { req, ws async in
            guard let chatID = req.parameters.get("chatID", as: UUID.self) else {
                try? await ws.close(code: .unacceptableData)
                return
            }

            guard let user = req.auth.get(User.self) else {
                try? await ws.close(code: .policyViolation)
                return
            }

            guard let chat = try? await Chat.find(chatID, on: req.db),
                  chat.$user.id == user.id else {
                try? await ws.close(code: .policyViolation)
                return
            }

            let handler = ChatConnectionHandler(
                chatID: chatID,
                db: req.db,
                client: req.application.foundationModelsClient,
                logger: req.logger
            )

            ws.onText { ws, text async in
                await handler.handleMessage(text, ws: ws)
            }
        }
    }
}
