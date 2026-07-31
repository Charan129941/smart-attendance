'use client';

import { useState } from 'react';
import { Session } from '@/types';

interface EditSessionModalProps {
  session: Session;
  onClose: () => void;
  onSave: (data: Partial<Session>) => void;
}

export default function EditSessionModal({ session, onClose, onSave }: EditSessionModalProps) {
  const [className, setClassName] = useState(session.className || '');
  const [subject, setSubject] = useState(session.subject || '');
  const [section, setSection] = useState(session.section || '');
  const [date, setDate] = useState(session.date || '');
  const [period, setPeriod] = useState(session.period || '');
  const [notes, setNotes] = useState(session.notes || '');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave({ className, subject, section, date, period, notes });
  };

  return (
    <div className="modal-overlay">
      <div className="modal-content max-w-lg">
        <div className="modal-header">
          <h2 className="modal-title">Edit Session Details</h2>
          <button className="modal-close" onClick={onClose}>&times;</button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="form-group">
              <label className="form-label">Class Name</label>
              <input
                type="text"
                className="form-input"
                value={className}
                onChange={(e) => setClassName(e.target.value)}
                required
              />
            </div>
            <div className="form-group">
              <label className="form-label">Section</label>
              <input
                type="text"
                className="form-input"
                value={section}
                onChange={(e) => setSection(e.target.value)}
                required
              />
            </div>
          </div>

          <div className="form-group">
            <label className="form-label">Subject</label>
            <input
              type="text"
              className="form-input"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="form-group">
              <label className="form-label">Date (YYYY-MM-DD)</label>
              <input
                type="text"
                className="form-input"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                required
              />
            </div>
            <div className="form-group">
              <label className="form-label">Period</label>
              <input
                type="text"
                className="form-input"
                value={period}
                onChange={(e) => setPeriod(e.target.value)}
                required
              />
            </div>
          </div>

          <div className="form-group">
            <label className="form-label">Notes (Optional)</label>
            <input
              type="text"
              className="form-input"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
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
