export function formatNum(n: number): string {
  return n.toString().replace(/\B(?=(\d{3})+(?!\d))/g, " ");
}

export function initials(dom: string): string {
  return dom.slice(0, 2).toUpperCase();
}

export function hashCode(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) {
    h = ((h << 5) - h) + s.charCodeAt(i);
    h |= 0;
  }
  return Math.abs(h);
}

export function faviconStyle(dom: string): React.CSSProperties {
  const h = hashCode(dom);
  const h1 = h % 360;
  const h2 = (h1 + 46) % 360;
  return {
    background: `linear-gradient(135deg, hsl(${h1} 70% 46%), hsl(${h2} 70% 36%))`
  };
}

export function timeAgo(ts: number): string {
  const d = Date.now() - ts;
  const MIN = 60000;
  const HOUR = 3600000;
  
  if (d < MIN) return "hozir";
  if (d < HOUR) return Math.floor(d / MIN) + " daqiqa oldin";
  if (d < 24 * HOUR) return Math.floor(d / HOUR) + " soat oldin";
  return Math.floor(d / (24 * HOUR)) + " kun oldin";
}

export function getDomainLogoUrl(domain: string, size = 128): string {
  if (!domain) return '/favicon.ico';
  const clean = domain
    .replace(/^https?:\/\//i, '')
    .replace(/^www\./i, '')
    .split(/[/?#]/)[0]
    .toLowerCase();

  if (clean === 'top3.uz' || clean === 'top3') {
    return '/logo.png';
  }
  
  return `https://t2.gstatic.com/faviconV2?client=SOCIAL&type=FAVICON&fallback_opts=TYPE,SIZE,URL&url=https://${clean}&size=${size}`;
}

export function handleLogoError(e: React.SyntheticEvent<HTMLImageElement, Event>, domain: string): void {
  const img = e.currentTarget;
  const clean = domain
    .replace(/^https?:\/\//i, '')
    .replace(/^www\./i, '')
    .split(/[/?#]/)[0]
    .toLowerCase();

  if (!img.dataset.step) {
    img.dataset.step = '1';
    img.src = `https://${clean}/apple-touch-icon.png`;
  } else if (img.dataset.step === '1') {
    img.dataset.step = '2';
    img.src = `https://icon.horse/icon/${clean}`;
  } else {
    img.style.display = 'none';
    const parent = img.parentElement;
    if (parent && !parent.querySelector('.fallback-badge')) {
      const span = document.createElement('span');
      span.className = 'fallback-badge w-full h-full flex items-center justify-center font-black text-white text-base rounded-xl shadow-inner uppercase';
      const h = hashCode(clean);
      span.style.background = `linear-gradient(135deg, hsl(${h % 360} 70% 46%), hsl(${(h + 46) % 360} 70% 36%))`;
      span.textContent = clean.slice(0, 2).toUpperCase();
      parent.appendChild(span);
    }
  }
}
