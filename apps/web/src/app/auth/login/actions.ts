"use server";
import { redirect } from "next/navigation";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";

const credentialsSchema = z.object({ email: z.string().email().toLowerCase().refine((email) => email.endsWith("@stuypulse.com"), "Use your @stuypulse.com email."), password: z.string().min(8).max(128) });
export type AuthState = { error?: string; message?: string };

export async function signIn(_: AuthState, formData: FormData): Promise<AuthState> {
  const parsed = credentialsSchema.safeParse({ email: formData.get("email"), password: formData.get("password") });
  if (!parsed.success) return { error: "Use your @stuypulse.com email and an 8+ character password." };
  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword(parsed.data);
  if (error) return { error: "We couldn't sign you in with those details." };
  redirect("/dashboard");
}

export async function signUp(_: AuthState, formData: FormData): Promise<AuthState> {
  const parsed = credentialsSchema.safeParse({ email: formData.get("email"), password: formData.get("password") });
  if (!parsed.success) return { error: "Use your @stuypulse.com email and an 8+ character password." };
  const supabase = await createClient();
  const origin = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";
  const { data, error } = await supabase.auth.signUp({ ...parsed.data, options: { emailRedirectTo: `${origin}/auth/callback` } });
  if (error) return { error: "We couldn't create that account. Try a different email." };
  if (data.user?.identities?.length === 0) return { message: "That account may already exist. Check your email for a confirmation link, or sign in instead." };
  return { message: "Check your @stuypulse.com inbox to confirm your account, then sign in." };
}
