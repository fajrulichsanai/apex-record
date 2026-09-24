'use client';

import { useEffect, useRef, useState } from 'react';

interface SignaturePadProps {
  value?: string;
  onChange: (dataUrl: string | null) => void;
  disabled?: boolean;
  height?: number;
}

function getPoint(canvas: HTMLCanvasElement, e: PointerEvent | React.PointerEvent) {
  const rect = canvas.getBoundingClientRect();
  return {
    x: (e.clientX - rect.left) * (canvas.width / rect.width),
    y: (e.clientY - rect.top) * (canvas.height / rect.height),
  };
}

export default function SignaturePad({ value, onChange, disabled, height = 160 }: SignaturePadProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const drawingRef = useRef(false);
  const [isEmpty, setIsEmpty] = useState(!value);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    if (value) {
      const img = new Image();
      img.onload = () => ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
      img.src = value;
      setIsEmpty(false);
    } else {
      setIsEmpty(true);
    }
  }, [value]);

  const startDraw = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (disabled) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    drawingRef.current = true;
    setIsEmpty(false);
    const { x, y } = getPoint(canvas, e);
    ctx.beginPath();
    ctx.moveTo(x, y);
    canvas.setPointerCapture(e.pointerId);
  };

  const draw = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!drawingRef.current || disabled) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const { x, y } = getPoint(canvas, e);
    ctx.lineWidth = 2;
    ctx.lineCap = 'round';
    ctx.strokeStyle = '#1a1a1a';
    ctx.lineTo(x, y);
    ctx.stroke();
  };

  const endDraw = () => {
    if (!drawingRef.current) return;
    drawingRef.current = false;
    const canvas = canvasRef.current;
    if (!canvas) return;
    onChange(canvas.toDataURL('image/png'));
  };

  const handleClear = () => {
    if (disabled) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    setIsEmpty(true);
    onChange(null);
  };

  return (
    <div className="signature-pad-wrap">
      <canvas
        ref={canvasRef}
        width={500}
        height={height}
        className="signature-pad-canvas"
        style={{
          width: '100%',
          height,
          touchAction: 'none',
          cursor: disabled ? 'not-allowed' : 'crosshair',
          opacity: disabled ? 0.6 : 1,
        }}
        onPointerDown={startDraw}
        onPointerMove={draw}
        onPointerUp={endDraw}
        onPointerLeave={endDraw}
      />
      <div className="signature-pad-actions">
        <span className="signature-pad-hint">{isEmpty ? 'Belum ada tanda tangan' : 'Tanda tangan tersimpan'}</span>
        {!disabled && (
          <button type="button" className="btn-outline" style={{ fontSize: '12px', padding: '4px 10px' }} onClick={handleClear}>
            Hapus
          </button>
        )}
      </div>
    </div>
  );
}
