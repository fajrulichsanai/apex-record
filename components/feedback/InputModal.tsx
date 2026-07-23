'use client';

import { useEffect, useRef, useState } from 'react';
import './InputModal.css';

interface InputModalProps {
  isOpen: boolean;
  title: string;
  message?: string;
  placeholder?: string;
  defaultValue?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  onConfirm: (value: string) => void;
  onCancel: () => void;
}

export default function InputModal({
  isOpen,
  title,
  message,
  placeholder = '',
  defaultValue = '',
  confirmLabel = 'OK',
  cancelLabel = 'Batal',
  onConfirm,
  onCancel,
}: InputModalProps) {
  const [value, setValue] = useState(defaultValue);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen) {
      setValue(defaultValue);
      setTimeout(() => inputRef.current?.focus(), 0);
    }
  }, [isOpen, defaultValue]);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onConfirm(value);
  };

  return (
    <>
      <div className="input-modal-overlay" onClick={onCancel} />
      <div className="input-modal">
        <div className="input-modal-header">
          <h2>{title}</h2>
        </div>
        <form onSubmit={handleSubmit}>
          {message && <div className="input-modal-message">{message}</div>}
          <div className="input-modal-body">
            <input
              ref={inputRef}
              type="text"
              className="input-modal-input"
              placeholder={placeholder}
              value={value}
              onChange={(e) => setValue(e.target.value)}
            />
          </div>
          <div className="input-modal-footer">
            <button type="button" className="btn-outline" onClick={onCancel}>
              {cancelLabel}
            </button>
            <button type="submit" className="btn-primary">
              {confirmLabel}
            </button>
          </div>
        </form>
      </div>
    </>
  );
}
