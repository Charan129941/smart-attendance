'use client';

import { Session } from '@/types';
import { useRouter } from 'next/navigation';

interface SessionCardProps {
  session: Session;
  onDelete?: () => void;
}

export default function SessionCard({ session, onDelete }: SessionCardProps) {
  const router = useRouter();

  const handleClick = () => {
    router.push(`/dashboard/sessions/${session.id}`);
  };

  const isActive = session.status === 'active';
  
  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString(undefined, {
      month: 'short', day: 'numeric', year: 'numeric'
    });
  };

  return (
    <div className="card card-hover relative group cursor-pointer" onClick={handleClick}>
      {onDelete && (
        <button 
          onClick={(e) => {
            e.stopPropagation();
            onDelete();
          }}
          className="absolute top-4 right-4 text-muted hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity z-10"
          title="Delete Session"
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 6h18"></path><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"></path><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"></path></svg>
        </button>
      )}
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
