import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

export async function updateSession(request: NextRequest) {
  let response = NextResponse.next({ request });
  const supabase = createServerClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!, {
    cookies: {
      getAll: () => request.cookies.getAll(),
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
        response = NextResponse.next({ request });
        cookiesToSet.forEach(({ name, value, options }) => response.cookies.set(name, value, options));
      },
    },
  });
  const { data } = await supabase.auth.getClaims();
  const claims = data?.claims;
  const path = request.nextUrl.pathname;
  const isPublicPath = path.startsWith("/auth") || path.startsWith("/demo") || path === "/privacy" || path === "/terms";
  if (!claims && !isPublicPath) {
    const url = request.nextUrl.clone(); url.pathname = "/auth/login"; return NextResponse.redirect(url);
  }
  if (claims && path === "/auth/login") {
    const url = request.nextUrl.clone(); url.pathname = "/dashboard"; return NextResponse.redirect(url);
  }
  return response;
}
