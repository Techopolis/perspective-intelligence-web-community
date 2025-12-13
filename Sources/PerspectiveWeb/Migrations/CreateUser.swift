import Fluent

struct CreateUser: AsyncMigration {
    func prepare(on database: Database) async throws {
        try await database.schema("users")
            .id()
            .field("auth0_id", .string, .required)
            .field("email", .string, .required)
            .field("name", .string, .required)
            .field("picture_url", .string)
            .field("onboarding_completed", .bool, .required, .custom("DEFAULT FALSE"))
            .field("goals", .string)
            .field("ai_familiarity", .string)
            .field("created_at", .datetime)
            .field("updated_at", .datetime)
            .unique(on: "auth0_id")
            .unique(on: "email")
            .create()
    }
    
    func revert(on database: Database) async throws {
        try await database.schema("users").delete()
    }
}

