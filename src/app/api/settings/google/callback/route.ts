import { NextResponse, type NextRequest } from "next/server";
import { completeAuth, getGoogleAppRedirectUri } from "@/lib/google-calendar";

export async function GET(req: NextRequest) {
  const code = req.nextUrl.searchParams.get("code");
  const error = req.nextUrl.searchParams.get("error");
  const redirectUri = getGoogleAppRedirectUri();

  if (error || !code) {
    return NextResponse.redirect(
      `${redirectUri}?google=error&reason=${encodeURIComponent(error ?? "no code")}`
    );
  }
  try {
    await completeAuth(code);
    return NextResponse.redirect(`${redirectUri}?google=linked`);
  } catch (err) {
    return NextResponse.redirect(
      `${redirectUri}?google=error&reason=${encodeURIComponent(
        err instanceof Error ? err.message : "unknown"
      )}`
    );
  }
}
