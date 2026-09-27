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
    fetch('http://localhost:8000/api/analytics/track', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ visitor_id: visitorId })
    }).catch(console.error);

    // Fetch initial stats
    const fetchStats = () => {
      fetch('http://localhost:8000/api/analytics/daily')
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
    <div className="w-full flex justify-center mb-6">
      <div className="flex items-center space-x-2 px-4 py-1.5 bg-slate-800/50 border border-slate-700 rounded-full shadow-lg backdrop-blur-sm w-max mx-auto">
        <span className="relative flex h-2.5 w-2.5">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
          <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-green-500"></span>
        </span>
        <span className="text-xs font-medium text-gray-300">
          {data.visitors.toLocaleString()} tashrifchi &bull; {data.clicks.toLocaleString()} ta o'tish
        </span>
      </div>
    </div>
  );
};

export default LiveAnalytics;
