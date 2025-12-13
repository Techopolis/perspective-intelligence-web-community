import Fluent
import Vapor

/// Represents a user authenticated via Auth0
final class User: Model, Content, @unchecked Sendable {
    static let schema = "users"
    
    @ID(key: .id)
    var id: UUID?
    
    /// Auth0 subject identifier (unique per user)
    @Field(key: "auth0_id")
    var auth0ID: String
    
    /// User's email address
    @Field(key: "email")
    var email: String
    
    /// User's display name
    @Field(key: "name")
    var name: String
    
    /// Profile picture URL from Auth0
    @OptionalField(key: "picture_url")
    var pictureURL: String?
    
    /// Whether user has completed onboarding
    @Field(key: "onboarding_completed")
    var onboardingCompleted: Bool
    
    /// User's stated goals (from onboarding)
    @OptionalField(key: "goals")
    var goals: String?
    
    /// User's AI familiarity level (from onboarding)
    @OptionalField(key: "ai_familiarity")
    var aiFamiliarity: String?
    
    @Timestamp(key: "created_at", on: .create)
    var createdAt: Date?
    
    @Timestamp(key: "updated_at", on: .update)
    var updatedAt: Date?
    
    /// User's chat conversations
    @Children(for: \.$user)
    var chats: [Chat]
    
    init() { }
    
    init(
        id: UUID? = nil,
        auth0ID: String,
        email: String,
        name: String,
        pictureURL: String? = nil,
        onboardingCompleted: Bool = false,
        goals: String? = nil,
        aiFamiliarity: String? = nil
    ) {
        self.id = id
        self.auth0ID = auth0ID
        self.email = email
        self.name = name
        self.pictureURL = pictureURL
        self.onboardingCompleted = onboardingCompleted
        self.goals = goals
        self.aiFamiliarity = aiFamiliarity
    }
}

/// Extension for session-based authentication
extension User: SessionAuthenticatable {
    var sessionID: UUID {
        self.id!
    }
}

/// Extension for model-based authentication
extension User: ModelSessionAuthenticatable { }

