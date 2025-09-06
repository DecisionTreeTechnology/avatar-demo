import React from 'react';
import { AppHeader } from './AppHeader';
import { AppSidebar } from './AppSidebar';

interface AppShellProps extends React.PropsWithChildren {
  // Header props
  onOpenFeedback?: () => void;
  onToggleSettings?: () => void;
  // Sidebar state
  sidebarOpen?: boolean;
  onToggleSidebar?: () => void;
  onCloseSidebar?: () => void;
  isMobile?: boolean;
}

export const AppShell: React.FC<AppShellProps> = ({ 
  children,
  onOpenFeedback,
  onToggleSettings,
  sidebarOpen = false,
  onToggleSidebar,
  onCloseSidebar,
  isMobile = false
}) => {
  return (
    <div className="w-screen h-screen overflow-hidden bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 text-slate-200 mobile-keyboard-safe">
      {/* Sidebar */}
      {onCloseSidebar && onOpenFeedback && onToggleSettings && onToggleSidebar && (
        <AppSidebar
          isOpen={sidebarOpen}
          onClose={onCloseSidebar}
          onOpenFeedback={onOpenFeedback}
          onToggleSettings={onToggleSettings}
          isMobile={isMobile}
        />
      )}

      {/* Main App Layout */}
      <div className={`flex flex-col h-full transition-all duration-300 ${
        sidebarOpen && !isMobile ? 'ml-64' : ''
      }`}>
        {/* Header */}
        {onToggleSidebar && (
          <AppHeader
            onToggleSidebar={onToggleSidebar}
          />
        )}

        {/* Main Content */}
        <main className="flex-1 overflow-hidden">
          {children}
        </main>
      </div>
    </div>
  );
};
