import { useToast } from '../../toastContext.jsx';

export function shareLink(code) {
  return `${window.location.origin}/join?code=${code}`;
}

export async function copyText(text) {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    return false;
  }
}

export function SessionInfo({ session }) {
  const showToast = useToast();
  const link = shareLink(session.code);

  async function copy() {
    if (await copyText(link)) showToast('Link copied');
    else showToast('Copy did not work here. Select the link and copy it.', 'error');
  }

  return (
    <section className="flex flex-col gap-3">
      <p className="text-label text-muted">Code</p>
      <p className="font-chord text-5xl font-semibold tracking-[0.3em]">{session.code}</p>
      <p className="text-label text-muted">Share link</p>
      <p className="break-all select-all rounded-[4px] border border-line bg-bg p-3">{link}</p>
      <div><button type="button" className="pill pill-primary" onClick={copy}>Copy link</button></div>
    </section>
  );
}
