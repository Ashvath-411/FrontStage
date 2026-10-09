export function BackgroundNotice({ onDismiss }) {
  return (
    <div role="alert" className="flex flex-wrap items-center justify-between gap-3 rounded-[4px] border border-alert bg-surface px-4 py-2">
      <span>This tab was in the background. Browsers slow timers there, so clicks and cues can drift or stop. Keep this tab in front while playing.</span>
      <button type="button" className="pill pill-small" onClick={onDismiss}>OK</button>
    </div>
  );
}
