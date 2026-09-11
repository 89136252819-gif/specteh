import { NextRequest, NextResponse } from "next/server";
import { jwtVerify } from "jose";

const COOKIE = "spetsteh_session";
const PUBLIC = ["/login", "/d", "/fonts", "/order"];

function secret() {
  return new TextEncoder().encode(process.env.AUTH_SECRET || "dev-secret-change-in-production-spetsteh-2026");
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  if (
    pathname.startsWith("/_next") ||
    pathname.startsWith("/uploads") ||
    pathname === "/favicon.ico" ||
    pathname === "/favicon.png" ||
    pathname === "/logo.png" ||
    /\.(?:png|jpe?g|gif|svg|webp|ico|txt|xml|woff2?)$/i.test(pathname) ||
    PUBLIC.some((p) => pathname === p || pathname.startsWith(`${p}/`))
  ) {
    return NextResponse.next();
  }

  const token = request.cookies.get(COOKIE)?.value;
  if (!token) {
    if (pathname === "/") {
      return NextResponse.redirect(new URL("/order", request.url));
    }
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    url.searchParams.set("next", pathname);
    return NextResponse.redirect(url);
  }

  try {
    const { payload } = await jwtVerify(token, secret());
    const role = payload.role as string;

    const driverApp = pathname === "/driver" || pathname.startsWith("/driver/");
    if (driverApp && role !== "DRIVER") {
      return NextResponse.redirect(new URL("/", request.url));
    }
    if (!driverApp && role === "DRIVER") {
      return NextResponse.redirect(new URL("/driver", request.url));
    }
    return NextResponse.next();
  } catch {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    return NextResponse.redirect(url);
  }
}

export const config = {
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico|favicon.png|logo.png|uploads|.*\\.(?:png|jpe?g|gif|svg|webp|ico)$).*)"],
};
