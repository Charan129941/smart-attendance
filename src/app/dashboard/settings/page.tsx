'use client';

import { useSession } from 'next-auth/react';
import { DEFAULT_RISK_THRESHOLDS } from '@/lib/constants';

export default function SettingsPage() {
  const { data: session } = useSession();

  return (
    <div className="max-w-2xl mx-auto animate-fade-in">
      <h1 className="text-2xl font-bold mb-6">Settings</h1>
      
      <div className="card mb-6">
        <h2 className="text-lg font-semibold mb-4 border-b border-border-color pb-2">Profile Information</h2>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <div className="text-sm text-muted">Name</div>
            <div>{session?.user?.name || 'Faculty Member'}</div>
          </div>
          <div>
            <div className="text-sm text-muted">Email</div>
            <div>{session?.user?.email}</div>
          </div>
        </div>
      </div>

      <div className="card">
        <h2 className="text-lg font-semibold mb-4 border-b border-border-color pb-2">System Defaults</h2>
        <p className="text-sm text-muted mb-4">These thresholds are used as defaults when creating a new session.</p>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="form-group">
            <label className="form-label">Default Green Threshold (meters)</label>
            <input type="number" disabled className="form-input opacity-50" value={DEFAULT_RISK_THRESHOLDS.greenMaxMeters} />
          </div>
          <div className="form-group">
            <label className="form-label">Default Orange Threshold (meters)</label>
            <input type="number" disabled className="form-input opacity-50" value={DEFAULT_RISK_THRESHOLDS.orangeMaxMeters} />
          </div>
        </div>
        
        <div className="mt-4 p-3 badge-neutral rounded text-sm">
          To change these defaults, contact the system administrator.
        </div>
      </div>
    </div>
  );
}
