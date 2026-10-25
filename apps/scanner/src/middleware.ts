import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export function middleware(request: NextRequest) {
  const sessionCookie =
    request.cookies.get("better-auth.session_token") ??
    request.cookies.get("__Secure-better-auth.session_token");

  if (!sessionCookie) {
    const authUrl = process.env.NEXT_PUBLIC_AUTH_URL ?? "http://localhost:3003";
    const redirect = request.nextUrl.href;
    return NextResponse.redirect(`${authUrl}/login?redirect=${encodeURIComponent(redirect)}`);
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    // The service worker, manifest and icons must load without a session: the browser
    // fetches them on its own, and an installed app needs them to start offline.
    "/((?!api/auth|_next/static|_next/image|favicon\\.png|favicon\\.ico|background\\.svg|sw\\.js|manifest\\.json|icons/).*)",
  ],
};
