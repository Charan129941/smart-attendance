import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import CountdownTimer from './CountdownTimer';

interface QRDisplayProps {
  qrDataUrl: string;
  attendanceUrl?: string;
  expiresAt: Date;
  onRotate: () => void;
  intervalSecs: number;
}

export default function QRDisplay({ qrDataUrl, attendanceUrl, expiresAt, onRotate, intervalSecs }: QRDisplayProps) {
  const [isFullscreen, setIsFullscreen] = useState(false);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setIsFullscreen(false);
      }
    };
    if (isFullscreen) {
      document.addEventListener('keydown', handleKeyDown);
      document.body.style.overflow = 'hidden';
    } else {
      document.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = '';
    }
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = '';
    };
  }, [isFullscreen]);

  return (
    <>
      <div className="card flex flex-col items-center justify-center relative">
        <button 
          onClick={() => setIsFullscreen(true)}
          className="absolute top-4 right-4 text-muted hover:text-primary"
          title="Projector Mode (Full Screen)"
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M8 3H5a2 2 0 0 0-2 2v3m18 0V5a2 2 0 0 0-2-2h-3m0 18h3a2 2 0 0 0 2-2v-3M3 16v3a2 2 0 0 0 2 2h3"></path>
          </svg>
        </button>

        <div className="mb-4 text-center">
          <h3 className="font-semibold text-lg">Active QR Code</h3>
          <p className="text-sm text-muted">Scan to mark attendance</p>
        </div>
        
        <div className="bg-white p-4 rounded-xl mb-6 shadow-glow text-center cursor-pointer" onClick={() => setIsFullscreen(true)}>
          {qrDataUrl ? (
            <>
              <img src={qrDataUrl} alt="Attendance QR Code" className="w-64 h-64 object-contain mx-auto" />
              {attendanceUrl && (
                <div className="text-xs text-blue-500 hover:underline mt-2 inline-block max-w-[250px] truncate">
                  {attendanceUrl}
                </div>
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

      {isFullscreen && typeof window !== 'undefined' && createPortal(
        <div className="fixed inset-0 z-[9999] flex flex-col items-center justify-center p-8 bg-[#0a0f1e]">
          <button 
            onClick={() => setIsFullscreen(false)}
            className="absolute top-8 left-8 text-white hover:text-gray-300 bg-gray-800 bg-opacity-50 rounded-full px-6 py-3 transition-colors flex items-center gap-2 font-medium"
          >
            <span>←</span> Back
          </button>

          <button 
            onClick={() => setIsFullscreen(false)}
            className="absolute top-8 right-8 text-white hover:text-gray-300 bg-gray-800 bg-opacity-50 rounded-full p-3 transition-colors"
            title="Exit Projector Mode"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M8 3v3a2 2 0 0 1-2 2H3m18 0h-3a2 2 0 0 1-2-2V3m0 18v-3a2 2 0 0 1 2-2h3M3 16h3a2 2 0 0 1 2 2v3"></path>
            </svg>
          </button>
          
          <h2 className="text-4xl font-bold text-white mb-2 text-center">Scan to Mark Attendance</h2>
          <p className="text-xl text-gray-400 mb-12 text-center">Please stay in your seats. The code refreshes automatically.</p>
          
          <div className="bg-white p-8 rounded-3xl shadow-[0_0_50px_rgba(59,130,246,0.3)] mb-12">
            {qrDataUrl ? (
              <img src={qrDataUrl} alt="Attendance QR Code" className="w-[500px] h-[500px] object-contain max-w-[80vw] max-h-[50vh]" />
            ) : (
              <div className="w-[500px] h-[500px] max-w-[80vw] max-h-[50vh] flex items-center justify-center text-gray-400 text-2xl">
                Generating...
              </div>
            )}
          </div>
          
          <div className="flex items-center gap-8 bg-gray-900 rounded-full px-8 py-4 border border-gray-800">
            <div className="scale-150 transform origin-left">
              <CountdownTimer targetDate={expiresAt} onComplete={onRotate} />
            </div>
            <div className="w-px h-12 bg-gray-800"></div>
            <button onClick={onRotate} className="text-gray-400 hover:text-white transition-colors flex items-center gap-2">
              <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/><path d="M3 3v5h5"/></svg>
              Rotate Now
            </button>
          </div>
        </div>,
        document.body
      )}
    </>
  );
}
