import type { Metadata } from "next";
import { AuthProvider } from "@/hooks/use-auth";
import { ToastProvider } from "@/components/ui/toaster";

export const metadata: Metadata = {
  title: "Sign in",
};

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <AuthProvider>
      <ToastProvider>
        <div
          className="flex min-h-screen"
          style={{ backgroundColor: "#0d0d0d" }}
        >
          {/* Left side - branding */}
          <div
            className="hidden w-1/2 flex-col items-center justify-center p-12 lg:flex"
            style={{
              background:
                "linear-gradient(180deg, #0a1628 0%, #0f3a4a 100%)",
            }}
            aria-hidden="true"
          >
            <div className="max-w-md text-center">
              <h1
                className="mb-6 text-4xl font-bold italic text-white"
                style={{
                  fontFamily: "var(--font-playfair), Georgia, serif",
                }}
              >
                Perspective Intelligence
              </h1>
              <p className="text-lg text-white/80">
                Your private AI assistant powered by on-device models. Chat
                naturally, keep your data safe.
              </p>
            </div>
          </div>

          {/* Right side - auth form */}
          <main
            id="main-content"
            className="flex w-full flex-col items-center justify-center p-8 lg:w-1/2"
            style={{ backgroundColor: "#0d0d0d" }}
          >
            <h1 className="sr-only">Account</h1>
            <div className="w-full max-w-md">{children}</div>
          </main>
        </div>
      </ToastProvider>
    </AuthProvider>
  );
}
