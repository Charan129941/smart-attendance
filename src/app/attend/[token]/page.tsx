'use client';

import { useEffect, useState, use } from 'react';
import { STUDENT_FEEDBACK } from '@/lib/constants';
import { RiskColor } from '@/types';

export default function StudentAttendancePage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = use(params);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [sessionInfo, setSessionInfo] = useState<{className: string, subject: string, period: number} | null>(null);
  
  const [name, setName] = useState('');
  const [enrollment, setEnrollment] = useState('');
  
  const [locationStatus, setLocationStatus] = useState<'requesting' | 'capturing' | 'success' | 'error'>('requesting');
  const [location, setLocation] = useState<{lat: number, lng: number, accuracy: number} | null>(null);
  
  const [submitting, setSubmitting] = useState(false);
  const [feedback, setFeedback] = useState<{color: RiskColor, title: string, message: string, icon: string} | null>(null);
  const [idempotencyKey, setIdempotencyKey] = useState('');

  // 1. Validate Token on Mount
  useEffect(() => {
    setIdempotencyKey(Math.random().toString(36).substring(2) + Date.now().toString(36));
    
    const validateToken = async () => {
      try {
        const res = await fetch(`/api/attend/validate?token=${encodeURIComponent(token)}`);
        if (!res.ok) {
          throw new Error('This QR code has expired. Please ask your faculty to show the latest QR code and scan again.');
        }
        const data = await res.json();
        setSessionInfo(data.sessionInfo);
        
        // Start location capture immediately after validation
        startLocationCapture();
      } catch (err: any) {
        setError(err.message || 'Invalid or expired QR code.');
      } finally {
        setLoading(false);
      }
    };
    
    validateToken();
  }, [token]);

  // 2. Background Location Capture
  const startLocationCapture = () => {
    if (!navigator.geolocation) {
      setLocationStatus('error');
      return;
    }
    
    setLocationStatus('capturing');
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setLocation({
          lat: pos.coords.latitude,
          lng: pos.coords.longitude,
          accuracy: pos.coords.accuracy
        });
        setLocationStatus('success');
      },
      (err) => {
        console.error(err);
        setLocationStatus('error');
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!location) return;
    
    setSubmitting(true);
    try {
      const res = await fetch('/api/attend', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          token,
          name,
          enrollmentNumber: enrollment,
          latitude: location.lat,
          longitude: location.lng,
          accuracy: location.accuracy,
          browserTimestamp: Date.now(),
          userAgent: navigator.userAgent,
          idempotencyKey
        })
      });
      
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || data.message || 'Failed to submit attendance');
      }
      
      const result = await res.json();
      const fb = STUDENT_FEEDBACK[result.riskColor as RiskColor];
      setFeedback({
        color: result.riskColor,
        title: fb?.title || 'Attendance Recorded',
        message: fb?.message || 'Your attendance has been recorded.',
        icon: fb?.icon || '✅',
      });
      
    } catch (err: any) {
      alert(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-primary p-4">
        <div className="spinner"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-primary p-4">
        <div className="card text-center max-w-sm w-full">
          <div className="text-4xl mb-4">⚠️</div>
          <h2 className="text-xl font-bold mb-2 text-danger">Invalid Link</h2>
          <p className="text-muted mb-6">{error}</p>
          <button className="btn btn-secondary w-full" onClick={() => window.location.reload()}>
            Retry
          </button>
        </div>
      </div>
    );
  }

  if (feedback) {
    const bg = feedback.color === 'green' ? 'var(--color-safe-bg)' : 
               feedback.color === 'orange' ? 'var(--color-warn-bg)' : 'var(--color-danger-bg)';
    const color = feedback.color === 'green' ? 'var(--color-safe)' : 
                  feedback.color === 'orange' ? 'var(--color-warn)' : 'var(--color-danger)';

    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-primary p-4 text-center">
        <div className="card max-w-sm w-full animate-fade-in" style={{ backgroundColor: bg, borderColor: color }}>
          <div className="text-5xl mb-4">{feedback.icon}</div>
          <h2 className="text-2xl font-bold mb-2" style={{ color }}>{feedback.title}</h2>
          <p className="text-lg font-medium mb-2">{feedback.message}</p>
          <p className="text-sm text-muted mt-4">Your attendance for {sessionInfo?.subject} has been recorded.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-primary flex flex-col p-4 md:items-center md:justify-center">
      <div className="card w-full max-w-md mx-auto animate-slide-up">
        <h1 className="text-xl font-bold mb-1 text-center">Mark Your Attendance</h1>
        
        {sessionInfo && (
          <div className="text-center text-sm text-muted mb-6 pb-4 border-b border-border-color">
            {sessionInfo.className} • {sessionInfo.subject} • Period {sessionInfo.period}
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label className="form-label">Full Name</label>
            <input 
              type="text" 
              className="form-input" 
              required 
              value={name} 
              onChange={e => setName(e.target.value)}
              placeholder="e.g. John Doe"
            />
          </div>

          <div className="form-group mb-6">
            <label className="form-label">Enrollment Number</label>
            <input 
              type="text" 
              className="form-input" 
              required 
              value={enrollment} 
              onChange={e => setEnrollment(e.target.value)}
              placeholder="e.g. 12345678"
            />
          </div>

          <div className="mb-6 p-3 rounded-lg text-sm bg-secondary">
            {locationStatus === 'requesting' || locationStatus === 'capturing' ? (
              <div className="flex items-center gap-3"><span className="spinner" style={{ width: '16px', height: '16px', borderWidth: '2px' }}></span> <span>Locating you...</span></div>
            ) : locationStatus === 'success' ? (
              <div className="flex items-center gap-3"><span className="text-safe text-lg">✓</span> <span>Location verified</span></div>
            ) : (
              <div>
                <div className="flex items-center gap-3 mb-2"><span className="text-danger text-lg">✕</span> <span className="text-danger">Location access denied or failed.</span></div>
                <button 
                  type="button"
                  onClick={startLocationCapture}
                  className="btn btn-secondary w-full text-sm py-2"
                >
                  🔄 Retry Location Access
                </button>
              </div>
            )}
          </div>

          <button 
            type="submit" 
            className="btn btn-primary w-full py-3 text-lg"
            disabled={submitting || locationStatus !== 'success'}
          >
            {submitting ? <span className="spinner"></span> : 'Submit Attendance'}
          </button>
        </form>
      </div>
    </div>
  );
}
