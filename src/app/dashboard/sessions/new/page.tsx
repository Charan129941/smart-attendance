'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import LocationCapture from '@/components/LocationCapture';
import { QR_REFRESH_OPTIONS } from '@/lib/constants';

export default function CreateSessionPage() {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Form State
  const [formData, setFormData] = useState({
    className: '',
    section: '',
    subject: '',
    date: new Date().toISOString().split('T')[0],
    period: '1',
    notes: '',
    refreshInterval: '15',
    duration: '60',
    greenThreshold: '30',
    orangeThreshold: '100',
  });

  const [location, setLocation] = useState<{lat: number, lng: number, accuracy: number} | null>(null);

  const handleNext = (e: React.FormEvent) => {
    e.preventDefault();
    setStep(step + 1);
  };

  const handleBack = () => setStep(step - 1);

  const handleSubmit = async () => {
    if (!location) {
      setError('Location capture is required');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const payload = {
        className: formData.className,
        section: formData.section,
        subject: formData.subject,
        date: formData.date,
        period: formData.period,
        notes: formData.notes,
        config: {
          qrRefreshInterval: parseInt(formData.refreshInterval),
          sessionDuration: parseInt(formData.duration),
          riskThresholds: {
            green: parseInt(formData.greenThreshold),
            orange: parseInt(formData.orangeThreshold)
          }
        },
        baseLat: location.lat,
        baseLng: location.lng,
        baseAccuracy: location.accuracy
      };

      const res = await fetch('/api/sessions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      const resData = await res.json();
      if (!res.ok || !resData.success) throw new Error(resData.error || 'Failed to create session');

      router.push(`/dashboard/sessions/${resData.data.sessionId}`);
    } catch (err: any) {
      setError(err.message || 'Something went wrong');
      setLoading(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto">
      <div className="mb-8">
        <h1 className="text-2xl font-bold mb-2">Create New Session</h1>
        <div className="flex gap-2 text-sm">
          <div className={`px-3 py-1 rounded-full ${step >= 1 ? 'bg-accent text-white' : 'bg-secondary text-muted'}`}>1. Details</div>
          <div className={`px-3 py-1 rounded-full ${step >= 2 ? 'bg-accent text-white' : 'bg-secondary text-muted'}`}>2. Config</div>
          <div className={`px-3 py-1 rounded-full ${step >= 3 ? 'bg-accent text-white' : 'bg-secondary text-muted'}`}>3. Location</div>
        </div>
      </div>

      {error && <div className="mb-6 p-3 badge-red rounded">{error}</div>}

      <div className="card animate-fade-in">
        {step === 1 && (
          <form onSubmit={handleNext}>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="form-group">
                <label className="form-label">Class Name</label>
                <input required className="form-input" value={formData.className} onChange={e => setFormData({...formData, className: e.target.value})} placeholder="e.g. CS-3A" />
              </div>
              <div className="form-group">
                <label className="form-label">Section (Optional)</label>
                <input className="form-input" value={formData.section} onChange={e => setFormData({...formData, section: e.target.value})} placeholder="e.g. A" />
              </div>
              <div className="form-group">
                <label className="form-label">Subject</label>
                <input required className="form-input" value={formData.subject} onChange={e => setFormData({...formData, subject: e.target.value})} placeholder="e.g. Data Structures" />
              </div>
              <div className="form-group">
                <label className="form-label">Date</label>
                <input type="date" required className="form-input" value={formData.date} onChange={e => setFormData({...formData, date: e.target.value})} />
              </div>
              <div className="form-group">
                <label className="form-label">Period</label>
                <input type="number" min="1" required className="form-input" value={formData.period} onChange={e => setFormData({...formData, period: e.target.value})} />
              </div>
              <div className="form-group md:col-span-2">
                <label className="form-label">Notes (Optional)</label>
                <input className="form-input" value={formData.notes} onChange={e => setFormData({...formData, notes: e.target.value})} placeholder="Topic or remarks..." />
              </div>
            </div>
            <div className="flex justify-end mt-6">
              <button type="submit" className="btn btn-primary">Next Step</button>
            </div>
          </form>
        )}

        {step === 2 && (
          <form onSubmit={handleNext}>
            <div className="grid grid-cols-1 gap-4">
              <div className="form-group">
                <label className="form-label">QR Refresh Interval (Seconds)</label>
                <select className="form-select" value={formData.refreshInterval} onChange={e => setFormData({...formData, refreshInterval: e.target.value})}>
                  {QR_REFRESH_OPTIONS.map(opt => (
                    <option key={opt.value} value={opt.value}>{opt.label}</option>
                  ))}
                </select>
              </div>
              <div className="form-group">
                <label className="form-label">Session Duration (Minutes)</label>
                <input type="number" required min="1" className="form-input" value={formData.duration} onChange={e => setFormData({...formData, duration: e.target.value})} />
              </div>
              <div className="form-group">
                <label className="form-label">Green Zone Threshold (meters)</label>
                <input type="number" required min="1" className="form-input" value={formData.greenThreshold} onChange={e => setFormData({...formData, greenThreshold: e.target.value})} />
                <span className="text-xs text-muted mt-1 inline-block">Students within this radius are marked Safe (Green).</span>
              </div>
              <div className="form-group">
                <label className="form-label">Orange Zone Threshold (meters)</label>
                <input type="number" required min="1" className="form-input" value={formData.orangeThreshold} onChange={e => setFormData({...formData, orangeThreshold: e.target.value})} />
                <span className="text-xs text-muted mt-1 inline-block">Students within this radius are marked Warning (Orange).</span>
              </div>
            </div>
            <div className="flex justify-between mt-6">
              <button type="button" className="btn btn-ghost" onClick={handleBack}>Back</button>
              <button type="submit" className="btn btn-primary">Next Step</button>
            </div>
          </form>
        )}

        {step === 3 && (
          <div>
            <div className="mb-6">
              <p className="text-sm text-muted mb-4">
                We need to capture the classroom location to verify student proximity. Please stand near the center of the classroom.
              </p>
              <LocationCapture 
                targetSamples={3} 
                onCapture={(loc) => setLocation(loc)} 
                onError={(err) => setError(err)} 
              />
            </div>
            <div className="flex justify-between mt-6">
              <button type="button" className="btn btn-ghost" onClick={handleBack} disabled={loading}>Back</button>
              <button 
                type="button" 
                className="btn btn-primary" 
                onClick={handleSubmit} 
                disabled={!location || loading}
              >
                {loading ? <span className="spinner"></span> : 'Create Session'}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
