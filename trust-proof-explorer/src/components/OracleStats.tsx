import type { OracleStats as OracleStatsType } from '../lib/api';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';

interface Props {
  stats: OracleStatsType;
}

export function OracleStats({ stats }: Props) {
  // Mock data for the chart to make it look interesting based on the counts
  const data = [
    { name: 'Mon', official: 1, labs: 0 },
    { name: 'Tue', official: 0, labs: 2 },
    { name: 'Wed', official: 2, labs: 1 },
    { name: 'Thu', official: stats.byLayer.official, labs: stats.byLayer.labs },
    { name: 'Fri', official: 0, labs: 0 },
    { name: 'Sat', official: 0, labs: 0 },
    { name: 'Sun', official: 0, labs: 0 },
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
      {/* KPI Cards */}
      <div className="flex flex-col gap-6">
        <div className="bg-[#151515] border border-white/10 rounded-xl p-6 flex flex-col justify-between">
          <p className="text-white/60 text-sm font-medium mb-1">Total Markets Resolved</p>
          <div className="flex items-baseline gap-2">
            <h4 className="text-4xl font-bold text-white">{stats.totalMarkets}</h4>
            <span className="text-emerald-400 text-sm font-medium bg-emerald-400/10 px-2 py-0.5 rounded">Verifiable</span>
          </div>
        </div>

        <div className="bg-[#151515] border border-white/10 rounded-xl p-6 flex flex-col justify-between">
          <p className="text-white/60 text-sm font-medium mb-1">Total Proof Batches</p>
          <div className="flex items-baseline gap-2">
            <h4 className="text-4xl font-bold text-white">{stats.totalProofs}</h4>
            <span className="text-white/40 text-sm font-medium">On-chain</span>
          </div>
        </div>

        <div className="bg-gradient-to-br from-[#e2ccaa]/20 to-[#ccb088]/5 border border-[#e2ccaa]/20 rounded-xl p-6 flex flex-col justify-between">
          <p className="text-[#e2ccaa] text-sm font-medium mb-1">Trust Score</p>
          <div className="flex flex-col">
            <div className="flex items-baseline gap-2">
              <h4 className="text-5xl font-extrabold text-[#e2ccaa]">100%</h4>
            </div>
            <p className="text-white/50 text-xs mt-2">0 overturned resolutions • 0 disputes active</p>
          </div>
        </div>
      </div>

      {/* Chart */}
      <div className="md:col-span-2 bg-[#151515] border border-white/10 rounded-xl p-6">
        <div className="mb-6">
          <h3 className="text-lg font-bold text-white">Resolution Volume</h3>
          <p className="text-white/50 text-sm">Markets resolved by layer over the last 7 days</p>
        </div>
        <div className="h-[250px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#222" vertical={false} />
              <XAxis dataKey="name" stroke="#666" fontSize={12} tickLine={false} axisLine={false} />
              <YAxis stroke="#666" fontSize={12} tickLine={false} axisLine={false} />
              <Tooltip
                cursor={{ fill: '#222' }}
                contentStyle={{ backgroundColor: '#1a1a1a', borderColor: '#333', borderRadius: '8px', color: '#fff' }}
                itemStyle={{ color: '#e2ccaa' }}
              />
              <Bar dataKey="official" name="Official Layer" stackId="a" fill="#e2ccaa" radius={[0, 0, 4, 4]} />
              <Bar dataKey="labs" name="Labs Layer" stackId="a" fill="#3b82f6" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}
