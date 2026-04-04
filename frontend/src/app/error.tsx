'use client';

export default function Error({ error, reset }: { error: Error; reset: () => void }) {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-4 px-6 text-center">
      <div className="rounded-[2rem] border border-white/10 bg-white/[0.04] px-8 py-10 shadow-2xl light-mode:border-slate-200 light-mode:bg-white">
        <h2 className="text-2xl font-medium text-white light-mode:text-slate-950">Something went wrong</h2>
        <p className="mt-3 max-w-lg text-sm text-white/60 light-mode:text-slate-600">{error.message}</p>
        <button onClick={reset} className="mt-6 rounded-full bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white transition hover:scale-[1.02] active:scale-95">
          Try again
        </button>
      </div>
    </div>
  );
}

