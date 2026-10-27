import React, { ReactNode } from 'react';

interface StandardCardProps {
  children: ReactNode;
  header?: ReactNode;
  className?: string;
  innerClassName?: string;
}

export function StandardCard({
  children,
  header,
  className = '',
  innerClassName = '',
}: StandardCardProps) {
  return (
    <div
      className={`bg-[#F4F2F0] rounded-[22px] p-[10px] sm:p-[12px] pb-[16px] flex flex-col gap-3 animate-fade-in ${className}`}
    >
      {header && <div className="px-2 pt-1">{header}</div>}
      <div
        className={`bg-white rounded-[16px] border border-[#E5E7EB] w-full flex-1 p-4 sm:p-5 md:p-6 shadow-2xs ${innerClassName}`}
      >
        {children}
      </div>
    </div>
  );
}
