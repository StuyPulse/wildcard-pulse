"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";

export default function ResetPasswordPage() {
  const [message, setMessage] = useState<string>();
  const [error, setError] = useState<string>();
  const [saving, setSaving] = useState(false);
  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault(); setError(undefined); setMessage(undefined);
    const form = new FormData(event.currentTarget); const password = String(form.get("password") ?? ""); const confirm = String(form.get("confirmPassword") ?? "");
    if (password.length < 8) return setError("Use at least 8 characters.");
    if (password !== confirm) return setError("Passwords do not match.");
    setSaving(true); const supabase = createClient(); const { error: updateError } = await supabase.auth.updateUser({ password });
    if (updateError) { setError("This reset link is invalid or expired. Request a new one."); setSaving(false); return; }
    await supabase.auth.signOut(); setMessage("Password updated. You can now sign in."); setSaving(false);
  }
  return <main className="auth-page"><form className="auth-card auth-form" onSubmit={submit}><p className="eyebrow">WILDCARD PULSE</p><h1>Set a new password</h1><p className="muted">Choose a new password for your StuyPulse account.</p><div className="field"><label htmlFor="password">New password</label><input id="password" name="password" type="password" autoComplete="new-password" required minLength={8}/></div><div className="field"><label htmlFor="confirmPassword">Confirm password</label><input id="confirmPassword" name="confirmPassword" type="password" autoComplete="new-password" required minLength={8}/></div>{error && <p className="error">{error}</p>}{message && <p className="trend">{message}</p>}<button className="button" disabled={saving}>{saving ? "Updating…" : "Update password"}</button><a className="link" href="/auth/login">Back to sign in</a></form></main>;
}
