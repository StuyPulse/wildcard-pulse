import { LoginForm } from "./login-form";
import { BrandLogo } from "@/components/brand-logo";
export default function LoginPage() { return <div className="auth"><aside className="auth-aside"><div className="brand"><BrandLogo/><span>pulse<small>STUYPULSE · 694</small></span></div><div className="auth-feature"><strong>Make every match count.</strong><p>Fast inputs for scouts. Reliable, useful signal for strategy. Built for the pace of competition.</p></div></aside><section className="auth-panel"><LoginForm/></section></div>; }
