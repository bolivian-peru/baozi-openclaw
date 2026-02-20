import { CheckCircle2, XCircle, AlertCircle } from 'lucide-react';

const COMPARISON_DATA = [
  { feature: 'Evidence stored', baozi: 'On-chain', polymarket: 'None', kalshi: 'None' },
  { feature: 'Proof public', baozi: 'Yes (Full trail)', polymarket: 'No', kalshi: 'No' },
  { feature: 'Multisig verified', baozi: '2-of-2', polymarket: 'UMA vote', kalshi: 'Internal' },
  { feature: 'On-chain TX', baozi: 'Visible', polymarket: 'Visible', kalshi: 'No' },
  { feature: 'Dispute window', baozi: '6 hours', polymarket: '2 hours', kalshi: 'Variable' },
  { feature: 'Resolution time', baozi: '3min - 24h', polymarket: 'Variable', kalshi: 'Variable' },
  { feature: 'Transparency', baozi: 'FULL', polymarket: 'PARTIAL', kalshi: 'MINIMAL' },
];

export function TrustComparison() {
  return (
    <section className="w-full">
      <div className="mb-6 flex flex-col items-center text-center">
        <h3 className="text-2xl font-bold mb-2">The Trust Standard</h3>
        <p className="text-white/50 max-w-2xl">
          Every DeFi hack and opaque resolution erodes trust. Explore how Baozi compares
          against other major prediction markets.
        </p>
      </div>

      <div className="overflow-x-auto rounded-xl border border-white/10 bg-[#151515]">
        <table className="w-full text-left text-sm whitespace-nowrap">
          <thead>
            <tr className="border-b border-white/10 bg-white/5 text-white/70">
              <th className="p-4 font-semibold">Feature</th>
              <th className="p-4 font-bold text-[#e2ccaa]">Baozi</th>
              <th className="p-4 font-semibold">Polymarket</th>
              <th className="p-4 font-semibold">Kalshi</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/5">
            {COMPARISON_DATA.map((row, i) => (
              <tr key={i} className="hover:bg-white/[0.02] transition-colors">
                <td className="p-4 font-medium text-white/80">{row.feature}</td>
                <td className="p-4">
                  <div className="flex items-center gap-2 text-[#e2ccaa]">
                    {row.baozi === 'FULL' || row.baozi.includes('Yes') ? (
                      <CheckCircle2 className="w-4 h-4" />
                    ) : (
                      <CheckCircle2 className="w-4 h-4 opacity-70" />
                    )}
                    {row.baozi}
                  </div>
                </td>
                <td className="p-4 text-white/60">
                  <div className="flex items-center gap-2">
                    {row.polymarket.includes('None') || row.polymarket === 'No' ? (
                      <XCircle className="w-4 h-4 text-red-400" />
                    ) : row.polymarket === 'PARTIAL' ? (
                      <AlertCircle className="w-4 h-4 text-yellow-400" />
                    ) : (
                      <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                    )}
                    {row.polymarket}
                  </div>
                </td>
                <td className="p-4 text-white/60">
                  <div className="flex items-center gap-2">
                    {row.kalshi.includes('None') || row.kalshi === 'No' || row.kalshi === 'MINIMAL' ? (
                      <XCircle className="w-4 h-4 text-red-400" />
                    ) : (
                      <AlertCircle className="w-4 h-4 text-yellow-400" />
                    )}
                    {row.kalshi}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
