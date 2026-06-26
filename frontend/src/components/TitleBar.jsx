import logoMark from "../assets/mark-128.png";
import { useTheme } from "../context/ThemeContext";

export default function TitleBar() {
  const controls = typeof window !== "undefined" ? window.sentryguard?.windowControls : null;
  const { theme, toggleTheme } = useTheme();

  return (
    <div
      className="h-9 flex items-center justify-between glass border-x-0 border-t-0 rounded-none select-none shrink-0"
      style={{ WebkitAppRegion: "drag" }}
    >
      <div className="flex items-center gap-2 pl-3 text-[12px] font-medium text-[color:var(--c-text-2)]">
        <img src={logoMark} alt="" className="w-4 h-4 shrink-0" />
        SentryGuard
      </div>

      <div className="flex items-stretch h-full" style={{ WebkitAppRegion: "no-drag" }}>
        <button
          type="button"
          aria-label="Toggle theme"
          onClick={toggleTheme}
          className="w-11 h-full flex items-center justify-center text-[color:var(--c-text-3)] hover:bg-[var(--c-surface-8)] hover:text-[color:var(--c-text-1)] cursor-pointer border-none bg-transparent transition-colors duration-150"
        >
          {theme === "dark" ? (
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="5" /><line x1="12" y1="1" x2="12" y2="3" /><line x1="12" y1="21" x2="12" y2="23" /><line x1="4.22" y1="4.22" x2="5.64" y2="5.64" /><line x1="18.36" y1="18.36" x2="19.78" y2="19.78" /><line x1="1" y1="12" x2="3" y2="12" /><line x1="21" y1="12" x2="23" y2="12" /><line x1="4.22" y1="19.78" x2="5.64" y2="18.36" /><line x1="18.36" y1="5.64" x2="19.78" y2="4.22" /></svg>
          ) : (
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 12.79A9 9 0 1111.21 3 7 7 0 0021 12.79z" /></svg>
          )}
        </button>
        <button
          type="button"
          aria-label="Minimize"
          onClick={() => controls?.minimize()}
          className="w-11 h-full flex items-center justify-center text-[color:var(--c-text-3)] hover:bg-[var(--c-surface-8)] hover:text-[color:var(--c-text-1)] cursor-pointer border-none bg-transparent transition-colors duration-150"
        >
          <svg width="10" height="10" viewBox="0 0 10 10"><rect y="4.5" width="10" height="1" fill="currentColor" /></svg>
        </button>
        <button
          type="button"
          aria-label="Maximize"
          onClick={() => controls?.maximize()}
          className="w-11 h-full flex items-center justify-center text-[color:var(--c-text-3)] hover:bg-[var(--c-surface-8)] hover:text-[color:var(--c-text-1)] cursor-pointer border-none bg-transparent transition-colors duration-150"
        >
          <svg width="10" height="10" viewBox="0 0 10 10"><rect x="0.5" y="0.5" width="9" height="9" fill="none" stroke="currentColor" /></svg>
        </button>
        <button
          type="button"
          aria-label="Close"
          onClick={() => controls?.close()}
          className="w-11 h-full flex items-center justify-center text-[color:var(--c-text-3)] hover:bg-red-500/90 hover:text-white cursor-pointer border-none bg-transparent transition-colors duration-150"
        >
          <svg width="10" height="10" viewBox="0 0 10 10"><line x1="0" y1="0" x2="10" y2="10" stroke="currentColor" /><line x1="10" y1="0" x2="0" y2="10" stroke="currentColor" /></svg>
        </button>
      </div>
    </div>
  );
}
