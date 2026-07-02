import { useState, useMemo } from 'react';
import { BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';

export default function AdvancedAnalytics({ campaigns }) {
  const [timeRange, setTimeRange] = useState('week');

  const analytics = useMemo(() => {
    const totalReach = campaigns.reduce((sum, c) => sum + (c.views || 0), 0);
    const totalDownloads = campaigns.reduce((sum, c) => sum + (c.postersGenerated || 0), 0);
    const conversionRate = totalReach > 0 ? ((totalDownloads / totalReach) * 100).toFixed(1) : 0;
    const avgConversion = campaigns.length > 0 ? (campaigns.reduce((sum, c) => {
      const rate = c.views > 0 ? (c.postersGenerated / c.views) * 100 : 0;
      return sum + rate;
    }, 0) / campaigns.length).toFixed(1) : 0;

    // Simulate time-series data
    const timeSeriesData = Array.from({ length: 7 }, (_, i) => ({
      day: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'][i],
      views: Math.floor(Math.random() * 500) + 100,
      downloads: Math.floor(Math.random() * 200) + 30
    }));

    const topCampaigns = [...campaigns]
      .sort((a, b) => (b.views || 0) - (a.views || 0))
      .slice(0, 5);

    const categoryData = campaigns.reduce((acc, c) => {
      const cat = c.category || 'Other';
      const existing = acc.find(x => x.name === cat);
      if (existing) {
        existing.value += (c.views || 0);
      } else {
        acc.push({ name: cat, value: (c.views || 0) });
      }
      return acc;
    }, []);

    return { totalReach, totalDownloads, conversionRate, avgConversion, timeSeriesData, topCampaigns, categoryData };
  }, [campaigns]);

  const colors = ['#4F46E5', '#8B5CF6', '#EC4899', '#F59E0B', '#10B981'];

  return (
    <div className="max-w-6xl mx-auto animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="mb-8 border-b border-slate-200 pb-6 flex justify-between items-end">
        <div>
          <h1 className="text-3xl md:text-4xl font-black text-slate-900 tracking-tight">Advanced Analytics</h1>
          <p className="text-slate-500 mt-2 font-medium">Detailed insights into your campaign performance.</p>
        </div>
        <div className="flex gap-2">
          {['week', 'month', 'year'].map(range => (
            <button
              key={range}
              onClick={() => setTimeRange(range)}
              className={`px-4 py-2 rounded-lg font-bold transition ${
                timeRange === range
                  ? 'bg-indigo-600 text-white'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              {range.charAt(0).toUpperCase() + range.slice(1)}
            </button>
          ))}
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid md:grid-cols-4 gap-4 mb-8">
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
          <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Total Reach</p>
          <p className="text-4xl font-black text-indigo-600">{analytics.totalReach.toLocaleString()}</p>
          <p className="text-xs text-slate-400 mt-2">👁️ Campaign impressions</p>
        </div>
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
          <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Total Downloads</p>
          <p className="text-4xl font-black text-emerald-600">{analytics.totalDownloads.toLocaleString()}</p>
          <p className="text-xs text-slate-400 mt-2">📥 Posters generated</p>
        </div>
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
          <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Conversion Rate</p>
          <p className="text-4xl font-black text-purple-600">{analytics.conversionRate}%</p>
          <p className="text-xs text-slate-400 mt-2">🎯 Overall rate</p>
        </div>
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
          <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Avg Conversion</p>
          <p className="text-4xl font-black text-pink-600">{analytics.avgConversion}%</p>
          <p className="text-xs text-slate-400 mt-2">📊 Per campaign</p>
        </div>
      </div>

      {/* Charts */}
      <div className="grid lg:grid-cols-2 gap-6 mb-8">
        {/* Time Series */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
          <h2 className="text-lg font-bold text-slate-800 mb-4">Performance Over Time</h2>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={analytics.timeSeriesData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
              <XAxis dataKey="day" stroke="#94a3b8" />
              <YAxis stroke="#94a3b8" />
              <Tooltip contentStyle={{ backgroundColor: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '8px' }} />
              <Legend />
              <Line type="monotone" dataKey="views" stroke="#4F46E5" strokeWidth={2} dot={{ fill: '#4F46E5' }} />
              <Line type="monotone" dataKey="downloads" stroke="#10B981" strokeWidth={2} dot={{ fill: '#10B981' }} />
            </LineChart>
          </ResponsiveContainer>
        </div>

        {/* Category Distribution */}
        {analytics.categoryData.length > 0 && (
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
            <h2 className="text-lg font-bold text-slate-800 mb-4">Reach by Category</h2>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie data={analytics.categoryData} cx="50%" cy="50%" labelLine={false} label={({ name, value }) => `${name}: ${value}`} outerRadius={80} fill="#8884d8" dataKey="value">
                  {analytics.categoryData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={colors[index % colors.length]} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>

      {/* Top Campaigns */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
        <h2 className="text-lg font-bold text-slate-800 mb-4">Top Performing Campaigns</h2>
        {analytics.topCampaigns.length === 0 ? (
          <p className="text-slate-400 text-center py-8">No campaigns yet</p>
        ) : (
          <div className="space-y-3">
            {analytics.topCampaigns.map((camp, idx) => (
              <div key={camp.id} className="flex items-center justify-between p-4 bg-slate-50 rounded-lg border border-slate-100">
                <div className="flex items-center gap-4 flex-1">
                  <span className="text-xl font-black text-indigo-600 w-8 text-center">#{idx + 1}</span>
                  <div>
                    <p className="font-bold text-slate-800">{camp.title}</p>
                    <p className="text-xs text-slate-500">Created {new Date(camp.createdAt?.seconds * 1000 || Date.now()).toLocaleDateString()}</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="font-bold text-slate-800">{camp.views || 0}</p>
                  <p className="text-xs text-slate-500">views</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
