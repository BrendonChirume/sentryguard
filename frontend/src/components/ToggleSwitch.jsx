export default function ToggleSwitch({ on, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`inline-flex items-center w-11 h-6 rounded-full relative cursor-pointer border-none flex-shrink-0 transition-colors duration-200 ${on ? "bg-blue-500" : "bg-slate-600"}`}
    >
      <div
        className="w-[18px] h-[18px] rounded-full bg-white absolute top-[3px] transition-[left] duration-200 shadow-[0_1px_3px_rgba(0,0,0,.4)]"
        style={{ left: on ? "23px" : "3px" }}
      />
    </button>
  );
}
