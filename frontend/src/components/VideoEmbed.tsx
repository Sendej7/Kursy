interface Props {
  url: string;
}

/**
 * Parsuje YouTube / Vimeo / surowy iframe URL na embed-friendly źródło.
 * Nie obsługujemy own-host wideo; autor podaje URL z dowolnego serwisu.
 */
export default function VideoEmbed({ url }: Props) {
  const embed = toEmbed(url);
  if (!embed) {
    return (
      <p className="text-sm text-red-600">
        Nieobsługiwany URL wideo: <code>{url}</code>. Wklej link YouTube lub Vimeo.
      </p>
    );
  }
  return (
    <div className="relative aspect-video bg-black rounded-md overflow-hidden">
      <iframe
        src={embed}
        title="Wideo"
        loading="lazy"
        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
        allowFullScreen
        className="absolute inset-0 w-full h-full"
      />
    </div>
  );
}

function toEmbed(url: string): string | null {
  try {
    const u = new URL(url.trim());
    // youtube.com/watch?v=ID
    if (/(?:^|\.)youtube\.com$/.test(u.hostname)) {
      const id = u.searchParams.get('v');
      if (id) return `https://www.youtube.com/embed/${id}`;
      // youtube.com/embed/ID — już embed
      const m = u.pathname.match(/^\/embed\/([\w-]+)/);
      if (m) return url;
    }
    // youtu.be/ID
    if (u.hostname === 'youtu.be') {
      const id = u.pathname.replace(/^\//, '');
      if (id) return `https://www.youtube.com/embed/${id}`;
    }
    // vimeo.com/ID lub player.vimeo.com/video/ID
    if (/(?:^|\.)vimeo\.com$/.test(u.hostname)) {
      const m = u.pathname.match(/(\d+)/);
      if (m) return `https://player.vimeo.com/video/${m[1]}`;
    }
    return null;
  } catch {
    return null;
  }
}
