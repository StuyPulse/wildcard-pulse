"use client";
import { useActionState, useEffect, useState } from "react";
import { signIn, signUp, type AuthState } from "./actions";
import { createClient } from "@/lib/supabase/client";
import { BrandLogo } from "@/components/brand-logo";
const initial: AuthState = {};
export function LoginForm() {
  const [loginState, loginAction, pendingLogin] = useActionState(signIn, initial);
  const [signupState, signupAction, pendingSignup] = useActionState(signUp, initial);
  const state = loginState.error || loginState.message ? loginState : signupState;
  const [googleError, setGoogleError] = useState<string>();
  const [callbackError, setCallbackError] = useState<string>();
  useEffect(() => { setCallbackError(new URLSearchParams(window.location.search).get("error") ?? undefined); }, []);
  async function signInWithGoogle() { setGoogleError(undefined); const { error } = await createClient().auth.signInWithOAuth({ provider: "google", options: { redirectTo: `${window.location.origin}/auth/callback`, queryParams: { hd: "stuypulse.com" } } }); if (error) setGoogleError(error.message === "provider is not enabled" ? "Google sign-in is not configured for this project yet." : "Google sign-in could not start. Please try again."); }
  return <form className="auth-form"><div className="brand"><BrandLogo/><span>pulse<small>STUYPULSE · 694</small></span></div><h1>Welcome back.</h1><p>Only <strong>@stuypulse.com</strong> accounts can access this competition workspace.</p>
    <div className="field"><label htmlFor="email">Email</label><input id="email" name="email" type="email" autoComplete="email" placeholder="you@stuypulse.com" required /></div>
    <div className="field"><label htmlFor="password">Password</label><input id="password" name="password" type="password" autoComplete="current-password" placeholder="••••••••" required minLength={8}/></div>
    {callbackError && <p className="error">{callbackError}</p>}{state.error && <p className="error">{state.error}</p>}{state.message && <p className="trend">{state.message}</p>}
    <button className="button" formAction={loginAction} disabled={pendingLogin || pendingSignup}>{pendingLogin ? "Signing in…" : "Sign in"}</button>
    <button className="button secondary" style={{width:"100%", marginTop:10}} formAction={signupAction} disabled={pendingLogin || pendingSignup}>{pendingSignup ? "Creating account…" : "Create account"}</button>
    <div className="section-title" style={{textAlign:"center"}}>or</div><button type="button" className="button secondary" style={{width:"100%"}} onClick={signInWithGoogle}>Continue with Google</button>{googleError&&<p className="error">{googleError}</p>}
    <p className="muted" style={{textAlign:"center", marginTop:18, fontSize:"0.82rem"}}><a href="/privacy">Privacy</a> · <a href="/terms">Terms</a></p>
  </form>;
}
