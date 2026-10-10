export function ToolPanel({ title, defaultOpen = false, children }) {
  return (
    <details open={defaultOpen} className="group rounded-[4px] border border-line bg-surface">
      <summary className="flex min-h-12 cursor-pointer list-none items-center justify-between gap-3 px-4 font-semibold">
        {title}
        <span aria-hidden="true" className="text-muted transition-transform group-open:rotate-45">+</span>
      </summary>
      <div className="flex flex-col gap-4 border-t border-line p-4">{children}</div>
    </details>
  );
}
