import Vapor

/// Middleware that ensures user is authenticated via session
struct AuthMiddleware: AsyncMiddleware {
    func respond(to request: Request, chainingTo next: AsyncResponder) async throws -> Response {
        // Check if user is authenticated via session
        guard let user = request.auth.get(User.self) else {
            // Redirect to login page for web requests
            if request.headers.accept.contains(where: { $0.mediaType == .html }) {
                return request.redirect(to: "/login")
            }
            // Return 401 for API requests
            throw Abort(.unauthorized, reason: "Authentication required")
        }
        
        // Store user in request for easy access
        request.auth.login(user)
        
        return try await next.respond(to: request)
    }
}

/// Middleware that checks if user has completed onboarding
struct OnboardingMiddleware: AsyncMiddleware {
    func respond(to request: Request, chainingTo next: AsyncResponder) async throws -> Response {
        guard let user = request.auth.get(User.self) else {
            return request.redirect(to: "/login")
        }
        
        // If user hasn't completed onboarding, redirect there
        if !user.onboardingCompleted {
            // Allow access to onboarding routes
            let path = request.url.path
            if path.hasPrefix("/onboarding") || path == "/logout" {
                return try await next.respond(to: request)
            }
            return request.redirect(to: "/onboarding")
        }
        
        return try await next.respond(to: request)
    }
}

/// Session authenticator for User model
struct UserSessionAuthenticator: AsyncSessionAuthenticator {
    typealias User = PerspectiveWeb.User
    
    func authenticate(sessionID: User.SessionID, for request: Request) async throws {
        if let user = try await User.find(sessionID, on: request.db) {
            request.auth.login(user)
        }
    }
}

