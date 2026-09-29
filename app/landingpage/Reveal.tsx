'use client';

import { useEffect, useRef, useState, type ReactNode } from 'react';
import { usePrefersReducedMotion } from './useCountUp';

interface RevealProps {
  children: ReactNode;
  delay?: number;
  className?: string;
}

/** Fades+slides a section into view once it enters the viewport; skips the animation entirely under prefers-reduced-motion. */
export default function Reveal({ children, delay = 0, className = '' }: RevealProps) {
  const ref = useRef<HTMLDivElement>(null);
  const reducedMotion = usePrefersReducedMotion();
  const [inView, setInView] = useState(false);
  const visible = reducedMotion || inView;

  useEffect(() => {
    const node = ref.current;
    if (!node) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setInView(true);
          observer.disconnect();
        }
      },
      { threshold: 0.15, rootMargin: '0px 0px -40px 0px' },
    );
    observer.observe(node);
    return () => observer.disconnect();
  }, []);

  return (
    <div
      ref={ref}
      className={`reveal ${visible ? 'is-visible' : ''} ${className}`}
      style={{ transitionDelay: visible ? `${delay}ms` : '0ms' }}
    >
      {children}
    </div>
  );
}
