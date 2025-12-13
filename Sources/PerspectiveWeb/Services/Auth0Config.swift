import Vapor

/// Configuration for Auth0 OAuth integration
struct Auth0Config {
    /// Auth0 domain (e.g., "yourapp.us.auth0.com")
    let domain: String
    
    /// Auth0 client ID
    let clientID: String
    
    /// Auth0 client secret
    let clientSecret: String
    
    /// Callback URL after Auth0 authentication
    let callbackURL: String
    
    /// Logout redirect URL
    let logoutURL: String
    
    /// Initialize from environment variables
    static func fromEnvironment() -> Auth0Config {
        Auth0Config(
            domain: Environment.get("AUTH0_DOMAIN") ?? "YOUR_AUTH0_DOMAIN",
            clientID: Environment.get("AUTH0_CLIENT_ID") ?? "YOUR_CLIENT_ID",
            clientSecret: Environment.get("AUTH0_CLIENT_SECRET") ?? "YOUR_CLIENT_SECRET",
            callbackURL: Environment.get("AUTH0_CALLBACK_URL") ?? "http://localhost:8080/auth/callback",
            logoutURL: Environment.get("AUTH0_LOGOUT_URL") ?? "http://localhost:8080"
        )
    }
    
    /// Generate the authorization URL
    func authorizationURL(state: String) -> String {
        var components = URLComponents()
        components.scheme = "https"
        components.host = domain
        components.path = "/authorize"
        components.queryItems = [
            URLQueryItem(name: "response_type", value: "code"),
            URLQueryItem(name: "client_id", value: clientID),
            URLQueryItem(name: "redirect_uri", value: callbackURL),
            URLQueryItem(name: "scope", value: "openid profile email"),
            URLQueryItem(name: "state", value: state)
        ]
        return components.url?.absoluteString ?? ""
    }
    
    /// Generate the token endpoint URL
    var tokenURL: String {
        "https://\(domain)/oauth/token"
    }
    
    /// Generate the userinfo endpoint URL
    var userInfoURL: String {
        "https://\(domain)/userinfo"
    }
    
    /// Generate the logout URL
    func logoutRedirectURL() -> String {
        var components = URLComponents()
        components.scheme = "https"
        components.host = domain
        components.path = "/v2/logout"
        components.queryItems = [
            URLQueryItem(name: "client_id", value: clientID),
            URLQueryItem(name: "returnTo", value: logoutURL)
        ]
        return components.url?.absoluteString ?? ""
    }
}

/// Storage key for Auth0 config
struct Auth0ConfigKey: StorageKey {
    typealias Value = Auth0Config
}

extension Application {
    var auth0Config: Auth0Config {
        get {
            self.storage[Auth0ConfigKey.self] ?? Auth0Config.fromEnvironment()
        }
        set {
            self.storage[Auth0ConfigKey.self] = newValue
        }
    }
}

extension Request {
    var auth0Config: Auth0Config {
        self.application.auth0Config
    }
}

