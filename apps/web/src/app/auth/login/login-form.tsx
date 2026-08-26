"use client";
import { useActionState } from "react";
import { signIn, signUp, type AuthState } from "./actions";
const initial: AuthState = {};
export function LoginForm() {
  const [loginState, loginAction, pendingLogin] = useActionState(signIn, initial);
  const [signupState, signupAction, pendingSignup] = useActionState(signUp, initial);
  const state = loginState.error || loginState.message ? loginState : signupState;
  return <form className="auth-form"><div className="brand"><span className="brand-mark">P</span><span>pulse<small>STUYPULSE · 694</small></span></div><h1>Welcome back.</h1><p>Sign in to your competition workspace. Your role determines what you can view and update.</p>
    <div className="field"><label htmlFor="email">Email</label><input id="email" name="email" type="email" autoComplete="email" placeholder="you@stuypulse.com" required /></div>
    <div className="field"><label htmlFor="password">Password</label><input id="password" name="password" type="password" autoComplete="current-password" placeholder="••••••••" required minLength={8}/></div>
    {state.error && <p className="error">{state.error}</p>}{state.message && <p className="trend">{state.message}</p>}
    <button className="button" formAction={loginAction} disabled={pendingLogin || pendingSignup}>{pendingLogin ? "Signing in…" : "Sign in"}</button>
    <button className="button secondary" style={{width:"100%", marginTop:10}} formAction={signupAction} disabled={pendingLogin || pendingSignup}>{pendingSignup ? "Creating account…" : "Create account"}</button>
  </form>;
}
