'use client';

import { useEffect, useState, useMemo } from 'react';
import { Session, AttendanceSubmission } from '@/types';
import QRDisplay from '@/components/QRDisplay';
import StatsBar from '@/components/StatsBar';
import SubmissionsTable from '@/components/SubmissionsTable';
import FilterBar from '@/components/FilterBar';
import OverrideModal from '@/components/OverrideModal';
import ManualAttendanceModal from '@/components/ManualAttendanceModal';
import EditSessionModal from '@/components/EditSessionModal';
import { useRouter } from 'next/navigation';
import { haversineDistance } from '@/lib/geo';

export default function ActiveSessionPage({ params }: { params: Promise<{ id: string }> }) {
  const router = useRouter();

  const [id, setId] = useState<string | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [submissions, setSubmissions] = useState<AttendanceSubmission[]>([]);
  const [qrDataUrl, setQrDataUrl] = useState('');
  const [attendanceUrl, setAttendanceUrl] = useState('');
  const [qrExpiresAt, setQrExpiresAt] = useState<Date | null>(null);
  
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (params instanceof Promise) {
      params.then(p => setId(p.id)).catch(console.error);
    } else {
      setId((params as any).id);
    }
  }, [params]);
  
  const [searchQuery, setSearchQuery] = useState('');
  const [activeFilter, setActiveFilter] = useState('All');
  
  const [overrideTarget, setOverrideTarget] = useState<AttendanceSubmission | null>(null);
  const [showManualModal, setShowManualModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [clusterDismissed, setClusterDismissed] = useState(false);
  const [bulkApproving, setBulkApproving] = useState(false);

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
    if (!id) return;
    fetchSessionData();
    const interval = setInterval(fetchSessionData, 5000);
    return () => clearInterval(interval);
  }, [id]);

  useEffect(() => {
    if (session && session.status === 'active' && !qrDataUrl) {
      fetchQr();
    }
  }, [session]);

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

  const handleEditSession = async (data: { className: string; section: string; subject: string; date: string; period: string; notes: string }) => {
    try {
      const res = await fetch(`/api/sessions/${id}/details`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      });
      if (res.ok) {
        setShowEditModal(false);
        fetchSessionData();
      } else {
        const result = await res.json();
        alert(result.error || 'Failed to update session');
      }
    } catch (err) {
      alert('Failed to update session');
    }
  };

  const handleDeleteSession = async () => {
    if (!confirm('Are you sure you want to permanently delete this session?\n\nThis will remove ALL attendance data, submissions, and records. This cannot be undone.')) return;
    try {
      const res = await fetch(`/api/sessions/${id}`, { method: 'DELETE' });
      if (res.ok) {
        router.push('/dashboard');
      } else {
        const data = await res.json();
        alert(data.error || 'Failed to delete session');
      }
    } catch (err) {
      alert('Failed to delete session');
    }
  };

  // --- Cluster Detection ---
  const clusterInfo = useMemo(() => {
    if (!session || !submissions) return null;

    // Only check non-manual, pending submissions with location data
    const pendingWithLocation = submissions.filter(
      s => !s.isManual && s.latitude && s.longitude && (!s.facultyDecision || s.facultyDecision === 'pending')
    );
    if (pendingWithLocation.length < 3) return null;

    // Simple haversine
    const toRad = (d: number) => d * Math.PI / 180;
    const haversine = (lat1: number, lng1: number, lat2: number, lng2: number) => {
      const R = 6371000;
      const dLat = toRad(lat2 - lat1);
      const dLng = toRad(lng2 - lng1);
      const a = Math.sin(dLat/2)**2 + Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng/2)**2;
      return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    };

    // DBSCAN-lite: cluster within 30m
    const visited = new Set<number>();
    const clusters: typeof pendingWithLocation[] = [];
    for (let i = 0; i < pendingWithLocation.length; i++) {
      if (visited.has(i)) continue;
      const cluster = [pendingWithLocation[i]];
      visited.add(i);
      const queue = [i];
      while (queue.length > 0) {
        const cur = queue.shift()!;
        for (let j = 0; j < pendingWithLocation.length; j++) {
          if (visited.has(j)) continue;
          const dist = haversineDistance(
            pendingWithLocation[cur].latitude!, pendingWithLocation[cur].longitude!,
            pendingWithLocation[j].latitude!, pendingWithLocation[j].longitude!
          );
          if (dist <= 30) {
            visited.add(j);
            cluster.push(pendingWithLocation[j]);
            queue.push(j);
          }
        }
      }
      clusters.push(cluster);
    }

    // Find largest cluster
    clusters.sort((a, b) => b.length - a.length);
    const biggest = clusters[0];
    if (!biggest || biggest.length < 3) return null;

    // Calculate cluster centroid distance from base
    const avgLat = biggest.reduce((s, m) => s + m.latitude!, 0) / biggest.length;
    const avgLng = biggest.reduce((s, m) => s + m.longitude!, 0) / biggest.length;
    const distFromBase = haversineDistance(session.baseLat, session.baseLng, avgLat, avgLng);

    // Only show if the cluster is somewhat far from base (>15m)
    if (distFromBase < 15) return null;

    return {
      count: biggest.length,
      distanceFromBase: Math.round(distFromBase),
      submissionIds: biggest.map(s => s.id),
    };
  }, [submissions, session]);

  if (loading) return <div className="flex justify-center items-center h-64"><span className="spinner"></span></div>;
  if (error || !session) return <div className="badge-red p-4 rounded">{error || 'Session not found'}</div>;

  const isActive = session.status === 'active';



  const handleBulkApprove = async () => {
    if (!clusterInfo) return;
    setBulkApproving(true);
    try {
      const res = await fetch(`/api/sessions/${id}/bulk-approve`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ submissionIds: clusterInfo.submissionIds }),
      });
      if (res.ok) {
        setClusterDismissed(true);
        fetchSessionData();
      } else {
        const data = await res.json();
        alert(data.error || 'Failed to bulk approve');
      }
    } catch (err) {
      alert('Failed to bulk approve');
    } finally {
      setBulkApproving(false);
    }
  };

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

        <div className="flex gap-2 flex-wrap">
          <button className="btn btn-ghost" onClick={() => setShowEditModal(true)}>✏️ Edit</button>
          <button className="btn btn-secondary" onClick={handleExport}>Export Excel</button>
          {isActive && (
            <button className="btn btn-danger" onClick={handleEndSession}>End Session</button>
          )}
          <button className="btn btn-ghost" style={{ color: 'var(--color-danger)' }} onClick={handleDeleteSession}>🗑️ Delete</button>
        </div>
      </div>

      {/* Smart Cluster Alert */}
      {clusterInfo && !clusterDismissed && (
        <div className="mb-6 p-4 rounded-xl" style={{ background: 'linear-gradient(135deg, rgba(59,130,246,0.15), rgba(139,92,246,0.15))', border: '1px solid rgba(59,130,246,0.3)' }}>
          <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <span style={{ fontSize: '1.25rem' }}>📍</span>
                <h3 className="font-bold text-lg" style={{ color: 'var(--text-primary)' }}>Smart Alert: Student Cluster Detected</h3>
              </div>
              <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
                <strong>{clusterInfo.count} students</strong> are grouped together approximately <strong>{clusterInfo.distanceFromBase}m</strong> from your base location. 
                This usually means the initial GPS lock was slightly off but students are in the classroom. 
                Their risk colors will stay the same — only the attendance decision will be set to <strong>Approved</strong>.
              </p>
            </div>
            <div className="flex gap-2 shrink-0">
              <button 
                className="btn btn-primary" 
                onClick={handleBulkApprove}
                disabled={bulkApproving}
              >
                {bulkApproving ? <span className="spinner"></span> : `✅ Accept All ${clusterInfo.count}`}
              </button>
              <button 
                className="btn btn-ghost" 
                onClick={() => setClusterDismissed(true)}
              >
                Dismiss
              </button>
            </div>
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
          </div>
        </div>

        {/* Right Column (Stats & Table) */}
        <div className="lg:col-span-2">
          <StatsBar 
            total={session.totalSubmissions}
            green={session.greenCount}
            orange={session.orangeCount}
            red={session.redCount}
            manual={session.manualCount}
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
              onOverrideClick={setOverrideTarget}
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

      {showEditModal && session && (
        <EditSessionModal
          session={{
            id: session.id,
            className: session.className,
            section: session.section,
            subject: session.subject,
            date: session.date,
            period: session.period,
            notes: session.notes || '',
          }}
          onClose={() => setShowEditModal(false)}
          onSave={handleEditSession}
        />
      )}
    </div>
  );
}
