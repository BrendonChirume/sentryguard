export default function TitleBar() {
  const controls = typeof window !== "undefined" ? window.sentryguard?.windowControls : null;

  return (
    <div
      className="h-9 flex items-center justify-between glass border-x-0 border-t-0 rounded-none select-none shrink-0"
      style={{ WebkitAppRegion: "drag" }}
    >
      <div className="flex items-center gap-2 pl-3 text-[12px] font-medium text-slate-400">
        <div className="w-4 h-4 bg-blue-500 rounded-sm flex items-center justify-center shrink-0 shadow-[0_0_10px_rgba(59,130,246,0.5)]">
          <svg width="9" height="9" viewBox="0 0 24 24" fill="white"><path d="M12 1L3 5v6c0 5.55 3.84 10.74 9 12 5.16-1.26 9-6.45 9-12V5l-9-4z" /></svg>
        </div>
        SentryGuard
      </div>

      <div className="flex items-stretch h-full" style={{ WebkitAppRegion: "no-drag" }}>
        <button
          type="button"
          aria-label="Minimize"
          onClick={() => controls?.minimize()}
          className="w-11 h-full flex items-center justify-center text-slate-500 hover:bg-white/[0.08] hover:text-slate-200 cursor-pointer border-none bg-transparent transition-colors duration-150"
        >
          <svg width="10" height="10" viewBox="0 0 10 10"><rect y="4.5" width="10" height="1" fill="currentColor" /></svg>
        </button>
        <button
          type="button"
          aria-label="Maximize"
          onClick={() => controls?.maximize()}
          className="w-11 h-full flex items-center justify-center text-slate-500 hover:bg-white/[0.08] hover:text-slate-200 cursor-pointer border-none bg-transparent transition-colors duration-150"
        >
          <svg width="10" height="10" viewBox="0 0 10 10"><rect x="0.5" y="0.5" width="9" height="9" fill="none" stroke="currentColor" /></svg>
        </button>
        <button
          type="button"
          aria-label="Close"
          onClick={() => controls?.close()}
          className="w-11 h-full flex items-center justify-center text-slate-500 hover:bg-red-500/90 hover:text-white cursor-pointer border-none bg-transparent transition-colors duration-150"
        >
          <svg width="10" height="10" viewBox="0 0 10 10"><line x1="0" y1="0" x2="10" y2="10" stroke="currentColor" /><line x1="10" y1="0" x2="0" y2="10" stroke="currentColor" /></svg>
        </button>
      </div>
    </div>
  );
}
