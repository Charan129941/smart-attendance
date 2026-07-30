'use client';

import CountdownTimer from './CountdownTimer';

interface QRDisplayProps {
  qrDataUrl: string;
  attendanceUrl?: string;
  expiresAt: Date;
  onRotate: () => void;
  intervalSecs: number;
}

export default function QRDisplay({ qrDataUrl, attendanceUrl, expiresAt, onRotate, intervalSecs }: QRDisplayProps) {
  return (
    <div className="card flex flex-col items-center justify-center">
      <div className="mb-4 text-center">
        <h3 className="font-semibold text-lg">Active QR Code</h3>
        <p className="text-sm text-muted">Scan to mark attendance</p>
      </div>
      
      <div className="bg-white p-4 rounded-xl mb-6 shadow-glow text-center">
        {qrDataUrl ? (
          <>
            <a href={attendanceUrl} target="_blank" rel="noopener noreferrer" title="Click to test attendance">
              <img src={qrDataUrl} alt="Attendance QR Code" className="w-64 h-64 object-contain mx-auto" />
            </a>
            {attendanceUrl && (
              <a href={attendanceUrl} target="_blank" rel="noopener noreferrer" className="text-xs text-blue-500 hover:underline mt-2 inline-block max-w-[250px] truncate">
                {attendanceUrl}
              </a>
            )}
          </>
        ) : (
          <div className="w-64 h-64 flex items-center justify-center bg-gray-100 text-gray-400">
            Generating...
          </div>
        )}
      </div>

      <div className="flex items-center justify-between w-full max-w-xs mb-4">
        <CountdownTimer targetDate={expiresAt} onComplete={onRotate} />
        <div className="text-right">
          <div className="text-sm font-medium">Interval</div>
          <div className="text-xs text-muted">{intervalSecs}s</div>
        </div>
      </div>

      <button onClick={onRotate} className="btn btn-secondary w-full max-w-xs">
        Rotate Now
      </button>
    </div>
  );
}
