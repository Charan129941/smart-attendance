'use client';

import { useState } from 'react';
import { AttendanceSubmission, RiskColor } from '@/types';

interface OverrideModalProps {
  submission: AttendanceSubmission;
  onClose: () => void;
  onSave: (id: string, decision: 'approved' | 'rejected' | 'pending', riskColor: RiskColor, reason: string) => void;
}

export default function OverrideModal({ submission, onClose, onSave }: OverrideModalProps) {
  const [decision, setDecision] = useState<'approved' | 'rejected' | 'pending'>(submission.facultyDecision || 'pending');
  const [riskColor, setRiskColor] = useState<RiskColor>(submission.autoRiskColor);
  const [reason, setReason] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave(submission.id, decision, riskColor, reason);
  };

  return (
    <div className="modal-overlay">
      <div className="modal-content">
        <div className="modal-header">
          <h2 className="modal-title">Override Attendance</h2>
          <button className="modal-close" onClick={onClose}>&times;</button>
        </div>
        
        <div className="mb-4 p-3 bg-secondary rounded text-sm" style={{ backgroundColor: 'var(--bg-secondary)', borderRadius: 'var(--radius-sm)' }}>
          <div><strong>Student:</strong> {submission.name} ({submission.enrollmentNumber})</div>
          <div><strong>Auto Risk:</strong> {submission.autoRiskColor} ({submission.autoRiskScore})</div>
          <div><strong>Distance:</strong> {submission.distanceFromBase ? `${submission.distanceFromBase.toFixed(2)}m` : 'N/A'}</div>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label className="form-label">Update Risk Color</label>
            <select 
              className="form-select"
              value={riskColor}
              onChange={(e) => setRiskColor(e.target.value as RiskColor)}
            >
              <option value="GREEN">Green (Safe)</option>
              <option value="ORANGE">Orange (Warning)</option>
              <option value="RED">Red (Danger)</option>
            </select>
          </div>

          <div className="form-group">
            <label className="form-label">Faculty Decision</label>
            <select 
              className="form-select"
              value={decision}
              onChange={(e) => setDecision(e.target.value as any)}
            >
              <option value="pending">Pending</option>
              <option value="approved">Approved (Present)</option>
              <option value="rejected">Rejected (Absent)</option>
            </select>
          </div>

          <div className="form-group">
            <label className="form-label">Reason / Remarks</label>
            <input 
              type="text"
              className="form-input"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="e.g. Verified manually"
              required
            />
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
