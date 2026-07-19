export default function Logo({ className = "" }: { className?: string }) {
  return (
    <span className={`select-none font-extrabold tracking-tight ${className}`}>
      <span className="text-brand-blue">GLOBAL</span>
      <span className="text-brand-indigo">HR</span>
      <span className="ml-2 align-middle text-xs font-semibold uppercase tracking-wider text-slate-400">
        DMS
      </span>
    </span>
  );
}
