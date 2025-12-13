import Fluent
import Leaf
import Vapor

/// Controller for handling user onboarding flow
struct OnboardingController: RouteCollection {
    func boot(routes: RoutesBuilder) throws {
        let onboarding = routes.grouped("onboarding")
        
        onboarding.get(use: index)
        onboarding.post(use: complete)
    }
    
    /// GET /onboarding - Show onboarding page
    @Sendable
    func index(req: Request) async throws -> View {
        guard let user = req.auth.get(User.self) else {
            throw Abort(.unauthorized)
        }
        
        // If already onboarded, redirect to main app
        if user.onboardingCompleted {
            throw Abort.redirect(to: "/")
        }
        
        let context = OnboardingContext(
            userName: user.name,
            userEmail: user.email
        )
        
        return try await req.view.render("onboarding", context)
    }
    
    /// POST /onboarding - Complete onboarding
    @Sendable
    func complete(req: Request) async throws -> Response {
        guard let user = req.auth.get(User.self) else {
            throw Abort(.unauthorized)
        }
        
        let input = try req.content.decode(OnboardingInput.self)
        
        // Update user with onboarding data
        user.goals = input.goals
        user.aiFamiliarity = input.aiFamiliarity
        user.onboardingCompleted = true
        
        try await user.save(on: req.db)
        
        return req.redirect(to: "/")
    }
}

// MARK: - DTOs

struct OnboardingContext: Content {
    let userName: String
    let userEmail: String
}

struct OnboardingInput: Content {
    let goals: String?
    let aiFamiliarity: String?
}

