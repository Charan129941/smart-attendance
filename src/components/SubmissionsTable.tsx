'use client';

import { AttendanceSubmission } from '@/types';
import RiskBadge from './RiskBadge';

interface SubmissionsTableProps {
  submissions: AttendanceSubmission[];
  onOverrideClick: (submission: AttendanceSubmission) => void;
  onDecisionChange?: (submissionId: string, decision: string) => void;
}

export default function SubmissionsTable({ submissions, onOverrideClick, onDecisionChange }: SubmissionsTableProps) {
  const getRelativeTime = (dateString: string) => {
    const rtf = new Intl.RelativeTimeFormat('en', { numeric: 'auto' });
    const diff = new Date().getTime() - new Date(dateString).getTime();
    const diffInMinutes = Math.round(diff / 60000);
    if (diffInMinutes < 1) return 'Just now';
    if (diffInMinutes < 60) return rtf.format(-diffInMinutes, 'minute');
    return rtf.format(-Math.round(diffInMinutes / 60), 'hour');
  };

  if (submissions.length === 0) {
    return (
      <div className="card text-center p-8 text-muted">
        No submissions found.
      </div>
    );
  }

  return (
    <div className="table-container">
      <table>
        <thead>
          <tr>
            <th>Student</th>
            <th>Time</th>
            <th>Location Stats</th>
            <th>System Risk</th>
            <th>Decision</th>
            <th>Action</th>
          </tr>
        </thead>
        <tbody>
          {submissions.map((sub) => (
            <tr key={sub.id}>
              <td>
                <div className="font-semibold">{sub.name}</div>
                <div className="text-xs text-muted">{sub.enrollmentNumber}</div>
              </td>
              <td>{getRelativeTime(sub.serverTimestamp)}</td>
              <td>
                {sub.isManual ? (
                  <span className="text-muted text-xs">Manual Entry</span>
                ) : (
                  <>
                    <div className="text-xs">Dist: {sub.distanceFromBase?.toFixed(1) || '?'}m</div>
                    <div className="text-xs text-muted">Acc: {sub.accuracy?.toFixed(1) || '?'}m</div>
                  </>
                )}
              </td>
              <td>
                <RiskBadge color={sub.autoRiskColor} score={sub.autoRiskScore} />
              </td>
              <td>
                <select 
                  className={`badge cursor-pointer appearance-none outline-none text-center bg-transparent border-0 ${sub.facultyDecision === 'approved' ? 'badge-green' : sub.facultyDecision === 'rejected' ? 'badge-red' : 'badge-neutral'}`}
                  value={sub.facultyDecision || 'pending'}
                  onChange={(e) => onDecisionChange && onDecisionChange(sub.id, e.target.value)}
                  title="Click to change decision"
                >
                  <option value="pending" className="text-black bg-white">Pending</option>
                  <option value="approved" className="text-black bg-white">Approved</option>
                  <option value="rejected" className="text-black bg-white">Rejected</option>
                </select>
              </td>
              <td>
                <button 
                  className="btn btn-secondary" 
                  style={{ padding: '0.25rem 0.5rem', fontSize: '0.75rem' }}
                  onClick={() => onOverrideClick(sub)}
                >
                  Edit
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
