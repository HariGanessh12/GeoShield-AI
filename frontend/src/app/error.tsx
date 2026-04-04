'use client';

export default function Error({ error, reset }: { error: Error; reset: () => void }) {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-4 px-6 text-center">
      <h2 className="text-2xl font-medium text-white">Something went wrong</h2>
      <p className="max-w-lg text-sm text-white/60">{error.message}</p>
      <button onClick={reset} className="rounded-lg bg-blue-600 px-4 py-2 text-white">Try again</button>
    </div>
  );
}

