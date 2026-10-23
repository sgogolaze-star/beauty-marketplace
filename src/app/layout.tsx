import type { Metadata } from "next";
import Link from "next/link";
import "./globals.css";
export const metadata: Metadata = {
  title: { default: "Bloom — A little more you", template: "%s · Bloom" },
  description:
    "Discover beauty and wellness studios, explore treatments, and make time for yourself.",
};
export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>
        <a className="skip-link" href="#content">
          Skip to content
        </a>
        <header className="site-header">
          <Link className="brand" href="/" aria-label="Bloom home">
            <span>✳</span> bloom<span className="brand-dot">.</span>
          </Link>
          <nav aria-label="Main navigation">
            <Link className="explore-link" href="/">
              Explore
            </Link>
            <Link href="/account">My appointments</Link>
            <Link href="/login" className="nav-pill">
              Sign in <span aria-hidden="true">↗</span>
            </Link>
          </nav>
        </header>
        <div id="content">{children}</div>
        <footer>
          <Link href="/" className="brand">
            <span>✳</span> bloom.
          </Link>
          <p>A little time. A good feeling. A little more you.</p>
          <Link href="/business">For business ↗</Link>
          <span>Beauty & wellness, thoughtfully found.</span>
        </footer>
      </body>
    </html>
  );
}
