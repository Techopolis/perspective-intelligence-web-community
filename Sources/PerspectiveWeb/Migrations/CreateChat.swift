import Fluent

struct CreateChat: AsyncMigration {
    func prepare(on database: Database) async throws {
        try await database.schema("chats")
            .id()
            .field("title", .string, .required)
            .field("created_at", .datetime)
            .field("updated_at", .datetime)
            .create()
    }
    
    func revert(on database: Database) async throws {
        try await database.schema("chats").delete()
    }
}

