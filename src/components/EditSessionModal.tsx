'use client';

import { useState } from 'react';

interface EditSessionModalProps {
  session: {
    id: string;
    className: string;
    section?: string;
    subject: string;
    date: string;
    period: string;
    notes?: string;
  };
  onClose: () => void;
  onSave: (data: { className: string; section: string; subject: string; date: string; period: string; notes: string }) => void;
}

export default function EditSessionModal({ session, onClose, onSave }: EditSessionModalProps) {
  const [formData, setFormData] = useState({
    className: session.className || '',
    section: session.section || '',
    subject: session.subject || '',
    date: session.date || '',
    period: session.period || '',
    notes: session.notes || '',
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave(formData);
  };

  return (
    <div className="modal-overlay">
      <div className="modal-content">
        <div className="modal-header">
          <h2 className="modal-title">Edit Session Details</h2>
          <button className="modal-close" onClick={onClose}>&times;</button>
        </div>
        
        <form onSubmit={handleSubmit}>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="form-group">
              <label className="form-label">Class Name</label>
              <input 
                required 
                className="form-input" 
                value={formData.className} 
                onChange={e => setFormData({...formData, className: e.target.value})} 
                placeholder="e.g. CS-3A" 
              />
            </div>
            <div className="form-group">
              <label className="form-label">Section</label>
              <input 
                className="form-input" 
                value={formData.section} 
                onChange={e => setFormData({...formData, section: e.target.value})} 
                placeholder="e.g. A" 
              />
            </div>
            <div className="form-group">
              <label className="form-label">Subject</label>
              <input 
                required 
                className="form-input" 
                value={formData.subject} 
                onChange={e => setFormData({...formData, subject: e.target.value})} 
                placeholder="e.g. Data Structures" 
              />
            </div>
            <div className="form-group">
              <label className="form-label">Date</label>
              <input 
                type="date" 
                required 
                className="form-input" 
                value={formData.date} 
                onChange={e => setFormData({...formData, date: e.target.value})} 
              />
            </div>
            <div className="form-group">
              <label className="form-label">Period</label>
              <input 
                required 
                className="form-input" 
                value={formData.period} 
                onChange={e => setFormData({...formData, period: e.target.value})} 
              />
            </div>
            <div className="form-group">
              <label className="form-label">Notes</label>
              <input 
                className="form-input" 
                value={formData.notes} 
                onChange={e => setFormData({...formData, notes: e.target.value})} 
                placeholder="Topic or remarks..." 
              />
            </div>
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
