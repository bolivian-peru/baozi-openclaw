import { Search, Filter } from 'lucide-react';

interface Props {
  searchQuery: string;
  setSearchQuery: (q: string) => void;
  selectedTier: string;
  setSelectedTier: (t: string) => void;
  selectedCategory: string;
  setSelectedCategory: (c: string) => void;
  categories: string[];
}

export function FilterBar({
  searchQuery,
  setSearchQuery,
  selectedTier,
  setSelectedTier,
  selectedCategory,
  setSelectedCategory,
  categories
}: Props) {
  return (
    <div className="flex flex-col md:flex-row gap-4 w-full bg-[#151515] p-4 rounded-xl border border-white/10">
      {/* Search Input */}
      <div className="relative flex-grow">
        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
          <Search className="h-4 w-4 text-white/40" />
        </div>
        <input
          type="text"
          className="block w-full pl-10 pr-3 py-2 border border-white/10 rounded-lg leading-5 bg-black/50 text-white placeholder-white/30 focus:outline-none focus:ring-1 focus:ring-[#e2ccaa] focus:border-[#e2ccaa] sm:text-sm transition-colors"
          placeholder="Search markets, PDAs, or evidence..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
        />
      </div>

      {/* Filters */}
      <div className="flex gap-4">
        <div className="relative flex items-center">
          <Filter className="absolute left-3 h-4 w-4 text-white/40 pointer-events-none" />
          <select
            className="appearance-none block w-full pl-9 pr-8 py-2 border border-white/10 rounded-lg leading-5 bg-black/50 text-white focus:outline-none focus:ring-1 focus:ring-[#e2ccaa] focus:border-[#e2ccaa] sm:text-sm transition-colors cursor-pointer"
            value={selectedTier}
            onChange={(e) => setSelectedTier(e.target.value)}
          >
            <option value="ALL">All Tiers</option>
            <option value="1">Tier 1 (Trustless)</option>
            <option value="2">Tier 2 (Verified)</option>
            <option value="3">Tier 3 (AI Research)</option>
          </select>
        </div>

        <select
          className="block w-full pl-3 pr-8 py-2 border border-white/10 rounded-lg leading-5 bg-black/50 text-white focus:outline-none focus:ring-1 focus:ring-[#e2ccaa] focus:border-[#e2ccaa] sm:text-sm transition-colors cursor-pointer"
          value={selectedCategory}
          onChange={(e) => setSelectedCategory(e.target.value)}
        >
          <option value="ALL">All Categories</option>
          {categories.map((cat) => (
            <option key={cat} value={cat}>
              {cat}
            </option>
          ))}
        </select>
      </div>
    </div>
  );
}
