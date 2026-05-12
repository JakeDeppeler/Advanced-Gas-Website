import Link from "next/link";

export default function NotFound() {
  return (
    <section className="section">
      <div className="container max-w-xl text-center">
        <h1 className="text-5xl font-extrabold">404</h1>
        <p className="mt-3 text-slate-600">That page doesn't exist. Try the homepage or get a quote.</p>
        <div className="mt-6 flex justify-center gap-3">
          <Link href="/" className="btn-ghost">Home</Link>
          <Link href="/quote" className="btn-accent">Free Quote</Link>
        </div>
      </div>
    </section>
  );
}
