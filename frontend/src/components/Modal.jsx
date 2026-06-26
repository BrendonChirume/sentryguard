import { Dialog, DialogPanel } from "@headlessui/react";
import { modalPanel } from "../lib/ui";

export default function Modal({ isOpen, onClose, className = "w-[380px] p-6", children }) {
  return (
    <Dialog open={isOpen} onClose={onClose ?? (() => {})} transition className="relative z-[999]">
      <div className="fixed inset-0 bg-black/50 backdrop-blur-sm transition duration-150 data-closed:opacity-0" />
      <div className="fixed inset-0 flex items-center justify-center">
        <DialogPanel
          transition
          className={`${modalPanel} ${className} transition duration-150 data-closed:opacity-0 data-closed:scale-95`}
        >
          {children}
        </DialogPanel>
      </div>
    </Dialog>
  );
}
