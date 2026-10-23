import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Retrieve token from secure cookies
  const accessToken =
    request.cookies.get("accessToken")?.value ||
    request.cookies.get("token")?.value;

  const isProtectedPath =
    pathname.startsWith("/company/dashboard") ||
    pathname.startsWith("/assessment") ||
    pathname.startsWith("/admin") ||
    pathname.startsWith("/dashboard");

  if (isProtectedPath && !accessToken) {
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("redirect", pathname);
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/company/dashboard/:path*",
    "/assessment/:path*",
    "/admin/:path*",
    "/dashboard/:path*",
  ],
};
