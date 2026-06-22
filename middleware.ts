import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";

const isProtectedRoute = createRouteMatcher([
  "/account(.*)",
  "/dashboard(.*)",
  "/history(.*)",
  "/settings(.*)",
  "/api/account(.*)",
  "/api/feedback(.*)",
  "/api/history(.*)",
]);

function withTransportSecurity(response: NextResponse) {
  response.headers.set("Strict-Transport-Security", "max-age=63072000; includeSubDomains; preload");
  response.headers.set("X-Content-Type-Options", "nosniff");
  response.headers.set("Referrer-Policy", "strict-origin-when-cross-origin");
  return response;
}

export default clerkMiddleware(async (auth, request) => {
  try {
    const forwardedProtocol = request.headers.get("x-forwarded-proto")?.split(",")[0]?.trim();

    if (process.env.NODE_ENV === "production" && forwardedProtocol === "http") {
      const secureUrl = request.nextUrl.clone();
      secureUrl.protocol = "https:";
      return withTransportSecurity(NextResponse.redirect(secureUrl, 301));
    }

    if (isProtectedRoute(request)) {
      await auth.protect();
    }

    return withTransportSecurity(NextResponse.next());
  } catch (error) {
    console.error("Middleware request handling failed.", error);
    return NextResponse.json(
      { error: "The service is temporarily unavailable. Please try again." },
      { status: 503, headers: { "Cache-Control": "no-store" } },
    );
  }
});

export const config = {
  matcher: [
    "/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)",
    "/(api|trpc)(.*)",
  ],
};
