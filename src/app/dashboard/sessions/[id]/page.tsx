'use client';

import { useEffect, useState, use } from 'react';
import { Session, AttendanceSubmission } from '@/types';
import QRDisplay from '@/components/QRDisplay';
import StatsBar from '@/components/StatsBar';
import SubmissionsTable from '@/components/SubmissionsTable';
import FilterBar from '@/components/FilterBar';
import OverrideModal from '@/components/OverrideModal';
import ManualAttendanceModal from '@/components/ManualAttendanceModal';
import EditSessionModal from '@/components/EditSessionModal';
import UpdateSettingsModal from '@/components/UpdateSettingsModal';
import { useRouter } from 'next/navigation';

export default function ActiveSessionPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();

  const [session, setSession] = useState<Session | null>(null);
  const [submissions, setSubmissions] = useState<AttendanceSubmission[]>([]);
  const [qrDataUrl, setQrDataUrl] = useState('');
  const [attendanceUrl, setAttendanceUrl] = useState('');
  const [qrExpiresAt, setQrExpiresAt] = useState<Date | null>(null);
  
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  
  const [searchQuery, setSearchQuery] = useState('');
  const [activeFilter, setActiveFilter] = useState('All');
  
  const [overrideTarget, setOverrideTarget] = useState<AttendanceSubmission | null>(null);
  const [showManualModal, setShowManualModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showSettingsModal, setShowSettingsModal] = useState(false);

  const fetchSessionData = async () => {
    try {
      const res = await fetch(`/api/sessions/${id}`);
      if (!res.ok) throw new Error('Failed to fetch session');
      const response = await res.json();
      if (!response.success) throw new Error(response.error || 'Failed to fetch session');
      setSession(response.data);
      setSubmissions(response.data?.submissions || []);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleEditSession = async (data: Partial<Session>) => {
    try {
      const res = await fetch(`/api/sessions/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      });
      if (res.ok) {
        setShowEditModal(false);
        fetchSessionData();
      } else {
        alert('Failed to update session');
      }
    } catch (err) {
      console.error(err);
      alert('Error updating session');
    }
  };

  const fetchQr = async (forceRotate = false) => {
    if (!session || session.status !== 'active') return;
    try {
      const res = await fetch(`/api/sessions/${id}/qr`, { method: forceRotate ? 'POST' : 'GET' });
      if (res.ok) {
        const response = await res.json();
        if (response.success && response.data) {
          setQrDataUrl(response.data.qrDataUrl);
          setAttendanceUrl(response.data.attendanceUrl);
          setQrExpiresAt(new Date(response.data.expiresAt));
        }
      }
    } catch (err) {
      console.error('Failed to fetch QR');
    }
  };

  useEffect(() => {
    fetchSessionData();
    const interval = setInterval(fetchSessionData, 10000);
    return () => clearInterval(interval);
  }, [id]);

  useEffect(() => {
    if (session && session.status === 'active' && !qrDataUrl) {
      fetchQr();
    }
  }, [session?.id, session?.status]);

  const handleEndSession = async () => {
    if (!confirm('Are you sure you want to end this session? Students will no longer be able to mark attendance.')) return;
    
    try {
      const res = await fetch(`/api/sessions/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'ended' })
      });
      if (res.ok) fetchSessionData();
    } catch (err) {
      console.error(err);
    }
  };

  const handleOverride = async (subId: string, decision: string, riskColor: string, reason: string) => {
    try {
      const res = await fetch(`/api/sessions/${id}/override`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ submissionId: subId, decision, riskColor, reason })
      });
      if (res.ok) {
        setOverrideTarget(null);
        fetchSessionData();
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleManual = async (data: any) => {
    try {
      const res = await fetch(`/api/sessions/${id}/manual`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      });
      if (res.ok) {
        setShowManualModal(false);
        fetchSessionData();
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleExport = () => {
    window.location.href = `/api/sessions/${id}/export`;
  };

  if (loading) return <div className="flex justify-center items-center h-64"><span className="spinner"></span></div>;
  if (error || !session) return <div className="badge-red p-4 rounded">{error || 'Session not found'}</div>;

  const isActive = session.status === 'active';

  const filteredSubmissions = submissions.filter(sub => {
    const matchesSearch = sub.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          sub.enrollmentNumber.toLowerCase().includes(searchQuery.toLowerCase());
    
    let matchesFilter = true;
    if (activeFilter === 'Green') matchesFilter = sub.autoRiskColor === 'green';
    if (activeFilter === 'Orange') matchesFilter = sub.autoRiskColor === 'orange';
    if (activeFilter === 'Red') matchesFilter = sub.autoRiskColor === 'red';
    if (activeFilter === 'Pending') matchesFilter = !sub.facultyDecision || sub.facultyDecision === 'pending';
    if (activeFilter === 'Manual') matchesFilter = !!sub.isManual;

    return matchesSearch && matchesFilter;
  });

  const handleBulkApprove = async (submissionIds: string[]) => {
    try {
      const res = await fetch(`/api/sessions/${id}/override`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ submissionIds, decision: 'approved', riskColor: 'green', reason: 'Bulk admin approval for location cluster' })
      });
      if (res.ok) fetchSessionData();
    } catch (err) {
      console.error(err);
    }
  };

  const handleQuickDecision = async (submissionId: string, decision: string) => {
    try {
      const res = await fetch(`/api/sessions/${id}/override`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ submissionIds: [submissionId], decision, reason: 'Quick decision from table' })
      });
      if (res.ok) fetchSessionData();
    } catch (err) {
      console.error(err);
    }
  };

  const pendingOrFlagged = submissions.filter(s => 
    (!s.facultyDecision || s.facultyDecision === 'pending') && 
    (s.autoRiskColor === 'orange' || s.autoRiskColor === 'red' || (s.distanceFromBase && s.distanceFromBase > 10))
  );

  return (
    <div className="animate-fade-in">
      {/* Top Bar */}
      <button 
        onClick={() => router.push('/dashboard')} 
        className="text-muted hover:text-primary mb-4 flex items-center gap-2 text-sm font-medium transition-colors"
      >
        <span>←</span> Back to Dashboard
      </button>
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <h1 className="text-2xl font-bold">{session.className} - {session.subject}</h1>
            <span className={`badge ${isActive ? 'badge-green' : 'badge-neutral'}`}>
              {isActive && <span className="status-dot active mr-1"></span>}
              {session.status.toUpperCase()}
            </span>
          </div>
          <div className="text-sm text-muted">
            {new Date(session.date).toLocaleDateString()} | Period {session.period} 
            {session.notes && ` | ${session.notes}`}
          </div>
        </div>

        <div className="flex gap-2">
          <button className="btn btn-secondary" onClick={() => setShowEditModal(true)}>Edit Details</button>
          <button className="btn btn-secondary" onClick={handleExport}>Export Excel</button>
          {isActive && (
            <button className="btn btn-danger" onClick={handleEndSession}>End Session</button>
          )}
        </div>
      </div>

      {pendingOrFlagged.length > 0 && (
        <div className="card mb-6 border-l-4 border-amber-500 bg-amber-500/10 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <h4 className="font-bold text-amber-400 flex items-center gap-2 text-base">
              <span>⚠️</span> Location Match Prompt ({pendingOrFlagged.length} Students Flagged)
            </h4>
            <p className="text-xs text-muted mt-1">
              Multiple students are reporting location ~10–30m away from classroom base (GPS drift). Do you want to accept all flagged students for this session?
            </p>
          </div>
          <div className="flex gap-2 shrink-0">
            <button 
              className="btn btn-primary bg-emerald-600 hover:bg-emerald-500 text-white text-xs px-3 py-2"
              onClick={() => handleBulkApprove(pendingOrFlagged.map(s => s.id))}
            >
              ✓ Accept All ({pendingOrFlagged.length})
            </button>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column (QR & Actions) */}
        <div className="lg:col-span-1 space-y-6">
          {isActive && qrExpiresAt && (
            <QRDisplay 
              qrDataUrl={qrDataUrl} 
              attendanceUrl={attendanceUrl}
              expiresAt={qrExpiresAt} 
              onRotate={() => fetchQr(true)} 
              intervalSecs={session.qrRefreshInterval}
            />
          )}

          <div className="card">
            <h3 className="font-semibold mb-4">Quick Actions</h3>
            <button className="btn btn-secondary w-full mb-2" onClick={() => setShowManualModal(true)}>
              + Add Manual Entry
            </button>
            {isActive && (
              <button className="btn btn-ghost w-full" onClick={() => setShowSettingsModal(true)}>
                ⚙️ Update QR/Session Settings
              </button>
            )}
          </div>
        </div>

        {/* Right Column (Stats & Table) */}
        <div className="lg:col-span-2">
          <StatsBar 
            total={submissions.length}
            green={submissions.filter(s => s.autoRiskColor === 'green' && !s.isManual).length}
            orange={submissions.filter(s => s.autoRiskColor === 'orange' && !s.isManual).length}
            red={submissions.filter(s => s.autoRiskColor === 'red' && !s.isManual).length}
            manual={submissions.filter(s => s.isManual).length}
            pending={submissions.filter(s => !s.facultyDecision || s.facultyDecision === 'pending').length}
          />

          <div className="card">
            <FilterBar 
              searchQuery={searchQuery}
              onSearchChange={setSearchQuery}
              activeFilter={activeFilter}
              onFilterChange={setActiveFilter}
            />
            
            <SubmissionsTable 
              submissions={filteredSubmissions}
              onOverrideClick={(sub) => setOverrideTarget(sub)}
              onDecisionChange={handleQuickDecision}
            />
          </div>
        </div>
      </div>

      {overrideTarget && (
        <OverrideModal 
          submission={overrideTarget} 
          onClose={() => setOverrideTarget(null)} 
          onSave={handleOverride} 
        />
      )}

      {showManualModal && (
        <ManualAttendanceModal 
          onClose={() => setShowManualModal(false)}
          onSave={handleManual}
        />
      )}

      {showEditModal && (
        <EditSessionModal
          session={session}
          onClose={() => setShowEditModal(false)}
          onSave={handleEditSession}
        />
      )}
      {showSettingsModal && (
        <UpdateSettingsModal
          session={session}
          onClose={() => setShowSettingsModal(false)}
          onSave={handleEditSession}
        />
      )}
    </div>
  );
}
