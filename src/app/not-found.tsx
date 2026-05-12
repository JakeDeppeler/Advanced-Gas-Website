import Link from "next/link";

export default function NotFound() {
  return (
    <section className="section">
      <div className="container max-w-xl text-center">
        <h1 className="font-display text-7xl font-extrabold text-navy-900">404</h1>
        <p className="mt-4 text-lg text-navy-600">That page doesn't exist. Try the homepage or get a quote.</p>
        <div className="mt-8 flex justify-center gap-3">
          <Link href="/" className="btn-ghost">Home</Link>
          <Link href="/quote" className="btn-accent">Free Quote</Link>
        </div>
      </div>
    </section>
  );
}
