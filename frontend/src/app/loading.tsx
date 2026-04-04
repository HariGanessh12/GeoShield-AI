export default function Loading() {
  return (
    <div className="flex min-h-screen items-center justify-center">
      <div className="flex items-center gap-3 rounded-full border border-white/10 bg-white/[0.04] px-5 py-4 shadow-2xl light-mode:border-slate-200 light-mode:bg-white">
        <div className="h-2.5 w-2.5 animate-bounce rounded-full bg-blue-500 [animation-delay:-0.3s]" />
        <div className="h-2.5 w-2.5 animate-bounce rounded-full bg-blue-500 [animation-delay:-0.15s]" />
        <div className="h-2.5 w-2.5 animate-bounce rounded-full bg-blue-500" />
        <span className="ml-2 text-sm font-medium text-white/70 light-mode:text-slate-600">Loading GeoShield AI</span>
      </div>
    </div>
  );
}

