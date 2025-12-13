// swift-tools-version:6.0
import PackageDescription

let package = Package(
    name: "FoundationModelsServer",
    platforms: [
        .macOS(.v14)  // Minimum macOS 14, Foundation Models checked at runtime
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

