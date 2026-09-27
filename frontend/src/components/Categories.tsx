import { useBoardStore } from '../store/useBoardStore';

const categoryConfig: Record<string, { icon: string; gradient: string; accent: string }> = {
  "Onlayn do'konlar va Savdo":       { icon: "🛒", gradient: "from-orange-500/20 to-rose-500/10",     accent: "#fb923c" },
  "Ta'lim va O'quv markazlari":       { icon: "📚", gradient: "from-blue-500/20 to-indigo-500/10",    accent: "#60a5fa" },
  "Biznes, Moliya va Huquq":          { icon: "💼", gradient: "from-emerald-500/20 to-teal-500/10",   accent: "#34d399" },
  "IT va Dasturlash":                 { icon: "💻", gradient: "from-violet-500/20 to-purple-500/10",  accent: "#a78bfa" },
  "Yangiliklar va OAV (Media)":       { icon: "📰", gradient: "from-sky-500/20 to-cyan-500/10",       accent: "#38bdf8" },
  "Tibbiyot va Salomatlik":           { icon: "🏥", gradient: "from-red-500/20 to-pink-500/10",       accent: "#f87171" },
  "Ko'chmas mulk va Qurilish":        { icon: "🏠", gradient: "from-amber-500/20 to-yellow-500/10",   accent: "#fbbf24" },
  "Sayohat va Turizm":                { icon: "✈️", gradient: "from-cyan-500/20 to-blue-500/10",      accent: "#22d3ee" },
  "Xizmat ko'rsatish va Agentliklar": { icon: "🛠", gradient: "from-lime-500/20 to-green-500/10",     accent: "#84cc16" },
  "Marketing va Reklama":             { icon: "🎯", gradient: "from-rose-500/20 to-orange-500/10",    accent: "#fb7185" },
  "Ish, Karyera va Vakansiyalar":     { icon: "🤝", gradient: "from-teal-500/20 to-emerald-500/10",   accent: "#2dd4bf" },
  "Ijtimoiy tarmoqlar va Bloging":    { icon: "📱", gradient: "from-pink-500/20 to-fuchsia-500/10",   accent: "#f472b6" },
  "Dizayn va Kreativ":                { icon: "🎨", gradient: "from-fuchsia-500/20 to-violet-500/10", accent: "#e879f9" },
  "O'yinlar va Ko'ngilochar":         { icon: "🎮", gradient: "from-indigo-500/20 to-blue-500/10",    accent: "#818cf8" },
  "Neyrotarmoqlar va AI":             { icon: "🤖", gradient: "from-purple-500/20 to-indigo-500/10",  accent: "#c084fc" },
  "Foydali vositalar (Tools)":        { icon: "⚙️", gradient: "from-slate-500/20 to-gray-500/10",     accent: "#94a3b8" },
  "Boshqa":                           { icon: "📌", gradient: "from-zinc-500/20 to-slate-500/10",     accent: "#a1a1aa" },
};

export const categories = Object.keys(categoryConfig);

const Categories = () => {
  const { domains } = useBoardStore();

  const totalDomains = domains.length;

  return (
    <div style={{ background: 'var(--bg)', minHeight: '100vh', paddingBottom: '80px' }}>
      <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '80px 24px 0' }}>

        {/* Header */}
        <div style={{ textAlign: 'center', marginBottom: '56px' }}>
          <span style={{
            display: 'inline-flex', alignItems: 'center', gap: '6px',
            fontSize: '12px', fontWeight: 700, letterSpacing: '.08em', textTransform: 'uppercase',
            color: 'var(--brand)', marginBottom: '12px'
          }}>
            <span style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--mint)', display: 'inline-block' }} />
            Katalog
          </span>
          <h1 style={{
            fontSize: 'clamp(28px, 4vw, 48px)', fontWeight: 800,
            color: 'var(--ink)', marginBottom: '12px', lineHeight: 1.1
          }}>
            Barcha Kategoriyalar
          </h1>
          <p style={{ color: 'var(--muted)', fontSize: '16px', maxWidth: '480px', margin: '0 auto' }}>
            {totalDomains} ta sayt {categories.length} ta sohada — kerakligini tanlang
          </p>
        </div>

        {/* Grid */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
          gap: '16px'
        }}>
          {categories.map(c => {
            const cfg = categoryConfig[c];
            const count = domains.filter((d: any) => d.category === c).length;

            return (
              <a
                key={c}
                href={`/?category=${encodeURIComponent(c)}`}
                style={{
                  display: 'flex', alignItems: 'center', gap: '14px',
                  padding: '18px 20px',
                  background: 'var(--surface)',
                  border: '1px solid var(--border)',
                  borderRadius: '16px',
                  textDecoration: 'none',
                  transition: 'transform .2s, box-shadow .2s, border-color .2s',
                  position: 'relative',
                  overflow: 'hidden',
                }}
                onMouseEnter={e => {
                  (e.currentTarget as HTMLElement).style.transform = 'translateY(-3px)';
                  (e.currentTarget as HTMLElement).style.boxShadow = `0 12px 32px -8px ${cfg.accent}33`;
                  (e.currentTarget as HTMLElement).style.borderColor = `${cfg.accent}55`;
                }}
                onMouseLeave={e => {
                  (e.currentTarget as HTMLElement).style.transform = 'translateY(0)';
                  (e.currentTarget as HTMLElement).style.boxShadow = 'none';
                  (e.currentTarget as HTMLElement).style.borderColor = 'var(--border)';
                }}
              >
                {/* Gradient blob */}
                <div style={{
                  position: 'absolute', inset: 0,
                  background: `radial-gradient(circle at 0% 50%, ${cfg.accent}15, transparent 70%)`,
                  pointerEvents: 'none'
                }} />

                {/* Icon */}
                <div style={{
                  width: '48px', height: '48px', flexShrink: 0,
                  borderRadius: '12px',
                  background: `${cfg.accent}18`,
                  border: `1px solid ${cfg.accent}30`,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: '22px',
                  position: 'relative'
                }}>
                  {cfg.icon}
                </div>

                {/* Text */}
                <div style={{ flex: 1, minWidth: 0, position: 'relative' }}>
                  <div style={{
                    fontWeight: 700, fontSize: '14px',
                    color: 'var(--ink)', whiteSpace: 'nowrap',
                    overflow: 'hidden', textOverflow: 'ellipsis'
                  }}>
                    {c}
                  </div>
                  <div style={{ fontSize: '12px', color: 'var(--muted)', marginTop: '2px' }}>
                    {count > 0 ? (
                      <span style={{ color: cfg.accent, fontWeight: 600 }}>{count}</span>
                    ) : (
                      <span>0</span>
                    )}{' '}ta sayt
                  </div>
                </div>

                {/* Arrow */}
                <div style={{
                  color: 'var(--muted)', fontSize: '16px',
                  transition: 'transform .2s, color .2s',
                  flexShrink: 0, position: 'relative'
                }}>
                  →
                </div>
              </a>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default Categories;
