import { handlers } from "@/lib/auth";
import { NextRequest } from "next/server";

// Auth.js uses the server's internal URL (localhost:3000) to construct redirect
// URLs and callback URLs. This rewrites all occurrences of the internal origin
// in Location headers, JSON bodies, and query parameters to use the actual
// hostname from the Host header.
function fixResponse(req: NextRequest, response: Response): Response | Promise<Response> {
  const host = req.headers.get("host");
  if (!host) return response;

  const proto = req.headers.get("x-forwarded-proto") || "http";
  const internalOrigin = new URL(req.url).origin;
  const externalOrigin = `${proto}://${host}`;

  if (internalOrigin === externalOrigin) return response;

  const encodedInternal = encodeURIComponent(internalOrigin);
  const encodedExternal = encodeURIComponent(externalOrigin);
  const replaceOrigin = (s: string) =>
    s.replaceAll(internalOrigin, externalOrigin)
     .replaceAll(encodedInternal, encodedExternal);

  // Check if Location header or body needs fixing
  const location = response.headers.get("location");
  const contentType = response.headers.get("content-type") || "";
  const hasLocationToFix = location?.includes(internalOrigin) || location?.includes(encodedInternal);
  const isJson = contentType.includes("application/json");

  // Nothing to fix
  if (!hasLocationToFix && !isJson) return response;

  // Fix Location header
  const newHeaders = new Headers(response.headers);
  if (hasLocationToFix) {
    newHeaders.set("location", replaceOrigin(location!));
  }

  // Fix JSON body
  if (isJson) {
    return response.text().then((text) => {
      const fixed = text.includes(internalOrigin) ? replaceOrigin(text) : text;
      return new Response(fixed, {
        status: response.status,
        statusText: response.statusText,
        headers: newHeaders,
      });
    });
  }

  // Only Location was fixed, keep original body
  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers: newHeaders,
  });
}

export async function GET(req: NextRequest) {
  const res = await handlers.GET(req);
  return fixResponse(req, res);
}

export async function POST(req: NextRequest) {
  const res = await handlers.POST(req);
  return fixResponse(req, res);
}
