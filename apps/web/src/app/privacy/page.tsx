import Link from "next/link";

export const metadata = { title: "Privacy | Wildcard Pulse" };

export default function PrivacyPage() {
  return (
    <main className="auth-page">
      <section className="auth-card" style={{ maxWidth: 760 }}>
        <p className="eyebrow">WILDCARD PULSE</p>
        <h1>Privacy policy</h1>
        <p>Last updated August 26, 2026.</p>
        <h2>What we collect</h2>
        <p>Wildcard Pulse stores the email address, name, and account identifier supplied during sign-in. It also stores scouting submissions, assignments, and other competition information entered by authorized team members.</p>
        <h2>How we use it</h2>
        <p>We use this information to authenticate StuyPulse members, assign scouting work, and support match strategy. We do not sell personal information or use it for advertising.</p>
        <h2>Access and storage</h2>
        <p>Access is limited to authorized Wildcard Pulse users. Data is stored using Supabase and may be processed by the services required to run the application, including Google when you choose Google sign-in.</p>
        <h2>Your choices</h2>
        <p>To request access to, correction of, or deletion of your account information, contact <a href="mailto:se@stuypulse.com">se@stuypulse.com</a>.</p>
        <p><Link href="/auth/login">Back to sign in</Link> · <Link href="/terms">Terms of service</Link></p>
      </section>
    </main>
  );
}
