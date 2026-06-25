'use client';

import './FeedbackModal.css';

type FeedbackType = 'success' | 'error' | 'warning' | 'info';

interface FeedbackModalProps {
  isOpen: boolean;
  type: FeedbackType;
  title: string;
  message: string;
  actionButton?: {
    label: string;
    onClick: () => void;
  };
  onOkAction?: () => void;
}

export default function FeedbackModal({
  isOpen,
  type,
  title,
  message,
  actionButton,
  onOkAction,
}: FeedbackModalProps) {

  if (!isOpen) return null;

  const getIcon = () => {
    switch (type) {
      case 'success':
        return (
          <svg fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
          </svg>
        );
      case 'error':
        return (
          <svg fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
          </svg>
        );
      case 'warning':
        return (
          <svg fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M12 8v4m0 4v.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
            />
          </svg>
        );
      case 'info':
      default:
        return (
          <svg fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
            />
          </svg>
        );
    }
  };

  return (
    <>
      {/* Overlay */}
      <div className="feedback-modal-overlay" />

      {/* Modal */}
      <div className={`feedback-modal feedback-modal-${type}`}>
        <div className={`feedback-modal-icon feedback-modal-icon-${type}`}>{getIcon()}</div>

        <div className="feedback-modal-content">
          <h2 className="feedback-modal-title">{title}</h2>
          <p className="feedback-modal-message">{message}</p>
        </div>

        {(actionButton || onOkAction) && (
          <div className="feedback-modal-actions">
            {actionButton ? (
              <button className="feedback-modal-action-btn" onClick={actionButton.onClick}>
                {actionButton.label}
              </button>
            ) : (
              <button className="feedback-modal-action-btn" onClick={onOkAction}>
                OK
              </button>
            )}
          </div>
        )}
      </div>
    </>
  );
}
