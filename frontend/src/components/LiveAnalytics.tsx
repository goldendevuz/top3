import React, { useEffect, useState } from 'react';

const LiveAnalytics = () => {
  const [data, setData] = useState({ visitors: 0, clicks: 0 });

  useEffect(() => {
    // Generate or get visitor ID
    let visitorId = localStorage.getItem('visitor_id');
    if (!visitorId) {
      visitorId = 'v_' + Math.random().toString(36).substring(2) + Date.now().toString(36);
      localStorage.setItem('visitor_id', visitorId);
    }

    // Track this visit
    fetch('/api/analytics/track', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ visitor_id: visitorId })
    }).catch(console.error);

    // Fetch initial stats
    const fetchStats = () => {
      fetch('/api/analytics/daily')
        .then(res => res.json())
        .then(resData => setData(resData))
        .catch(console.error);
    };

    fetchStats();
    
    // Poll every 30 seconds
    const interval = setInterval(fetchStats, 30000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="inline-flex items-center gap-1.5 text-sm sm:text-base text-slate-300 font-medium mt-1">
      <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></span>
      {data.visitors.toLocaleString()} tashrifchi &bull; {data.clicks.toLocaleString()} o'tish
    </div>
  );
};

export default LiveAnalytics;
