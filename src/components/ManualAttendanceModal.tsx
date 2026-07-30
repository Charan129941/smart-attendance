'use client';

import { useState } from 'react';

interface ManualAttendanceModalProps {
  onClose: () => void;
  onSave: (data: any) => void;
}

export default function ManualAttendanceModal({ onClose, onSave }: ManualAttendanceModalProps) {
  const [name, setName] = useState('');
  const [enrollment, setEnrollment] = useState('');
  const [status, setStatus] = useState<'present' | 'absent'>('present');
  const [reason, setReason] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave({
      name,
      enrollmentNumber: enrollment,
      status,
      reason
    });
  };

  return (
    <div className="modal-overlay">
      <div className="modal-content">
        <div className="modal-header">
          <h2 className="modal-title">Add Manual Attendance</h2>
          <button className="modal-close" onClick={onClose}>&times;</button>
        </div>
        
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label className="form-label">Student Name</label>
            <input 
              type="text"
              className="form-input"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
            />
          </div>

          <div className="form-group">
            <label className="form-label">Enrollment Number</label>
            <input 
              type="text"
              className="form-input"
              value={enrollment}
              onChange={(e) => setEnrollment(e.target.value)}
              required
            />
          </div>

          <div className="form-group">
            <label className="form-label">Status</label>
            <select 
              className="form-select"
              value={status}
              onChange={(e) => setStatus(e.target.value as any)}
            >
              <option value="present">Present</option>
              <option value="absent">Absent</option>
            </select>
          </div>

          <div className="form-group">
            <label className="form-label">Reason / Remarks</label>
            <input 
              type="text"
              className="form-input"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="e.g. Phone not working"
              required
            />
          </div>

          <div className="flex justify-end gap-2 mt-6">
            <button type="button" className="btn btn-ghost" onClick={onClose}>Cancel</button>
            <button type="submit" className="btn btn-primary">Add Entry</button>
          </div>
        </form>
      </div>
    </div>
  );
}
