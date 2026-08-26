import Link from "next/link";

export const metadata = { title: "Terms | Wildcard Pulse" };

export default function TermsPage() {
  return (
    <main className="auth-page">
      <section className="auth-card" style={{ maxWidth: 760 }}>
        <p className="eyebrow">WILDCARD PULSE</p>
        <h1>Terms of service</h1>
        <p>Last updated August 26, 2026.</p>
        <h2>Who may use Wildcard Pulse</h2>
        <p>Wildcard Pulse is an internal scouting workspace for StuyPulse. You must use an authorized <strong>@stuypulse.com</strong> account and follow team directions when using it.</p>
        <h2>Responsible use</h2>
        <p>Keep your account secure, submit truthful competition observations, and do not attempt to access information or accounts that are not assigned to you.</p>
        <h2>Availability and changes</h2>
        <p>The application is provided for team operations and may change or be unavailable during development or events. Team administrators may suspend access when needed to protect the team and its data.</p>
        <h2>Questions</h2>
        <p>Contact <a href="mailto:se@stuypulse.com">se@stuypulse.com</a> with questions about these terms.</p>
        <p><Link href="/auth/login">Back to sign in</Link> · <Link href="/privacy">Privacy policy</Link></p>
      </section>
    </main>
  );
}
