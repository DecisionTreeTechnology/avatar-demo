import React from 'react';

export const AppShell: React.FC<React.PropsWithChildren> = ({ children }) => {
  return (
    <div className="w-screen h-screen overflow-hidden bg-neutral-950 text-slate-200">{children}</div>
  );
};
