import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export function middleware(request: NextRequest) {
  const sessionCookie =
    request.cookies.get("better-auth.session_token") ??
    request.cookies.get("__Secure-better-auth.session_token");

  if (!sessionCookie) {
    const authUrl = process.env.NEXT_PUBLIC_AUTH_URL ?? "http://localhost:3003";
    const redirect = request.nextUrl.origin;
    return NextResponse.redirect(`${authUrl}/login?redirect=${encodeURIComponent(redirect)}`);
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/((?!api/auth|_next/static|_next/image|favicon\\.ico|sw\\.js|manifest\\.json|icons/).*)",
  ],
};
