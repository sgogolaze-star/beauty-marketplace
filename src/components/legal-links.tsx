import Link from "next/link";
export function LegalLinks() {
  return (
    <nav className="legal-links" aria-label="Legal information">
      <Link href="/legal/terms">Terms</Link>
      <Link href="/legal/privacy">Privacy</Link>
      <Link href="/legal/providers">Provider agreement</Link>
    </nav>
  );
}
