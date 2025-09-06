import React, { useEffect } from 'react';

interface AppSidebarProps {
  isOpen: boolean;
  onClose: () => void;
  onOpenFeedback: () => void;
  onToggleSettings: () => void;
  isMobile?: boolean;
}

export const AppSidebar: React.FC<AppSidebarProps> = ({
  isOpen,
  onClose,
  onOpenFeedback,
  onToggleSettings,
  isMobile = false
}) => {
  // Close sidebar on escape key
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };

    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [isOpen, onClose]);

  // Prevent body scroll when mobile sidebar is open
  useEffect(() => {
    if (isMobile && isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }

    return () => {
      document.body.style.overflow = '';
    };
  }, [isMobile, isOpen]);

  return (
    <>
      {/* Mobile Backdrop */}
      {isMobile && isOpen && (
        <div
          className="fixed inset-0 bg-black/50 backdrop-blur-sm z-40"
          onClick={onClose}
          data-testid="sidebar-backdrop"
        />
      )}

      {/* Sidebar */}
      <aside
        className={`fixed top-0 left-0 h-full bg-gray-900/95 backdrop-blur-md border-r border-white/10 z-[55] transition-transform duration-300 ease-in-out ${
          isOpen ? 'translate-x-0' : '-translate-x-full'
        } ${isMobile ? 'w-80' : 'w-64'}`}
        data-testid="app-sidebar"
      >
        <div className="flex flex-col h-full">
          {/* Sidebar Header */}
          <div className="p-4 border-b border-white/10 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="text-purple-300 text-xl">🌸</div>
              <h2 className="text-lg font-semibold text-white">Eva</h2>
            </div>
            <button
              onClick={onClose}
              className="p-2 rounded-lg hover:bg-white/10 transition-colors text-white/60 hover:text-white"
              aria-label="Close sidebar"
              data-testid="sidebar-close"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* Menu Items */}
          <nav className="flex-1 p-4">
            <div className="space-y-2">
              {/* Feedback */}
              <button
                onClick={() => {
                  onOpenFeedback();
                  if (isMobile) onClose();
                }}
                className="w-full flex items-center gap-3 px-3 py-3 text-left text-white/80 hover:text-white hover:bg-white/10 rounded-lg transition-colors group"
                data-testid="sidebar-feedback"
              >
                <svg className="w-5 h-5 text-purple-400 group-hover:text-purple-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 8h10M7 12h4m1 8l-4-4H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-3l-4 4z" />
                </svg>
                <span className="font-medium">Share Feedback</span>
              </button>

              {/* Settings */}
              <button
                onClick={() => {
                  onToggleSettings();
                  if (isMobile) onClose();
                }}
                className="w-full flex items-center gap-3 px-3 py-3 text-left text-white/80 hover:text-white hover:bg-white/10 rounded-lg transition-colors group"
                data-testid="sidebar-settings"
              >
                <svg className="w-5 h-5 text-white/60 group-hover:text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
                <span className="font-medium">Settings</span>
              </button>

              {/* Divider */}
              <div className="border-t border-white/10 my-4" />

              {/* Help/Info */}
              <button
                className="w-full flex items-center gap-3 px-3 py-3 text-left text-white/60 hover:text-white/80 hover:bg-white/5 rounded-lg transition-colors group"
                data-testid="sidebar-help"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <span className="font-medium">Help & Support</span>
              </button>

              <button
                className="w-full flex items-center gap-3 px-3 py-3 text-left text-white/60 hover:text-white/80 hover:bg-white/5 rounded-lg transition-colors group"
                data-testid="sidebar-about"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <span className="font-medium">About Eva</span>
              </button>
            </div>
          </nav>

          {/* Footer */}
          <div className="p-4 border-t border-white/10">
            <div className="text-xs text-white/40 text-center leading-tight">
              <p>Your caring fertility companion</p>
              <p className="text-white/30 mt-1">Always here to support you 💜</p>
            </div>
          </div>
        </div>
      </aside>
    </>
  );
};