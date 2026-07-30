'use client';

import { useState, useRef } from 'react';

interface LocationCaptureProps {
  targetSamples?: number;
  onCapture: (location: { lat: number; lng: number; accuracy: number }) => void;
  onError: (error: string) => void;
}

export default function LocationCapture({ targetSamples = 5, onCapture, onError }: LocationCaptureProps) {
  const [status, setStatus] = useState<'idle' | 'requesting' | 'capturing' | 'success' | 'error'>('idle');
  const [samplesCount, setSamplesCount] = useState(0);
  const [errorMsg, setErrorMsg] = useState('');
  const [result, setResult] = useState<{ lat: number; lng: number; accuracy: number } | null>(null);
  
  const samplesRef = useRef<{ lat: number; lng: number; accuracy: number }[]>([]);

  const startCapture = () => {
    if (!navigator.geolocation) {
      const err = 'Geolocation is not supported by your browser';
      setErrorMsg(err);
      setStatus('error');
      onError(err);
      return;
    }

    setStatus('requesting');
    setSamplesCount(0);
    samplesRef.current = [];
    setErrorMsg('');
    setResult(null);

    const watchId = navigator.geolocation.watchPosition(
      (position) => {
        setStatus('capturing');
        const newSample = {
          lat: position.coords.latitude,
          lng: position.coords.longitude,
          accuracy: position.coords.accuracy,
        };

        samplesRef.current.push(newSample);
        setSamplesCount(samplesRef.current.length);
        
        if (samplesRef.current.length >= targetSamples) {
          navigator.geolocation.clearWatch(watchId);
          const avgLat = samplesRef.current.reduce((sum, s) => sum + s.lat, 0) / samplesRef.current.length;
          const avgLng = samplesRef.current.reduce((sum, s) => sum + s.lng, 0) / samplesRef.current.length;
          const avgAcc = samplesRef.current.reduce((sum, s) => sum + s.accuracy, 0) / samplesRef.current.length;
          
          const finalResult = { lat: avgLat, lng: avgLng, accuracy: avgAcc };
          setResult(finalResult);
          setStatus('success');
          onCapture(finalResult);
        }
      },
      (error) => {
        navigator.geolocation.clearWatch(watchId);
        setStatus('error');
        let msg = 'Failed to get location';
        if (error.code === error.PERMISSION_DENIED) msg = 'Permission denied';
        setErrorMsg(msg);
        onError(msg);
      },
      { enableHighAccuracy: true, maximumAge: 0, timeout: 10000 }
    );
  };

  return (
    <div className="card text-center">
      <h3 className="mb-4 font-semibold">Location Capture</h3>
      
      {status === 'idle' && (
        <button type="button" className="btn btn-primary" onClick={startCapture}>
          Start Location Capture
        </button>
      )}

      {status === 'requesting' && (
        <div className="text-muted">Requesting permission...</div>
      )}

      {status === 'capturing' && (
        <div>
          <div className="spinner mb-2"></div>
          <div className="text-muted">Capturing samples... ({samplesCount}/{targetSamples})</div>
        </div>
      )}

      {status === 'success' && result && (
        <div className="animate-fade-in">
          <div className="mb-2 text-safe font-semibold">Location captured!</div>
          <div className="text-sm text-muted mb-4">
            Accuracy: ~{result.accuracy.toFixed(1)}m
          </div>
          <div className="flex gap-2 justify-center">
             <button type="button" className="btn btn-secondary" onClick={startCapture}>
               Recapture
             </button>
          </div>
        </div>
      )}

      {status === 'error' && (
        <div className="animate-fade-in">
          <div className="text-danger mb-4">{errorMsg}</div>
          <button type="button" className="btn btn-primary" onClick={startCapture}>
            Retry
          </button>
        </div>
      )}
    </div>
  );
}
