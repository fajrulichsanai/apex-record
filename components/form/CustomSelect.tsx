'use client';

import { useEffect, useRef, useState } from 'react';
import './CustomSelect.css';

interface CustomSelectProps {
  value: string;
  onChange: (value: string) => void;
  options: Array<{ value: string; label: string }>;
  placeholder?: string;
  disabled?: boolean;
  error?: boolean;
}

export default function CustomSelect({
  value,
  onChange,
  options,
  placeholder = 'Pilih opsi...',
  disabled = false,
  error = false,
}: CustomSelectProps) {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const selectedLabel = options.find((opt) => opt.value === value)?.label || placeholder;

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [isOpen]);

  return (
    <div className="custom-select-wrapper" ref={dropdownRef}>
      <button
        type="button"
        className={`custom-select-trigger ${isOpen ? 'open' : ''} ${error ? 'error' : ''}`}
        onClick={() => !disabled && setIsOpen(!isOpen)}
        disabled={disabled}
      >
        <span className="custom-select-value">{selectedLabel}</span>
        <span className="custom-select-arrow material-symbols-rounded">expand_more</span>
      </button>

      {isOpen && (
        <div className="custom-select-dropdown">
          {options.map((opt) => (
            <button
              key={opt.value}
              type="button"
              className={`custom-select-option ${opt.value === value ? 'selected' : ''}`}
              onClick={() => {
                onChange(opt.value);
                setIsOpen(false);
              }}
            >
              <span>{opt.label}</span>
              {opt.value === value && (
                <span className="material-symbols-rounded check-icon">check</span>
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
