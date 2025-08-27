import React from 'react';

export const AppShell: React.FC<React.PropsWithChildren> = ({ children }) => {
  return (
    <div className="w-screen h-screen overflow-hidden bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 text-slate-200 mobile-keyboard-safe">{children}</div>
  );
};
