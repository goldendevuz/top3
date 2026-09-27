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
