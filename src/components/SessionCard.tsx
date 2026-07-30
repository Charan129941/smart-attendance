'use client';

import { Session } from '@/types';
import { useRouter } from 'next/navigation';

interface SessionCardProps {
  session: Session;
  onDelete?: (id: string) => void;
}

export default function SessionCard({ session, onDelete }: SessionCardProps) {
  const router = useRouter();

  const handleClick = () => {
    router.push(`/dashboard/sessions/${session.id}`);
  };

  const handleDelete = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (confirm(`Are you sure you want to permanently delete the session "${session.className} - ${session.subject}"?\n\nThis will remove ALL attendance data, submissions, and records for this session. This cannot be undone.`)) {
      onDelete?.(session.id);
    }
  };

  const isActive = session.status === 'active';
  
  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString(undefined, {
      month: 'short', day: 'numeric', year: 'numeric'
    });
  };

  return (
    <div className="card card-hover relative" onClick={handleClick}>
      <button 
        onClick={handleDelete}
        className="absolute top-3 right-3 text-muted hover:text-red-400 transition-colors p-1 rounded-md hover:bg-red-500/10"
        title="Delete Session"
      >
        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <line x1="18" y1="6" x2="6" y2="18"></line>
          <line x1="6" y1="6" x2="18" y2="18"></line>
        </svg>
      </button>

      <div className="flex justify-between items-start mb-4 pr-6">
        <div>
          <h3 className="font-bold text-lg">{session.className}</h3>
          <div className="text-sm text-muted">{session.subject}</div>
        </div>
        <div className="flex items-center gap-2">
          {isActive && <span className="status-dot active"></span>}
          <span className={`badge ${isActive ? 'badge-green' : 'badge-neutral'}`}>
            {session.status.toUpperCase()}
          </span>
        </div>
      </div>
      
      <div className="flex justify-between text-sm text-muted mb-4">
        <div>{formatDate(session.date)}</div>
        <div>Period {session.period}</div>
      </div>

      <div className="flex gap-4 pt-4" style={{ borderTop: '1px solid var(--border-color)' }}>
        <div className="flex items-center gap-1">
          <span className="status-dot" style={{ backgroundColor: 'var(--color-safe)' }}></span>
          <span className="text-sm">{session.greenCount || 0}</span>
        </div>
        <div className="flex items-center gap-1">
          <span className="status-dot" style={{ backgroundColor: 'var(--color-warn)' }}></span>
          <span className="text-sm">{session.orangeCount || 0}</span>
        </div>
        <div className="flex items-center gap-1">
          <span className="status-dot" style={{ backgroundColor: 'var(--color-danger)' }}></span>
          <span className="text-sm">{session.redCount || 0}</span>
        </div>
      </div>
    </div>
  );
}

