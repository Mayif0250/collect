import React from 'react';
import { LucideIcon } from 'lucide-react';

interface MetricCardProps {
  title: string;
  value: string | number;
  icon: LucideIcon;
  iconBgColor?: string;
  iconColor?: string;
  subtitle?: React.ReactNode;
  badge?: React.ReactNode;
  delay?: number;
  className?: string;
}

export function MetricCard({
  title,
  value,
  icon: Icon,
  iconBgColor = '#F3F4F6',
  iconColor = '#1A1A1A',
  subtitle,
  badge,
  delay = 0,
  className = '',
}: MetricCardProps) {
  return (
    <div
      className={`bg-[#F4F2F0] rounded-[22px] p-[8px] pb-[14px] flex flex-col gap-[8px] animate-card-entrance hover-card-effect ${className}`}
      style={{ animationDelay: `${delay}ms` }}
    >
      {/* White Inner Card */}
      <div className="bg-white border border-[#E5E7EB] rounded-[16px] w-full px-4 sm:px-5 py-4 shadow-2xs">
        <div className="flex items-center gap-3.5 sm:gap-4">
          {/* Icon Box */}
          <div
            className="w-11 h-11 rounded-[12px] flex items-center justify-center shrink-0 transition-transform duration-200"
            style={{ backgroundColor: iconBgColor }}
          >
            <Icon className="w-5 h-5" style={{ color: iconColor }} />
          </div>

          {/* Text Information */}
          <div className="flex-1 flex flex-col gap-0.5 min-w-0">
            <div className="flex items-center justify-between gap-1.5">
              <p className="text-[12px] sm:text-[13px] font-medium text-[#6B7280] truncate">
                {title}
              </p>
              {badge && <div className="shrink-0">{badge}</div>}
            </div>
            <p className="text-[22px] sm:text-[26px] font-bold text-[#1A1A1A] font-mono leading-tight truncate">
              {value}
            </p>
          </div>
        </div>
      </div>

      {/* Subtitle / Details Footer */}
      {subtitle && (
        <div className="flex items-center justify-between px-2 text-[11px] font-medium text-[#7A7772]">
          {subtitle}
        </div>
      )}
    </div>
  );
}
