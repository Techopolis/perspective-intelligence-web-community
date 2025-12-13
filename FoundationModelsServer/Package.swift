// swift-tools-version:6.0
import PackageDescription

let package = Package(
    name: "FoundationModelsServer",
    platforms: [
        .macOS(.v26)  // Requires macOS 26 for Foundation Models
    ],
    dependencies: [
        .package(url: "https://github.com/vapor/vapor.git", from: "4.115.0"),
    ],
    targets: [
        .executableTarget(
            name: "FoundationModelsServer",
            dependencies: [
                .product(name: "Vapor", package: "vapor"),
            ]
        )
    ]
)

