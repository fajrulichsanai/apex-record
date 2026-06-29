'use client';

import { useCallback, useEffect, useState } from 'react';
import { queuesApi, QueueItem } from '@/lib/queues';
import { ApiError } from '@/lib/api-client';
import '../../../styles/antrian.css';

export default function AntarianDisplayPage() {
  const [queues, setQueues] = useState<QueueItem[]>([]);
  const [loading, setLoading] = useState(true);

  const today = new Date().toISOString().split('T')[0];

  const loadQueues = useCallback(async () => {
    try {
      const res = await queuesApi.list({ date: today });
      setQueues(res.data);
    } catch (err) {
      console.error('Failed to load queues:', err instanceof ApiError ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  }, [today]);

  useEffect(() => {
    loadQueues();
    const interval = setInterval(loadQueues, 5000);
    return () => clearInterval(interval);
  }, [loadQueues]);

  const currentQueue = queues.find((q) => q.status === 'called') || queues.find((q) => q.status === 'waiting');
  const nextQueues = queues
    .filter((q) => q.status === 'waiting')
    .sort((a, b) => {
      const numA = parseInt(a.nomorAntrian) || 0;
      const numB = parseInt(b.nomorAntrian) || 0;
      return numA - numB;
    })
    .slice(0, 6);

  if (loading) {
    return (
      <div className="antrian-display-page">
        <div style={{ fontSize: '24px', opacity: 0.7 }}>Memuat antrian...</div>
      </div>
    );
  }

  return (
    <div className="antrian-display-page">
      <div className="antrian-display-container">
        {/* Current Queue Section */}
        <div className="antrian-display-current">
          <div className="antrian-display-label">Antrian Sekarang</div>
          {currentQueue ? (
            <>
              <div className="antrian-display-number">{currentQueue.nomorAntrian}</div>
              <div className="antrian-display-name">{currentQueue.patientName || `Pasien #${currentQueue.patientId}`}</div>
            </>
          ) : (
            <div style={{ fontSize: '28px', opacity: 0.7, marginTop: '40px' }}>—</div>
          )}
        </div>

        {nextQueues.length > 0 && (
          <>
            <div className="antrian-display-divider" />
            <div className="antrian-display-next-label">Antrian Berikutnya</div>
            <div className="antrian-display-queue-list">
              {nextQueues.map((queue) => (
                <div key={queue.id} className="antrian-display-queue-item">
                  <div className="antrian-display-queue-number">{queue.nomorAntrian}</div>
                  <div className="antrian-display-queue-name">{queue.patientName || `Pasien #${queue.patientId}`}</div>
                </div>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
