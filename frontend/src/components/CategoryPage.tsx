import { useParams, Link, useNavigate } from 'react-router-dom';
import { useBoardStore, DomainItem } from '../store/useBoardStore';
import { categoryConfig } from './Categories';
import { getDomainLogoUrl, handleLogoError } from '../utils';

const fmt = (n: number) => n.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ' ');

const CategoryPage = () => {
  const { name } = useParams<{ name: string }>();
  const navigate = useNavigate();
  const { domains, registerVisit } = useBoardStore();

  const buildUtmUrl = (domain: string) => {
    const base = domain.startsWith('http') ? domain : `https://${domain}`;
    const params = `utm_source=top3.uz&utm_medium=directory&utm_campaign=top3_referral`;
    return base.includes('?') ? `${base}&${params}` : `${base}?${params}`;
  };

  const categoryName = name ? decodeURIComponent(name) : '';
  const cfg = categoryConfig[categoryName];

  // Filter and sort by clicks desc
  const filtered = domains
    .filter((d: DomainItem) => d.cat === categoryName)
    .sort((a, b) => (b.clicks || 0) - (a.clicks || 0));

  const accent = cfg?.accent || '#6366f1';
  const icon = cfg?.icon || '📌';

  return (
    <div style={{ background: 'var(--bg)', minHeight: '100vh', paddingBottom: '80px' }}>
      <div style={{ maxWidth: '960px', margin: '0 auto', padding: '24px 24px 0' }}>

        {/* Breadcrumb */}
        <div style={{ marginBottom: '32px' }}>
          <Link
            to="/categories"
            style={{
              color: 'var(--muted)', fontSize: '13px', fontWeight: 600,
              textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: '6px'
            }}
          >
            ← Barcha kategoriyalar
          </Link>
        </div>

        {/* Header */}
        <div style={{ marginBottom: '48px', display: 'flex', alignItems: 'center', gap: '20px' }}>
          <div style={{
            width: '64px', height: '64px', flexShrink: 0,
            borderRadius: '18px',
            background: `${accent}20`,
            border: `1px solid ${accent}40`,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: '30px',
          }}>
            {icon}
          </div>
          <div>
            <h1 style={{
              fontSize: 'clamp(22px, 3vw, 36px)', fontWeight: 800,
              color: 'var(--ink)', lineHeight: 1.1, marginBottom: '6px'
            }}>
              {categoryName}
            </h1>
            <p style={{ color: 'var(--muted)', fontSize: '14px' }}>
              <span style={{ color: accent, fontWeight: 700 }}>{filtered.length}</span> ta sayt topildi
            </p>
          </div>
        </div>

        {/* Domain list */}
        {filtered.length === 0 ? (
          <div style={{
            textAlign: 'center', padding: '80px 24px',
            color: 'var(--muted)', fontSize: '15px'
          }}>
            <div style={{ fontSize: '48px', marginBottom: '16px' }}>🔍</div>
            <p>Bu kategoriyada hali sayt yo'q</p>
            <Link
              to="/#add"
              style={{
                display: 'inline-block', marginTop: '16px',
                background: accent, color: '#fff',
                padding: '10px 24px', borderRadius: '999px',
                textDecoration: 'none', fontWeight: 700, fontSize: '14px'
              }}
            >
              Saytingizni qo'shing
            </Link>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {filtered.map((d, i) => {
              const barWidth = filtered[0].clicks
                ? Math.round(((d.clicks || 0) / (filtered[0].clicks || 1)) * 100)
                : 0;
              const rank = i + 1;
              let rankColor = 'var(--muted)';
              if (rank === 1) rankColor = '#facc15';
              else if (rank === 2) rankColor = '#cbd5e1';
              else if (rank === 3) rankColor = '#b45309';

              return (
                <div
                  key={d.id}
                  style={{
                    position: 'relative',
                    display: 'flex', alignItems: 'center', gap: '16px',
                    padding: '16px 20px',
                    background: 'var(--surface)',
                    border: '1px solid var(--border)',
                    borderRadius: '14px',
                    transition: 'transform .2s, box-shadow .2s',
                  }}
                  onMouseEnter={e => {
                    (e.currentTarget as HTMLElement).style.transform = 'translateY(-2px)';
                    (e.currentTarget as HTMLElement).style.boxShadow = `0 8px 24px -8px ${accent}44`;
                    (e.currentTarget as HTMLElement).style.borderColor = `${accent}44`;
                  }}
                  onMouseLeave={e => {
                    (e.currentTarget as HTMLElement).style.transform = 'translateY(0)';
                    (e.currentTarget as HTMLElement).style.boxShadow = 'none';
                    (e.currentTarget as HTMLElement).style.borderColor = 'var(--border)';
                  }}
                >
                  <a
                    href={d.custom_url || buildUtmUrl(d.dom)}
                    onClick={() => d.id && registerVisit(d.id)}
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{ position: 'absolute', inset: 0, zIndex: 0, borderRadius: '14px' }}
                    aria-label={`Go to ${d.dom}`}
                  />

                  {/* Rank */}
                  <div style={{
                    width: '28px', textAlign: 'center', flexShrink: 0,
                    fontFamily: "'IBM Plex Mono', monospace", fontWeight: 700,
                    fontSize: '15px', color: rankColor,
                  }}>
                    {rank}
                  </div>

                  {/* Favicon */}
                  <img
                    src={getDomainLogoUrl(d.dom, 64)} onError={(e) => handleLogoError(e, d.dom)}
                    alt=""
                    width={24} height={24}
                    style={{ borderRadius: '6px', flexShrink: 0 }}
                    
                  />

                  {/* Info */}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{
                      fontWeight: 700, fontSize: '15px', color: 'var(--ink)',
                      whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis'
                    }}>
                      {d.dom}
                    </div>
                    {d.desc && (
                      <div style={{
                        display: 'flex', alignItems: 'center', gap: '4px',
                        fontSize: '12.5px', color: 'var(--muted)', marginTop: '2px'
                      }}>
                        <span style={{
                          whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', flex: '1 1 0%', minWidth: 0
                        }}>
                          {d.desc}
                        </span>
                        <Link 
                          to={`/site/${d.dom.replace(/^https?:\/\//i, '').replace(/^www\./i, '').split(/[/?#]/)[0]}`}
                          style={{
                            color: 'var(--indigo-400, #818cf8)', fontWeight: 500, flexShrink: 0, position: 'relative', zIndex: 10
                          }}
                        >
                          batafsil
                        </Link>
                      </div>
                    )}
                  </div>

                  {/* Bar + clicks */}
                  {d.clicks != null && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexShrink: 0 }}>
                      <div style={{
                        width: '80px', height: '5px',
                        background: 'var(--surface-2)', borderRadius: '999px', overflow: 'hidden'
                      }}>
                        <div style={{
                          height: '100%', borderRadius: '999px',
                          background: `linear-gradient(90deg, ${accent}, ${accent}88)`,
                          width: `${barWidth}%`,
                          transition: 'width .5s cubic-bezier(.2,.8,.2,1)'
                        }} />
                      </div>
                      <span style={{
                        fontFamily: "'IBM Plex Mono', monospace", fontSize: '12px',
                        color: 'var(--ink-soft)', width: '52px', textAlign: 'right'
                      }}>
                        {fmt(d.clicks || 0)}
                      </span>
                    </div>
                  )}

                  {/* Sponsored badge */}
                  {d.is_sponsored && (
                    <span style={{
                      background: 'rgba(234,179,8,0.12)', color: '#ca8a04',
                      fontSize: '10px', fontWeight: 700, padding: '3px 8px',
                      borderRadius: '999px', border: '1px solid rgba(234,179,8,0.25)',
                      flexShrink: 0
                    }}>
                      SPONSOR
                    </span>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

export default CategoryPage;
