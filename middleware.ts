import { NextResponse, type NextRequest } from "next/server";

// Cheap edge check for a session cookie; the (app) layout verifies the session and onboarding state.
export function middleware(req: NextRequest) {
  const has = req.cookies.has("authjs.session-token") || req.cookies.has("__Secure-authjs.session-token");
  if (has) return NextResponse.next();
  if (req.nextUrl.pathname.startsWith("/api/")) return NextResponse.json({ error: "Sign in required" }, { status: 401 });
  return NextResponse.redirect(new URL("/login", req.url));
}

export const config = { matcher: ["/((?!login|api/auth|_next|tesseract/|favicon.ico).*)"] };
