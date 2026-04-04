import Link from "next/link";

export default function NotFound() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-4 px-6 text-center">
      <div className="rounded-[2rem] border border-white/10 bg-white/[0.04] px-10 py-12 shadow-2xl light-mode:border-slate-200 light-mode:bg-white">
        <h1 className="text-6xl font-medium text-gray-200 light-mode:text-slate-950">404</h1>
        <p className="mt-3 text-gray-500 light-mode:text-slate-600">This region is off the map.</p>
        <Link href="/" className="mt-5 inline-flex text-blue-500 hover:underline light-mode:text-blue-600">Return to GeoShield</Link>
      </div>
    </div>
  );
}

