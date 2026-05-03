import { auth } from "@jf/auth";

function getAllowedOrigins(): string[] {
  return (process.env.TRUSTED_ORIGINS ?? "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
}

function withCors(response: Response, origin: string): Response {
  const headers = new Headers(response.headers);
  headers.set("Access-Control-Allow-Origin", origin);
  headers.set("Access-Control-Allow-Credentials", "true");
  headers.set("Vary", "Origin");
  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers,
  });
}

export async function GET(request: Request) {
  const origin = request.headers.get("origin");
  const response = await auth.handler(request);
  if (origin && getAllowedOrigins().includes(origin)) {
    return withCors(response, origin);
  }
  return response;
}

export async function POST(request: Request) {
  const origin = request.headers.get("origin");
  const response = await auth.handler(request);
  if (origin && getAllowedOrigins().includes(origin)) {
    return withCors(response, origin);
  }
  return response;
}

export async function OPTIONS(request: Request) {
  const origin = request.headers.get("origin");
  if (origin && getAllowedOrigins().includes(origin)) {
    return new Response(null, {
      status: 204,
      headers: {
        "Access-Control-Allow-Origin": origin,
        "Access-Control-Allow-Credentials": "true",
        "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type, Authorization",
        Vary: "Origin",
      },
    });
  }
  return new Response(null, { status: 403 });
}
