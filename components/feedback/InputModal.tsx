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
  numeric?: boolean;
  onConfirm: (value: string) => void;
  onCancel: () => void;
}

function formatThousands(digits: string): string {
  if (!digits) return '';
  return digits.replace(/\B(?=(\d{3})+(?!\d))/g, '.');
}

export default function InputModal({
  isOpen,
  title,
  message,
  placeholder = '',
  defaultValue = '',
  confirmLabel = 'OK',
  cancelLabel = 'Batal',
  numeric = false,
  onConfirm,
  onCancel,
}: InputModalProps) {
  const [value, setValue] = useState(defaultValue);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen) {
      setValue(numeric ? formatThousands(defaultValue.replace(/\D/g, '')) : defaultValue);
      setTimeout(() => inputRef.current?.focus(), 0);
    }
  }, [isOpen, defaultValue, numeric]);

  if (!isOpen) return null;

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (numeric) {
      setValue(formatThousands(e.target.value.replace(/\D/g, '')));
    } else {
      setValue(e.target.value);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onConfirm(numeric ? value.replace(/\D/g, '') : value);
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
              inputMode={numeric ? 'numeric' : 'text'}
              className="input-modal-input"
              placeholder={placeholder}
              value={value}
              onChange={handleChange}
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
