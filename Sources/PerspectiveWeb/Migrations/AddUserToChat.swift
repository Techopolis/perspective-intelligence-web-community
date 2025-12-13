import Fluent

struct AddUserToChat: AsyncMigration {
    func prepare(on database: Database) async throws {
        try await database.schema("chats")
            .field("user_id", .uuid, .references("users", "id", onDelete: .cascade))
            .update()
    }
    
    func revert(on database: Database) async throws {
        try await database.schema("chats")
            .deleteField("user_id")
            .update()
    }
}

