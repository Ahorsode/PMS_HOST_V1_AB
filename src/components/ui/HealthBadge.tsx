import React from 'react';

type HealthStatus = 'Healthy' | 'Warning' | 'Critical';

interface HealthBadgeProps {
  status: HealthStatus;
}

export const HealthBadge: React.FC<HealthBadgeProps> = ({ status }) => {
  const getBadgeStyles = () => {
    switch (status) {
      case 'Healthy':
        return 'bg-fg/[0.04] text-fg border-fg/[0.08]';
      case 'Warning':
        return 'bg-fg/[0.04] text-fg border-fg/[0.08]';
      case 'Critical':
        return 'bg-fg/[0.04] text-neg border-fg/[0.08]';
      default:
        return 'bg-fg/10 text-fg/80 border-fg/10';
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
