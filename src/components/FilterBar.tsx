'use client';

interface FilterBarProps {
  searchQuery: string;
  onSearchChange: (val: string) => void;
  activeFilter: string;
  onFilterChange: (val: string) => void;
}

export default function FilterBar({ searchQuery, onSearchChange, activeFilter, onFilterChange }: FilterBarProps) {
  const filters = ['All', 'Green', 'Orange', 'Red', 'Pending', 'Manual'];

  return (
    <div className="flex flex-col md:flex-row justify-between items-center gap-4 mb-4">
      <div className="w-full md:w-64">
        <input
          type="text"
          className="form-input"
          placeholder="Search name or enrollment..."
          value={searchQuery}
          onChange={(e) => onSearchChange(e.target.value)}
        />
      </div>
      
      <div className="flex flex-wrap gap-2">
        {filters.map((f) => (
          <button
            key={f}
            onClick={() => onFilterChange(f)}
            className={`badge ${activeFilter === f ? 'badge-neutral bg-white text-black' : 'badge-neutral'}`}
            style={{ 
              cursor: 'pointer',
              opacity: activeFilter === f ? 1 : 0.7,
              backgroundColor: activeFilter === f ? 'var(--text-primary)' : undefined,
              color: activeFilter === f ? 'var(--bg-primary)' : undefined
            }}
          >
            {f}
          </button>
        ))}
      </div>
    </div>
  );
}
