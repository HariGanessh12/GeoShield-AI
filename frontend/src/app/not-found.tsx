import Link from "next/link";

export default function NotFound() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-4 px-6 text-center">
      <h1 className="text-6xl font-medium text-gray-200">404</h1>
      <p className="text-gray-500">This region is off the map.</p>
      <Link href="/" className="text-blue-500 hover:underline">Return to GeoShield</Link>
    </div>
  );
}

