import { card, sectionLabel } from "../lib/ui";

export default function StatCard({ label, value, colorClass, bgClass, icon }) {
  return (
    <div className={`${card} p-4.5`}>
      <div className="flex justify-between items-start mb-3.5">
        <div className={sectionLabel}>{label}</div>
        <div className={`w-7.5 h-7.5 rounded-[7px] flex items-center justify-center ${bgClass}`}>{icon}</div>
      </div>
      <div className={`text-[22px] font-bold font-mono tracking-tight leading-tight ${colorClass}`}>{value}</div>
    </div>
  );
}
