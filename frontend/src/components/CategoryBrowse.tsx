import { Link } from 'react-router-dom';
import { useBoardStore } from '../store/useBoardStore';
import { categoryConfig, categories } from './Categories';

const CategoryBrowse = () => {
  const { domains } = useBoardStore();

  // Show top categories by domain count
  const categoryCounts = categories.map(c => ({
    name: c,
    count: domains.filter((d: any) => d.cat === c).length,
    ...categoryConfig[c],
  }));

  return (
    <section className="wrap" style={{ paddingTop: '56px', paddingBottom: '56px' }}>
      {/* Section header */}
      <div className="section-head reveal in" style={{ marginBottom: '28px' }}>
        <div>
          <span className="kicker">Katalog</span>
          <h2>Sohalar bo'yicha ko'rish</h2>
        </div>
        <Link
          to="/categories"
          style={{
            display: 'inline-flex', alignItems: 'center', gap: '6px',
            color: 'var(--brand)', fontWeight: 700, fontSize: '14px',
            textDecoration: 'none', whiteSpace: 'nowrap',
          }}
        >
          Barcha {categories.length} ta soha →
        </Link>
      </div>

      {/* Category grid — 2 row horizontal scroll on mobile, 4 col grid on desktop */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))',
        gap: '10px',
      }}>
        {categoryCounts.map(({ name, count, icon, accent }) => (
          <Link
            key={name}
            to={`/category/${encodeURIComponent(name)}`}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '12px',
              padding: '14px 16px',
              background: 'var(--surface)',
              border: '1px solid var(--border)',
              borderRadius: '14px',
              textDecoration: 'none',
              transition: 'transform .18s, box-shadow .18s, border-color .18s',
              position: 'relative',
              overflow: 'hidden',
            }}
            onMouseEnter={e => {
              const el = e.currentTarget as HTMLElement;
              el.style.transform = 'translateY(-2px)';
              el.style.boxShadow = `0 8px 20px -6px ${accent}44`;
              el.style.borderColor = `${accent}55`;
            }}
            onMouseLeave={e => {
              const el = e.currentTarget as HTMLElement;
              el.style.transform = '';
              el.style.boxShadow = '';
              el.style.borderColor = 'var(--border)';
            }}
          >
            {/* Subtle color glow */}
            <div style={{
              position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
              background: `radial-gradient(ellipse at 0% 50%, ${accent}10, transparent 70%)`,
              pointerEvents: 'none',
            }} />

            {/* Icon */}
            <div style={{
              width: 40, height: 40, borderRadius: 10, flexShrink: 0,
              background: `${accent}15`,
              border: `1px solid ${accent}25`,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 18, position: 'relative',
            }}>
              {icon}
            </div>

            {/* Text */}
            <div style={{ flex: 1, minWidth: 0, position: 'relative' }}>
              <div style={{
                fontWeight: 700, fontSize: 13, color: 'var(--ink)',
                whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
                marginBottom: 2,
              }}>
                {name}
              </div>
              <div style={{ fontSize: 11, color: accent, fontWeight: 600, minHeight: 14 }}>
                {count > 0 ? `${count} ta sayt` : ''}
              </div>
            </div>
          </Link>
        ))}
      </div>
    </section>
  );
};

export default CategoryBrowse;
