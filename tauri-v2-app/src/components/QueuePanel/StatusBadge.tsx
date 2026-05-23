import { memo } from 'react';
import { AlertCircle, CheckCircle2, Clock, Loader2 } from 'lucide-react';
import { formatTime } from '../../lib/formatTime';

interface StatusBadgeProps {
  status: string;
  progress: number;
  eta?: number;
}

export const StatusBadge = memo(function StatusBadge({ status, progress, eta }: StatusBadgeProps) {
  const config = {
    pending: {
      color: 'text-gray-400 bg-gray-500/10 border-gray-500/30',
      icon: Clock,
      label: 'Pending',
    },
    converting: {
      color: 'text-indigo-400 bg-indigo-500/10 border-indigo-500/30',
      icon: Loader2,
      label: `${Math.round(progress)}%${eta && eta > 0 ? ` · ${formatTime(eta)}` : ''}`,
    },
    completed: {
      color: 'text-green-400 bg-green-500/10 border-green-500/30',
      icon: CheckCircle2,
      label: 'Done',
    },
    error: {
      color: 'text-red-400 bg-red-500/10 border-red-500/30',
      icon: AlertCircle,
      label: 'Error',
    },
    cancelled: {
      color: 'text-gray-400 bg-gray-500/10 border-gray-500/30',
      icon: AlertCircle,
      label: 'Cancelled',
    },
  }[status] ?? {
    color: 'text-gray-400 bg-gray-500/10 border-gray-500/30',
    icon: Clock,
    label: 'Unknown',
  };

  const Icon = config.icon;

  return (
    <span className={`status-badge border ${config.color}`}>
      <Icon size={12} className={status === 'converting' ? 'animate-spin' : ''} />
      {config.label}
    </span>
  );
});
