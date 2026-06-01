import { NextResponse } from "next/server";
import { getAuthUserFromRequest } from "@/lib/auth";

export const runtime = "nodejs";

export async function GET(request: Request) {
  return NextResponse.json({ user: getAuthUserFromRequest(request) });
}
