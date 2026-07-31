'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import SessionCard from '@/components/SessionCard';
import { Session } from '@/types';

export default function DashboardHome() {
  const [sessions, setSessions] = useState<Session[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const fetchSessions = async () => {
    try {
      const res = await fetch('/api/sessions');
      if (!res.ok) throw new Error('Failed to fetch sessions');
      const data = await res.json();
      setSessions(data.data || []);
    } catch (err) {
      setError('Error loading sessions.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSessions();
  }, []);

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to permanently delete this session and all its data? This cannot be undone.')) {
      return;
    }
    
    try {
      const res = await fetch(`/api/sessions/${id}`, {
        method: 'DELETE',
      });
      if (res.ok) {
        setSessions(prev => prev.filter(s => s.id !== id));
      } else {
        alert('Failed to delete session');
      }
    } catch (err) {
      console.error(err);
      alert('Error deleting session');
    }
  };

  if (loading) {
    return <div className="flex justify-center items-center h-64"><span className="spinner"></span></div>;
  }

  return (
    <div className="animate-fade-in">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-2xl font-bold">Attendance Sessions</h1>
          <p className="text-muted text-sm mt-1">Manage and monitor your classes</p>
        </div>
        <Link href="/dashboard/sessions/new" className="btn btn-primary">
          + Create New Session
        </Link>
      </div>

      {error && <div className="badge-red p-3 mb-6 rounded">{error}</div>}

      {sessions.length === 0 && !error ? (
        <div className="card text-center p-12">
          <div className="text-muted mb-4">No sessions found.</div>
          <Link href="/dashboard/sessions/new" className="btn btn-secondary">
            Create your first session
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {sessions.map(session => (
            <SessionCard key={session.id} session={session} onDelete={() => handleDelete(session.id)} />
          ))}
        </div>
      )}
    </div>
  );
}
