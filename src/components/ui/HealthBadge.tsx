import React from 'react';

type HealthStatus = 'Healthy' | 'Warning' | 'Critical';

interface HealthBadgeProps {
  status: HealthStatus;
}

export const HealthBadge: React.FC<HealthBadgeProps> = ({ status }) => {
  const getBadgeStyles = () => {
    switch (status) {
      case 'Healthy':
        return 'bg-white/[0.04] text-[#ededed] border-white/[0.08]';
      case 'Warning':
        return 'bg-white/[0.04] text-[#ededed] border-white/[0.08]';
      case 'Critical':
        return 'bg-white/[0.04] text-[#f2777b] border-white/[0.08]';
      default:
        return 'bg-white/10 text-white/80 border-white/10';
    }
  };

  return (
    <span
      className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium border transition-colors duration-300 ${getBadgeStyles()}`}
    >
      <span className="w-1.5 h-1.5 rounded-full bg-current mr-2" />
      {status}
    </span>
  );
};
