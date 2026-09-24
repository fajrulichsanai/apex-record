'use client';

import { useEffect, useRef, useState } from 'react';
import { useToast } from '@/lib/toast-context';

interface SpeechRecognitionResultLike {
  isFinal: boolean;
  0: { transcript: string };
}

interface SpeechRecognitionEventLike {
  resultIndex: number;
  results: ArrayLike<SpeechRecognitionResultLike>;
}

interface SpeechRecognitionLike {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  onresult: ((event: SpeechRecognitionEventLike) => void) | null;
  onerror: ((event: { error: string }) => void) | null;
  onend: (() => void) | null;
  start: () => void;
  stop: () => void;
}

type SpeechRecognitionConstructor = new () => SpeechRecognitionLike;

function getSpeechRecognitionCtor(): SpeechRecognitionConstructor | null {
  if (typeof window === 'undefined') return null;
  const w = window as unknown as {
    SpeechRecognition?: SpeechRecognitionConstructor;
    webkitSpeechRecognition?: SpeechRecognitionConstructor;
  };
  return w.SpeechRecognition || w.webkitSpeechRecognition || null;
}

interface VoiceDictationButtonProps {
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
}

/**
 * Tombol dikte suara untuk field SOAP — Web Speech API, tanpa install apapun.
 * Hasil transkripsi ditambahkan ke value existing (bisa diedit manual
 * sebelum disimpan, sama seperti mengetik biasa). Chrome direkomendasikan;
 * browser lain yang tidak mendukung akan diberi tahu saat tombol diklik.
 */
export default function VoiceDictationButton({ value, onChange, disabled }: VoiceDictationButtonProps) {
  const { error: showError } = useToast();
  const [recording, setRecording] = useState(false);
  const [supported, setSupported] = useState(true);
  const recognitionRef = useRef<SpeechRecognitionLike | null>(null);
  const valueRef = useRef(value);

  useEffect(() => {
    valueRef.current = value;
  }, [value]);

  useEffect(() => {
    setSupported(getSpeechRecognitionCtor() !== null);
    return () => {
      recognitionRef.current?.stop();
    };
  }, []);

  const stopRecording = () => {
    recognitionRef.current?.stop();
    setRecording(false);
  };

  const startRecording = () => {
    const Ctor = getSpeechRecognitionCtor();
    if (!Ctor) {
      showError('Voice to text tidak didukung di browser ini — gunakan Google Chrome.');
      return;
    }

    const recognition = new Ctor();
    recognition.lang = 'id-ID';
    recognition.continuous = true;
    recognition.interimResults = false;

    recognition.onresult = (event) => {
      let finalChunk = '';
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const result = event.results[i];
        if (result.isFinal) {
          finalChunk += (finalChunk ? ' ' : '') + result[0].transcript.trim();
        }
      }
      if (finalChunk) {
        const next = valueRef.current ? `${valueRef.current} ${finalChunk}` : finalChunk;
        valueRef.current = next;
        onChange(next);
      }
    };

    recognition.onerror = (event) => {
      if (event.error === 'not-allowed' || event.error === 'permission-denied') {
        showError('Izin mikrofon ditolak — aktifkan akses mikrofon untuk browser ini.');
      } else if (event.error !== 'no-speech' && event.error !== 'aborted') {
        showError('Dikte suara terhenti karena error, coba lagi.');
      }
      setRecording(false);
    };

    recognition.onend = () => {
      setRecording(false);
    };

    recognitionRef.current = recognition;
    recognition.start();
    setRecording(true);
  };

  return (
    <button
      type="button"
      className={`voice-dictation-btn${recording ? ' recording' : ''}${!supported ? ' unsupported' : ''}`}
      onClick={recording ? stopRecording : startRecording}
      disabled={disabled}
      title={
        supported
          ? recording
            ? 'Berhenti mendikte'
            : 'Dikte suara (Bahasa Indonesia)'
          : 'Voice to text tidak didukung di browser ini — gunakan Chrome'
      }
    >
      <span className="material-symbols-rounded">{recording ? 'stop_circle' : 'mic'}</span>
      {recording && <span className="voice-dictation-pulse" />}
    </button>
  );
}
