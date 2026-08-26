import { NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";
import type { NextRequest } from "next/server";
export async function GET(request: NextRequest) {
  const code = request.nextUrl.searchParams.get("code"); const url = request.nextUrl.clone(); url.pathname = "/dashboard";
  if (!code) return NextResponse.redirect(url);
  let response = NextResponse.redirect(url);
  const supabase = createServerClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!, { cookies: { getAll: () => request.cookies.getAll(), setAll: (items) => items.forEach(({name, value, options}) => response.cookies.set(name, value, options)) }});
  await supabase.auth.exchangeCodeForSession(code); return response;
}
