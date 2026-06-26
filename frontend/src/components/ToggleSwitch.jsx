import { Switch } from "@headlessui/react";

export default function ToggleSwitch({ on, onClick }) {
  return (
    <Switch
      checked={on}
      onChange={onClick}
      className="inline-flex items-center w-11 h-6 rounded-full relative cursor-pointer border-none flex-shrink-0 transition-colors duration-200 bg-[var(--c-text-4)] data-checked:bg-blue-500"
    >
      <span
        aria-hidden="true"
        className="w-[18px] h-[18px] rounded-full bg-white absolute top-[3px] transition-[left] duration-200 shadow-[0_1px_3px_rgba(0,0,0,.4)]"
        style={{ left: on ? "23px" : "3px" }}
      />
    </Switch>
  );
}
