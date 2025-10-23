import { useState, useEffect } from 'react';
import './ErrorDemo.css';

export default function ErrorDemo() {
  const [showError, setShowError] = useState(false);
  const [isRetrying, setIsRetrying] = useState(false);

  useEffect(() => {
    if (showError && isRetrying) {
      const timer = setTimeout(() => {
        setIsRetrying(false);
        setShowError(false); // Hide error banner after 3 seconds
      }, 3000);

      return () => clearTimeout(timer);
    }
  }, [showError, isRetrying]);

  const handleDemoError = () => {
    setShowError(!showError);
    setIsRetrying(false);
  };

  const handleRetry = () => {
    setIsRetrying(true);
  };

  return (
    <>
      {/* Demo Error Button */}
      <button
        className="demo-error-button"
        onClick={handleDemoError}
        aria-label="Toggle demo error"
      >
        Demo Error
      </button>

      {/* Connection Lost Banner */}
      {showError && (
        <div className="error-banner" role="alert">
          <span className="error-icon" aria-hidden="true">⚠️</span>
          <span className="error-text">
            {isRetrying ? 'Retrying...' : 'Connection lost. Retrying...'}
          </span>
          {!isRetrying && (
            <button
              className="retry-button-small"
              onClick={handleRetry}
              aria-label="Retry connection"
            >
              Retry
            </button>
          )}
        </div>
      )}
    </>
  );
}
