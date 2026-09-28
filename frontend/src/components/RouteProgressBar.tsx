import { useEffect, useRef, useState } from 'react';
import { useLocation } from 'react-router-dom';

const RouteProgressBar = () => {
  const location = useLocation();
  const [visible, setVisible] = useState(false);
  const [width, setWidth] = useState(0);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    setVisible(true);
    setWidth(0);
    const t1 = setTimeout(() => setWidth(30), 50);
    const t2 = setTimeout(() => setWidth(65), 300);
    const t3 = setTimeout(() => setWidth(85), 700);
    const t4 = setTimeout(() => {
      setWidth(100);
      timerRef.current = setTimeout(() => setVisible(false), 300);
    }, 900);
    return () => {
      [t1, t2, t3, t4].forEach(clearTimeout);
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [location.pathname]);

  if (!visible) return null;
  return (
    <div
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        zIndex: 9999,
        width: width + '%',
        height: '3px',
        background: 'linear-gradient(90deg, #6366f1, #8b5cf6, #06b6d4)',
        transition: width === 100 ? 'width 0.2s ease-out' : 'width 0.4s cubic-bezier(0.4,0,0.2,1)',
        boxShadow: '0 0 12px #6366f180, 0 0 4px #8b5cf680',
        borderRadius: '0 4px 4px 0',
      }}
    />
  );
};

export default RouteProgressBar;
