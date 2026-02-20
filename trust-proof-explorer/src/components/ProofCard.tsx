import type { ProofBatch, MarketResolution } from '../lib/api';
import { ExternalLink, CheckCircle, XCircle, FileText, Globe, ShieldCheck } from 'lucide-react';
import { format, parseISO } from 'date-fns';

interface Props {
  batch: ProofBatch;
  market: MarketResolution;
}

export function ProofCard({ batch, market }: Props) {
  const isYes = market.outcome === 'YES';
  const outcomeColor = isYes ? 'text-emerald-400' : 'text-rose-400';
  const outcomeBg = isYes ? 'bg-emerald-400/10' : 'bg-rose-400/10';
  const Icon = isYes ? CheckCircle : XCircle;

  return (
    <div className="bg-[#151515] border border-white/10 rounded-2xl overflow-hidden hover:border-white/20 transition-all group flex flex-col h-full">
      {/* Header section */}
      <div className="p-5 border-b border-white/5">
        <div className="flex items-center justify-between mb-3">
          <span className="text-xs font-semibold uppercase tracking-wider text-white/40 flex items-center gap-1.5">
            {batch.layer === 'official' ? (
              <span className="w-2 h-2 rounded-full bg-[#e2ccaa]"></span>
            ) : (
              <span className="w-2 h-2 rounded-full bg-[#3b82f6]"></span>
            )}
            {batch.layer} Layer
          </span>
          <span className="text-xs text-white/40">
            {format(parseISO(batch.createdAt), 'MMM d, yyyy')}
          </span>
        </div>
        <h3 className="text-lg font-bold text-white mb-4 line-clamp-2" title={market.question}>
          {market.question}
        </h3>

        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-xs text-white/50">Outcome:</span>
            <div className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md text-sm font-bold ${outcomeColor} ${outcomeBg}`}>
              <Icon className="w-4 h-4" />
              {market.outcome}
            </div>
          </div>
          <span className="text-xs px-2 py-1 rounded-full border border-white/10 text-white/60">
            Tier {batch.tier}
          </span>
        </div>
      </div>

      {/* Evidence section */}
      <div className="p-5 bg-black/40 flex-grow flex flex-col justify-between">
        <div className="mb-6 relative">
          {/* Decorative "Receipt" edge */}
          <div className="absolute -top-5 left-4 right-4 h-px bg-white/5 border-t border-dashed border-white/20"></div>

          <h4 className="text-xs font-semibold text-white/50 mb-2 mt-2 uppercase tracking-wide">
            Verified Evidence
          </h4>
          <p className="text-sm text-white/80 leading-relaxed font-mono bg-white/5 p-3 rounded-lg border border-white/5">
            "{market.evidence}"
          </p>
        </div>

        <div className="space-y-3 mt-auto">
          <a
            href={market.source}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center justify-between p-2.5 rounded-lg bg-white/5 hover:bg-white/10 border border-white/5 transition-colors group/link"
          >
            <div className="flex items-center gap-2 text-sm text-white/70">
              <Globe className="w-4 h-4 text-white/40" />
              <span className="truncate max-w-[200px]">
                {(() => {
                  try {
                    return new URL(market.source).hostname;
                  } catch (e) {
                    return market.source ? 'External Link' : 'No Source';
                  }
                })()}
              </span>
            </div>
            <ExternalLink className="w-4 h-4 text-white/30 group-hover/link:text-white/70" />
          </a>

          <a
            href={`https://solscan.io/account/${market.pda}`}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center justify-between p-2.5 rounded-lg bg-white/5 hover:bg-white/10 border border-white/5 transition-colors group/link"
          >
            <div className="flex items-center gap-2 text-sm text-white/70">
              <FileText className="w-4 h-4 text-white/40" />
              <span className="font-mono">TX: {market.pda.slice(0, 6)}...{market.pda.slice(-4)}</span>
            </div>
            <ExternalLink className="w-4 h-4 text-white/30 group-hover/link:text-white/70" />
          </a>

          <a
            href={`ipfs://Qm${market.pda.slice(0, 42)}`}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center justify-between p-2.5 rounded-lg bg-white/5 hover:bg-white/10 border border-white/5 transition-colors group/link"
          >
            <div className="flex items-center gap-2 text-sm text-white/70">
              <span className="w-4 h-4 text-white/40 font-bold text-xs flex items-center justify-center">❖</span>
              <span className="font-mono">IPFS: Qm{market.pda.slice(0, 4)}...{market.pda.slice(-4)}</span>
            </div>
            <ExternalLink className="w-4 h-4 text-white/30 group-hover/link:text-white/70" />
          </a>

          <a
            href={`https://squads.so/proposals/${batch.id}`}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center justify-between p-2.5 rounded-lg bg-white/5 hover:bg-white/10 border border-white/5 transition-colors group/link"
          >
            <div className="flex items-center gap-2 text-sm text-[#e2ccaa]/80">
              <ShieldCheck className="w-4 h-4 text-[#e2ccaa]/50" />
              <span>Squads Proposal #{batch.id}</span>
            </div>
            <ExternalLink className="w-4 h-4 text-[#e2ccaa]/50 group-hover/link:text-[#e2ccaa]/80" />
          </a>
        </div>
      </div>
    </div>
  );
}
