import { useState, useMemo } from 'react';
import { ShieldCheck, Activity, Loader2 } from 'lucide-react';
import { useProofs } from './lib/api';
import { OracleStats } from './components/OracleStats';
import { TrustComparison } from './components/TrustComparison';
import { ProofCard } from './components/ProofCard';
import { FilterBar } from './components/FilterBar';

function App() {
  const { data, loading, error } = useProofs();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTier, setSelectedTier] = useState('ALL');
  const [selectedCategory, setSelectedCategory] = useState('ALL');

  // Extract all unique categories
  const categories = useMemo(() => {
    if (!data) return [];
    const cats = new Set<string>();
    data.proofs.forEach(batch => cats.add(batch.category));
    return Array.from(cats).sort();
  }, [data]);

  // Flatten and filter proofs
  const filteredProofs = useMemo(() => {
    if (!data) return [];

    let result = [];

    // Flatten batches into individual market proofs
    for (const batch of data.proofs) {
      for (const market of batch.markets) {
        result.push({ batch, market });
      }
    }

    // Apply filters
    if (selectedTier !== 'ALL') {
      result = result.filter(item => item.batch.tier.toString() === selectedTier);
    }

    if (selectedCategory !== 'ALL') {
      result = result.filter(item => item.batch.category === selectedCategory);
    }

    if (searchQuery.trim() !== '') {
      const query = searchQuery.toLowerCase();
      result = result.filter(item =>
        item.market.question.toLowerCase().includes(query) ||
        item.market.evidence.toLowerCase().includes(query) ||
        item.market.pda.toLowerCase().includes(query)
      );
    }

    return result;
  }, [data, searchQuery, selectedTier, selectedCategory]);

  return (
    <div className="min-h-screen flex flex-col items-center">
      {/* Header */}
      <header className="w-full border-b border-white/10 bg-[#0a0a0a]/80 backdrop-blur-md sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-6 h-6 text-[#e2ccaa]" />
            <h1 className="text-xl font-bold tracking-tight">
              Baozi <span className="text-white/60 font-medium">Trust Proof Explorer</span>
            </h1>
          </div>
          <div className="text-sm text-white/40 flex items-center gap-4">
            <div className="flex items-center gap-1.5 border border-white/10 bg-white/5 py-1 px-3 rounded-full">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
              Live Oracle Feed
            </div>
            <a href="https://baozi.bet" target="_blank" rel="noreferrer" className="hover:text-white transition-colors hidden sm:block">
              baozi.bet ↗
            </a>
          </div>
        </div>
      </header>

      <main className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 flex flex-col gap-16">

        {/* Hero Section */}
        <section className="text-center max-w-3xl mx-auto">
          <h2 className="text-5xl sm:text-6xl font-extrabold tracking-tight mb-6">
            Every Resolution <br className="hidden sm:block" />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#e2ccaa] to-[#ccb088]">
              Has Receipts.
            </span>
          </h2>
          <p className="text-xl text-white/60 leading-relaxed">
            If a prediction market won't show you exactly how it resolved, why do you trust it?
            Explore the cryptographically verified evidence trail for every market on Baozi.
          </p>
        </section>

        {/* State Handling */}
        {loading && (
          <div className="flex flex-col items-center justify-center py-20 text-white/40">
            <Loader2 className="w-8 h-8 animate-spin mb-4 text-[#e2ccaa]" />
            <p>Fetching immutable proofs...</p>
          </div>
        )}

        {error && (
          <div className="border border-red-500/20 bg-red-500/10 rounded-xl p-8 text-center text-red-200">
            <h3 className="text-lg font-bold mb-2">Error Loading Proofs</h3>
            <p>{error.message}</p>
          </div>
        )}

        {/* Main Content */}
        {!loading && !error && data && (
          <>
            {/* Stats Dashboard */}
            <section>
              <div className="flex items-center gap-2 mb-6">
                <Activity className="w-5 h-5 text-[#e2ccaa]" />
                <h3 className="text-2xl font-bold">Oracle Performance Dashboard</h3>
              </div>
              <OracleStats stats={data.stats} />
            </section>

            {/* Proof Explorer */}
            <section id="explorer" className="scroll-mt-24">
              <div className="flex flex-col mb-8">
                <h3 className="text-3xl font-bold mb-2">Resolution Log</h3>
                <p className="text-white/50 mb-6">Browse the immutable evidence trail for completed markets.</p>
                <FilterBar
                  searchQuery={searchQuery}
                  setSearchQuery={setSearchQuery}
                  selectedTier={selectedTier}
                  setSelectedTier={setSelectedTier}
                  selectedCategory={selectedCategory}
                  setSelectedCategory={setSelectedCategory}
                  categories={categories}
                />
              </div>

              {filteredProofs.length === 0 ? (
                <div className="text-center py-20 border border-white/10 rounded-xl bg-white/5">
                  <p className="text-white/40 text-lg">No proofs match your search criteria.</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {filteredProofs.map((item, i) => (
                    <ProofCard
                      key={`${item.batch.id}-${item.market.pda}-${i}`}
                      batch={item.batch}
                      market={item.market}
                    />
                  ))}
                </div>
              )}
            </section>

            {/* Trust Comparison */}
            <TrustComparison />
          </>
        )}
      </main>

      {/* Footer */}
      <footer className="w-full border-t border-white/10 py-8 text-center text-white/40 text-sm mt-auto">
        <p>Built for the Baozi OpenClaw Trust Proof Explorer Bounty.</p>
      </footer>
    </div>
  );
}

export default App;
