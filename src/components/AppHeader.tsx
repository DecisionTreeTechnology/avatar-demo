import React from 'react';

interface AppHeaderProps {
  onToggleSidebar: () => void;
}

export const AppHeader: React.FC<AppHeaderProps> = ({
  onToggleSidebar
}) => {
  return (
    <header className="bg-white/10 backdrop-blur-sm border-b border-white/10 px-4 py-3 flex items-center justify-between relative z-50">
      <div className="flex items-center gap-3">
        {/* Sidebar Toggle - Universal hamburger menu for all devices */}
        <button
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            onToggleSidebar();
          }}
          className="p-2 rounded-lg hover:bg-white/10 transition-colors text-white/80 hover:text-white relative z-[60] cursor-pointer"
          aria-label="Toggle sidebar"
          data-testid="sidebar-toggle"
          type="button"
        >
          <svg className="w-5 h-5 pointer-events-none" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
          </svg>
        </button>

        {/* Eva Branding */}
        <div className="flex items-center gap-2">
          <div className="text-purple-300 text-lg">🌸</div>
          <h1 className="text-lg font-semibold text-white">Eva</h1>
          <span className="text-xs text-white/60 bg-purple-500/30 px-2 py-1 rounded-full">
            Fertility Companion
          </span>
        </div>
      </div>

      {/* All actions moved to sidebar for cleaner design */}

      {/* Clean, minimal design - single hamburger menu serves all needs */}
    </header>
  );
};