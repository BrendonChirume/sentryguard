import { smBtnClass } from "../lib/ui";

export default function ActionButtons({ app, onAction }) {
  return (
    <div className="flex gap-1.5 justify-end">
      <button className={smBtnClass("text-blue-500", "border-blue-500/25")} onClick={() => onAction(app, "inspect")}>Inspect</button>
      {app.status === "blocked" ? (
        <button className={smBtnClass("text-emerald-500", "border-emerald-500/25")} onClick={() => onAction(app, "unblock")}>Unblock</button>
      ) : (
        <>
          <button className={smBtnClass("text-red-500", "border-red-500/25")} onClick={() => onAction(app, "block")}>Block</button>
          <button className={smBtnClass("text-amber-500", "border-amber-500/25")} onClick={() => onAction(app, "limit")}>Limit</button>
        </>
      )}
    </div>
  );
}
