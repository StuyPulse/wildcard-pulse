"use client";
import { useActionState, useEffect, useState } from "react";
import { requestPasswordReset, signIn, signUp, type AuthState } from "./actions";
import { createClient } from "@/lib/supabase/client";
import { BrandLogo } from "@/components/brand-logo";
const initial: AuthState = {};
export function LoginForm() {
  const [loginState, loginAction, pendingLogin] = useActionState(signIn, initial);
  const [signupState, signupAction, pendingSignup] = useActionState(signUp, initial);
  const [resetState, resetAction, pendingReset] = useActionState(requestPasswordReset, initial);
  const state = loginState.error || loginState.message ? loginState : signupState.error || signupState.message ? signupState : resetState;
  const [googleError, setGoogleError] = useState<string>();
  const [callbackError, setCallbackError] = useState<string>();
  useEffect(() => { setCallbackError(new URLSearchParams(window.location.search).get("error") ?? undefined); }, []);
  async function signInWithGoogle() { setGoogleError(undefined); const { error } = await createClient().auth.signInWithOAuth({ provider: "google", options: { redirectTo: `${window.location.origin}/auth/callback`, queryParams: { hd: "stuypulse.com" } } }); if (error) setGoogleError(error.message === "provider is not enabled" ? "Google sign-in is not configured for this project yet." : "Google sign-in could not start. Please try again."); }
  return <form className="auth-form"><div className="brand"><BrandLogo/><span>pulse<small>STUYPULSE · 694</small></span></div><h1>Welcome back.</h1><p>Only <strong>@stuypulse.com</strong> accounts can access this competition workspace.</p>
    <div className="form-grid"><div className="field"><label htmlFor="firstName">First name <span className="muted">(new accounts)</span></label><input id="firstName" name="firstName" autoComplete="given-name" placeholder="Ada" /></div><div className="field"><label htmlFor="lastName">Last name <span className="muted">(new accounts)</span></label><input id="lastName" name="lastName" autoComplete="family-name" placeholder="Lovelace" /></div></div>
    <div className="field"><label htmlFor="email">Email</label><input id="email" name="email" type="email" autoComplete="email" placeholder="you@stuypulse.com" required /></div>
    <div className="field"><label htmlFor="password">Password</label><input id="password" name="password" type="password" autoComplete="current-password" placeholder="••••••••" required minLength={8}/></div>
    {callbackError && <p className="error">{callbackError}</p>}{state.error && <p className="error">{state.error}</p>}{state.message && <p className="trend">{state.message}</p>}
    <button className="button" formAction={loginAction} disabled={pendingLogin || pendingSignup || pendingReset}>{pendingLogin ? "Signing in…" : "Sign in"}</button>
    <button className="button secondary" style={{width:"100%", marginTop:10}} formAction={signupAction} disabled={pendingLogin || pendingSignup || pendingReset}>{pendingSignup ? "Creating account…" : "Create account"}</button>
    <button className="link" style={{display:"block",margin:"13px auto 0",background:"none",border:0,cursor:"pointer"}} formAction={resetAction} disabled={pendingLogin || pendingSignup || pendingReset}>{pendingReset ? "Sending reset link…" : "Forgot password?"}</button>
    <div className="section-title" style={{textAlign:"center"}}>or</div><button type="button" className="button secondary" style={{width:"100%"}} onClick={signInWithGoogle}>Continue with Google</button>{googleError&&<p className="error">{googleError}</p>}
    <p className="muted" style={{textAlign:"center", marginTop:18, fontSize:"0.82rem"}}><a href="/privacy">Privacy</a> · <a href="/terms">Terms</a></p>
  </form>;
}
