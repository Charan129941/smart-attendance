'use client';

import { useState } from 'react';
import { Session } from '@/types';
import { QR_REFRESH_OPTIONS } from '@/lib/constants';

interface UpdateSettingsModalProps {
  session: Session;
  onClose: () => void;
  onSave: (data: Partial<Session>) => void;
}

export default function UpdateSettingsModal({ session, onClose, onSave }: UpdateSettingsModalProps) {
  const [qrRefreshInterval, setQrRefreshInterval] = useState(session.qrRefreshInterval?.toString() || '15');
  const [sessionDuration, setSessionDuration] = useState(session.sessionDuration?.toString() || '60');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave({ 
      qrRefreshInterval: Number(qrRefreshInterval), 
      sessionDuration: Number(sessionDuration) 
    });
  };

  return (
    <div className="modal-overlay">
      <div className="modal-content max-w-sm">
        <div className="modal-header">
          <h2 className="modal-title">Session Settings</h2>
          <button className="modal-close" onClick={onClose}>&times;</button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="form-group">
            <label className="form-label">QR Refresh Interval (Seconds)</label>
            <select 
              className="form-select" 
              value={qrRefreshInterval} 
              onChange={e => setQrRefreshInterval(e.target.value)}
            >
              {QR_REFRESH_OPTIONS.map(opt => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
              ))}
            </select>
          </div>
          
          <div className="form-group">
            <label className="form-label">Session Duration (Minutes)</label>
            <input 
              type="number" 
              required 
              min="1" 
              className="form-input" 
              value={sessionDuration} 
              onChange={e => setSessionDuration(e.target.value)} 
            />
            <p className="text-xs text-muted mt-1">Extending the duration increases the base risk score for late joiners.</p>
          </div>

          <div className="flex justify-end gap-2 mt-6">
            <button type="button" className="btn btn-ghost" onClick={onClose}>Cancel</button>
            <button type="submit" className="btn btn-primary">Save Changes</button>
          </div>
        </form>
      </div>
    </div>
  );
}
