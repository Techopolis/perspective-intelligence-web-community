import Vapor

// MARK: - DTOs

/// Message input from help chatbot client
struct HelpMessageInput: Content {
    var content: String
}

/// Follow-up suggestion sent to client
struct HelpFollowup: Content {
    var label: String
    var value: String
}

/// WebSocket message sent to help chatbot client
struct HelpWebSocketMessage: Content {
    var type: String
    var agent: String?
    var agentName: String?
    var content: String?
    var fullContent: String?
    var followups: [HelpFollowup]?
    var message: String?

    init(type: String, agent: String? = nil, agentName: String? = nil,
         content: String? = nil, fullContent: String? = nil,
         followups: [HelpFollowup]? = nil, message: String? = nil) {
        self.type = type
        self.agent = agent
        self.agentName = agentName
        self.content = content
        self.fullContent = fullContent
        self.followups = followups
        self.message = message
    }
}

// MARK: - Handler

/// Actor-based handler for the Techopolis help chatbot WebSocket.
/// One instance per connection; maintains ephemeral conversation history.
actor TechopolisHelpHandler {
    private let client: FoundationModelsClient
    private let logger: Logger
    private var conversationHistory: [(role: String, content: String)] = []
    private static let maxHistoryMessages = 20

    private static let agentKeywords: [(id: String, name: String, keywords: [String])] = [
        ("techopolis-apps", "Apps Specialist", [
            "app", "perspective intelligence", "perspective notify", "perspective meetings",
            "current city", "beyond the gallery",
            "download", "install", "subscription", "app store",
            "iphone", "ipad", "apple watch", "vision pro", "visionos",
        ]),
        ("techopolis-services", "Services Specialist", [
            "service", "develop", "build", "accessibility test", "accessibility audit",
            "ux test", "user experience test", "hire", "contract", "native app",
            "remediat", "wcag", "voiceover test",
        ]),
        ("techopolis-courses", "Courses Specialist", [
            "course", "learn", "tutorial", "swiftui", "python", "terminal",
            "class", "training", "teach", "lesson", "all access",
        ]),
        ("techopolis-social", "Community Specialist", [
            "social", "discord", "twitter", "mastodon", "github",
            "community", "contact", "email", "follow", "join",
            "website", "online",
        ]),
    ]

    init(client: FoundationModelsClient, logger: Logger) {
        self.client = client
        self.logger = logger
    }

    // MARK: - Main Message Handler

    func handleMessage(_ text: String, ws: WebSocket) async {
        do {
            guard let data = text.data(using: .utf8) else { return }
            let input = try JSONDecoder().decode(HelpMessageInput.self, from: data)

            let agentId = Self.routeQuery(input.content)
            let agentName = Self.agentName(for: agentId)

            conversationHistory.append((role: "user", content: input.content))
            trimHistory()

            // Notify client of the selected agent
            let agentMsg = HelpWebSocketMessage(type: "agent", agent: agentId, agentName: agentName)
            try await send(agentMsg, to: ws)

            // Build messages array with system prompt + conversation history
            let prompt = Self.systemPrompt(for: agentId)
            var messages: [(role: String, content: String)] = [
                (role: "system", content: prompt)
            ]
            messages.append(contentsOf: conversationHistory)

            // Stream response
            var fullContent = ""
            let stream = client.completeStreaming(messages: messages)

            do {
                for try await event in stream {
                    switch event {
                    case .content(let chunk):
                        fullContent += chunk
                        let chunkMsg = HelpWebSocketMessage(type: "chunk", content: chunk)
                        try await send(chunkMsg, to: ws)
                    case .done:
                        break
                    }
                }
            } catch {
                logger.error("Help streaming error: \(error)")
                if fullContent.isEmpty {
                    fullContent = "I am having trouble connecting right now. Please try again or email us at techopolis@techopolisonline.com."
                }
            }

            // Extract follow-ups from LLM response
            var (cleanContent, followups) = Self.extractFollowups(from: fullContent)

            // Default follow-ups if the model did not produce any
            if followups.isEmpty {
                followups = Self.defaultFollowups(for: agentId)
            }

            conversationHistory.append((role: "assistant", content: cleanContent))
            trimHistory()

            let doneMsg = HelpWebSocketMessage(
                type: "done", fullContent: cleanContent, followups: followups
            )
            try await send(doneMsg, to: ws)

        } catch {
            logger.error("Help handler error: \(error)")
            let errorMsg = HelpWebSocketMessage(
                type: "error", message: "Something went wrong. Please try again."
            )
            try? await send(errorMsg, to: ws)
        }
    }

    // MARK: - Routing

    private static func routeQuery(_ message: String) -> String {
        let lower = message.lowercased()
        var bestAgent = "techopolis-manager"
        var bestScore = 0

        for agent in agentKeywords {
            let score = agent.keywords.filter { lower.contains($0) }.count
            if score > bestScore {
                bestScore = score
                bestAgent = agent.id
            }
        }

        return bestAgent
    }

    private static func agentName(for agentId: String) -> String {
        if let agent = agentKeywords.first(where: { $0.id == agentId }) {
            return agent.name
        }
        return "Techopolis Support"
    }

    // MARK: - Follow-up Extraction

    static func extractFollowups(from text: String) -> (String, [HelpFollowup]) {
        var followups: [HelpFollowup] = []
        var cleanText = text

        // Match [FOLLOWUP:label|value], bare FOLLOWUP:label|value, and [FOLLOWUP:label] (no pipe)
        // Label stops at | or ] or newline; value stops at ] or newline
        let pattern = "\\[?FOLLOWUP:([^|\\]\\n]+)(?:\\|([^\\]\\n]+))?\\]?"
        guard let regex = try? NSRegularExpression(pattern: pattern) else {
            return (cleanText, followups)
        }

        let nsRange = NSRange(text.startIndex..., in: text)
        let matches = regex.matches(in: text, range: nsRange)

        for match in matches {
            if let labelRange = Range(match.range(at: 1), in: text) {
                let label = String(text[labelRange]).trimmingCharacters(in: .whitespaces)
                let value: String
                if match.range(at: 2).location != NSNotFound,
                   let valueRange = Range(match.range(at: 2), in: text) {
                    value = String(text[valueRange]).trimmingCharacters(in: .whitespaces)
                } else {
                    // No pipe — use label as both label and value
                    value = label
                }
                followups.append(HelpFollowup(label: label, value: value))
            }
        }

        cleanText = regex.stringByReplacingMatches(
            in: text, range: nsRange, withTemplate: ""
        ).trimmingCharacters(in: .whitespacesAndNewlines)

        return (cleanText, followups)
    }

    private static func defaultFollowups(for agentId: String) -> [HelpFollowup] {
        switch agentId {
        case "techopolis-apps":
            return [
                HelpFollowup(label: "Perspective Intelligence", value: "Tell me about Perspective Intelligence"),
                HelpFollowup(label: "See all apps", value: "What are all of your apps?"),
            ]
        case "techopolis-services":
            return [
                HelpFollowup(label: "Get a quote", value: "How do I get a quote for app development?"),
                HelpFollowup(label: "Accessibility audit", value: "Tell me about accessibility testing"),
            ]
        case "techopolis-courses":
            return [
                HelpFollowup(label: "Free courses", value: "Which courses are free?"),
                HelpFollowup(label: "All Access", value: "What does the All Access subscription include?"),
            ]
        case "techopolis-social":
            return [
                HelpFollowup(label: "Join Discord", value: "How do I join the Discord?"),
                HelpFollowup(label: "Email support", value: "What is the support email?"),
            ]
        default:
            return [
                HelpFollowup(label: "Our apps", value: "What apps does Techopolis make?"),
                HelpFollowup(label: "Contact us", value: "How can I contact Techopolis?"),
            ]
        }
    }

    // MARK: - Helpers

    private func trimHistory() {
        if conversationHistory.count > Self.maxHistoryMessages {
            conversationHistory = Array(conversationHistory.suffix(Self.maxHistoryMessages))
        }
    }

    private func send(_ msg: HelpWebSocketMessage, to ws: WebSocket) async throws {
        let data = try JSONEncoder().encode(msg)
        guard let str = String(data: data, encoding: .utf8) else { return }
        try await ws.send(str)
    }

    // MARK: - System Prompts

    static func systemPrompt(for agentId: String) -> String {
        let followupFormat = """

At the end of your response, suggest 2 relevant follow-up questions the user might ask. \
Format each on its own line exactly like this:
[FOLLOWUP:Short label|Full question text]
[FOLLOWUP:Short label|Full question text]
Labels should be 2-4 words. Always include exactly 2.
"""

        switch agentId {
        case "techopolis-apps":
            return """
You are a friendly customer support agent for Techopolis, specializing in apps. \
Answer using ONLY the knowledge below. Be concise and conversational. \
If you cannot answer, say so and suggest emailing techopolis@techopolisonline.com. \
If the question is not about apps, include this follow-up: \
[FOLLOWUP:Ask general support|I have a question that is not about apps]

TECHOPOLIS APPS:

1. Perspective Intelligence - Flagship private on-device AI assistant
   Platforms: iPhone, iPad, Mac, Apple Watch | Price: Free + All Access ($5.99/mo or $49.99/yr)
   Rating: 4.6 stars | Requires: iOS 26.0+ | Size: 60.9 MB
   Free: Chat, OCR, AI Vision, conversation export, Image Playgrounds, Apple Watch
   Premium: Voice mode, audio transcription, chat memories, contacts, POI search, weather, RSS, web search, email
   Privacy: All on-device via Apple Foundation Models. Data never leaves your device.
   App Store: https://apps.apple.com/us/app/perspective-intelligence/id6448894750

2. Perspective Notify - Push notifications via OneSignal | $3.99 | iPhone, iPad

3. Perspective Meetings - Meeting link organizer (Zoom, Google Meet) | Free | iPhone, iPad, Apple Vision

4. Beyond The Gallery - Apple Shortcuts community | Free | iPhone, iPad

5. Current City - Location display for travelers | $0.99 | iPhone, iPad

All apps: https://apps.apple.com/us/developer/techopolis-online-solutions-llc/id1581877697
\(followupFormat)
"""

        case "techopolis-services":
            return """
You are a friendly customer support agent for Techopolis, specializing in services. \
Answer using ONLY the knowledge below. Be concise and conversational. \
If you cannot answer, say so and suggest emailing techopolis@techopolisonline.com. \
If the question is not about services, include this follow-up: \
[FOLLOWUP:Ask general support|I have a question that is not about services]

TECHOPOLIS SERVICES:

1. Native App Development
   - Custom native iOS and Android app development (not cross-platform)
   - Competitive pricing, specializing in accessible and privacy-focused apps
   - Contact: techopolis@techopolisonline.com

2. Accessibility Testing & Auditing
   - Mobile app accessibility testing for iOS, Android, and visionOS
   - Full accessibility audit with VoiceOver and assistive technology testing
   - WCAG compliance review
   - Optional remediation services to fix issues found
   - Book: https://techopolis.app/user-experience-details
   - Contact: techopolis@techopolisonline.com

3. User Experience Testing
   - Product evaluation for effectiveness across diverse user types
   - Contact: techopolis@techopolisonline.com
\(followupFormat)
"""

        case "techopolis-courses":
            return """
You are a friendly customer support agent for Techopolis, specializing in courses. \
Answer using ONLY the knowledge below. Be concise and conversational. \
If you cannot answer, say so and suggest emailing techopolis@techopolisonline.com. \
If the question is not about courses, include this follow-up: \
[FOLLOWUP:Ask general support|I have a question that is not about courses]

TECHOPOLIS COURSES (all at https://techopolis.app/courses):

1. SwiftUI Basics - Free - Build SwiftUI apps on iPad with Swift Playgrounds
2. Practical Python - Free - Automation-focused, hands-on Python programming
3. Apple App Development - Coming Soon (pre-order) - Full Apple platform dev course, launching September
4. Accessing the Mac Terminal Accessibly - Free - Use Mac Terminal with VoiceOver screen reader
5. All Access Subscription - Unlock every Techopolis course
\(followupFormat)
"""

        case "techopolis-social":
            return """
You are a friendly customer support agent for Techopolis, specializing in community and social. \
Answer using ONLY the knowledge below. Be concise and conversational. \
If you cannot answer, say so and suggest emailing techopolis@techopolisonline.com. \
If the question is not about community or contact info, include this follow-up: \
[FOLLOWUP:Ask general support|I have a different question]

TECHOPOLIS COMMUNITY & CONTACT:

- Discord: https://discord.gg/fqgx5jAG (100+ members, tech discussions)
- Mastodon: https://techopolis.social
- X (Twitter): @techopolis
- GitHub: https://github.com/Techopolis-Online/ (9 repos, open-source projects)
- Email: techopolis@techopolisonline.com
- Website: https://techopolis.app
- Location: Texas, USA (Central Time)
\(followupFormat)
"""

        default: // techopolis-manager
            return """
You are the main Techopolis customer support agent with comprehensive knowledge. \
Answer any question about the company, apps, services, courses, or community. \
Be friendly, concise, and helpful. If you truly cannot answer, suggest emailing techopolis@techopolisonline.com.

COMPANY: Techopolis LLC - Texas, USA - https://techopolis.app
Founded by Michael Doise. Taylor Arndt is the developer and accessibility specialist.
Mission: Privacy-focused, accessible experiences for iOS, macOS, visionOS, and beyond.

APPS (https://apps.apple.com/us/developer/techopolis-online-solutions-llc/id1581877697):
1. Perspective Intelligence - Private on-device AI assistant (Free + $5.99/mo). iPhone, iPad, Mac, Watch. 4.6 stars.
2. Perspective Notify - Push notifications ($3.99). iPhone, iPad.
3. Perspective Meetings - Meeting link organizer (Free). iPhone, iPad, Vision.
4. Beyond The Gallery - Apple Shortcuts community (Free). iPhone, iPad.
5. Current City - Travel location display ($0.99). iPhone, iPad.

SERVICES:
1. Native App Development - iOS & Android, accessible and privacy-focused
2. Accessibility Testing & Auditing - iOS, Android, visionOS, WCAG, VoiceOver, optional remediation
3. UX Testing - Product evaluation for diverse users
Contact: techopolis@techopolisonline.com

COURSES (https://techopolis.app/courses):
1. SwiftUI Basics (Free) 2. Practical Python (Free) 3. Apple App Dev (Coming Soon)
4. Mac Terminal Accessibly (Free) 5. All Access subscription

COMMUNITY:
Discord: https://discord.gg/fqgx5jAG | Mastodon: https://techopolis.social
X: @techopolis | GitHub: https://github.com/Techopolis-Online/
Email: techopolis@techopolisonline.com
\(followupFormat)
"""
        }
    }
}
