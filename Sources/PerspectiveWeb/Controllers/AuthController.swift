import Fluent
import Vapor

/// Controller handling Auth0 authentication flow
struct AuthController: RouteCollection {
    func boot(routes: RoutesBuilder) throws {
        let auth = routes.grouped("auth")
        
        auth.get("callback", use: callback)
    }
    
    /// GET /auth/callback - Handle Auth0 callback after authentication
    @Sendable
    func callback(req: Request) async throws -> Response {
        // Get authorization code from query
        guard let code = req.query[String.self, at: "code"] else {
            throw Abort(.badRequest, reason: "Missing authorization code")
        }
        
        // Verify state parameter to prevent CSRF
        let returnedState = req.query[String.self, at: "state"]
        let storedState = req.session.data["auth_state"]
        
        guard returnedState == storedState else {
            req.logger.warning("State mismatch: returned=\(returnedState ?? "nil"), stored=\(storedState ?? "nil")")
            throw Abort(.badRequest, reason: "Invalid state parameter")
        }
        
        // Clear the stored state
        req.session.data["auth_state"] = nil
        
        // Exchange code for tokens
        let tokenResponse = try await exchangeCodeForTokens(code: code, req: req)
        
        // Get user info from Auth0
        let userInfo = try await getUserInfo(accessToken: tokenResponse.accessToken, req: req)
        
        // Find or create user in database
        let user = try await findOrCreateUser(auth0ID: userInfo.sub, email: userInfo.email, name: userInfo.name, pictureURL: userInfo.picture, req: req)
        
        // Log the user in via session
        req.auth.login(user)
        
        // Redirect based on onboarding status
        if user.onboardingCompleted {
            return req.redirect(to: "/")
        } else {
            return req.redirect(to: "/onboarding")
        }
    }
    
    /// Exchange authorization code for tokens
    private func exchangeCodeForTokens(code: String, req: Request) async throws -> TokenResponse {
        let config = req.auth0Config
        
        let tokenRequest = TokenRequest(
            grantType: "authorization_code",
            clientID: config.clientID,
            clientSecret: config.clientSecret,
            code: code,
            redirectURI: config.callbackURL
        )
        
        let response = try await req.client.post(URI(string: config.tokenURL)) { clientReq in
            try clientReq.content.encode(tokenRequest, as: .urlEncodedForm)
        }
        
        guard response.status == .ok else {
            req.logger.error("Token exchange failed: \(response.status)")
            throw Abort(.unauthorized, reason: "Failed to authenticate")
        }
        
        return try response.content.decode(TokenResponse.self)
    }
    
    /// Get user info from Auth0
    private func getUserInfo(accessToken: String, req: Request) async throws -> UserInfoResponse {
        let config = req.auth0Config
        
        let response = try await req.client.get(URI(string: config.userInfoURL)) { clientReq in
            clientReq.headers.bearerAuthorization = BearerAuthorization(token: accessToken)
        }
        
        guard response.status == .ok else {
            req.logger.error("User info request failed: \(response.status)")
            throw Abort(.unauthorized, reason: "Failed to get user info")
        }
        
        return try response.content.decode(UserInfoResponse.self)
    }
    
    /// Find existing user or create new one
    private func findOrCreateUser(
        auth0ID: String,
        email: String,
        name: String,
        pictureURL: String?,
        req: Request
    ) async throws -> User {
        // Try to find existing user by Auth0 ID
        if let existingUser = try await User.query(on: req.db)
            .filter(\.$auth0ID == auth0ID)
            .first() {
            // Update user info in case it changed
            existingUser.email = email
            existingUser.name = name
            existingUser.pictureURL = pictureURL
            try await existingUser.save(on: req.db)
            return existingUser
        }
        
        // Create new user
        let newUser = User(
            auth0ID: auth0ID,
            email: email,
            name: name,
            pictureURL: pictureURL,
            onboardingCompleted: false
        )
        try await newUser.save(on: req.db)
        return newUser
    }
}

// MARK: - Request/Response DTOs

struct TokenRequest: Content {
    let grantType: String
    let clientID: String
    let clientSecret: String
    let code: String
    let redirectURI: String
    
    enum CodingKeys: String, CodingKey {
        case grantType = "grant_type"
        case clientID = "client_id"
        case clientSecret = "client_secret"
        case code
        case redirectURI = "redirect_uri"
    }
}

struct TokenResponse: Content {
    let accessToken: String
    let idToken: String?
    let tokenType: String
    let expiresIn: Int?
    
    enum CodingKeys: String, CodingKey {
        case accessToken = "access_token"
        case idToken = "id_token"
        case tokenType = "token_type"
        case expiresIn = "expires_in"
    }
}

struct UserInfoResponse: Content {
    let sub: String
    let email: String
    let name: String
    let picture: String?
}

