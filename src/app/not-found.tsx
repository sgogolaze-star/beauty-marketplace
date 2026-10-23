import Link from "next/link";
export default function NotFound() {
  return (
    <main className="page-shell empty">
      <h1>This space isn’t here.</h1>
      <p>Let’s find somewhere you’ll love.</p>
      <Link className="button" href="/">
        Back to explore
      </Link>
    </main>
  );
}
