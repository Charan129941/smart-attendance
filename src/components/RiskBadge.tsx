'use client';

import { RiskColor } from '@/types';

interface RiskBadgeProps {
  color: RiskColor;
  score?: number;
  size?: 'sm' | 'md';
}

export default function RiskBadge({ color, score, size = 'md' }: RiskBadgeProps) {
  const badgeClass = `badge badge-${color.toLowerCase()}`;
  const padding = size === 'sm' ? '0.125rem 0.375rem' : '0.25rem 0.5rem';
  const fontSize = size === 'sm' ? '0.65rem' : '0.75rem';

  return (
    <span className={badgeClass} style={{ padding, fontSize }}>
      {color.charAt(0).toUpperCase() + color.slice(1)}
      {score !== undefined && ` (${score})`}
    </span>
  );
}
