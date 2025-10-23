import { useState } from 'react';
import './LandingPage.css';

export default function LandingPage({ onGetStarted }) {
  const [animationComplete, setAnimationComplete] = useState(false);

  return (
    <div className="landing-page">
      <div className="landing-gradient-bg"></div>

      <div className="landing-content">
        {/* Logo Section */}
        <div className="logo-container">
          <div className="logo-icon">
            <svg width="100" height="100" viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg">
              {/* Circular background with gradient */}
              <circle cx="50" cy="50" r="45" fill="url(#logoGradient)" opacity="0.1"/>

              {/* Route line path */}
              <path d="M20 70 Q30 40, 50 50 T80 30" stroke="#FFD60A" strokeWidth="3" strokeLinecap="round" strokeDasharray="5,5" opacity="0.6"/>

              {/* Car icon - simplified modern design */}
              <g transform="translate(35, 42)">
                {/* Car body */}
                <path d="M0 10 L3 0 L27 0 L30 10 L30 18 L0 18 Z" fill="#FFD60A" stroke="#FFD60A" strokeWidth="1.5" strokeLinejoin="round"/>
                {/* Windows */}
                <rect x="5" y="3" width="8" height="6" rx="1" fill="#0A0A0A"/>
                <rect x="17" y="3" width="8" height="6" rx="1" fill="#0A0A0A"/>
                {/* Wheels */}
                <circle cx="7" cy="18" r="4" fill="#0A0A0A" stroke="#FFD60A" strokeWidth="2"/>
                <circle cx="23" cy="18" r="4" fill="#0A0A0A" stroke="#FFD60A" strokeWidth="2"/>
                {/* Wheel centers */}
                <circle cx="7" cy="18" r="1.5" fill="#FFD60A"/>
                <circle cx="23" cy="18" r="1.5" fill="#FFD60A"/>
              </g>

              {/* Code symbol overlay */}
              <text x="50" y="32" fontFamily="monospace" fontSize="18" fill="#FFD60A" textAnchor="middle" fontWeight="bold">{"</>"}</text>

              {/* Gradient definition */}
              <defs>
                <linearGradient id="logoGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="#FFD60A"/>
                  <stop offset="100%" stopColor="#FFC300"/>
                </linearGradient>
              </defs>
            </svg>
          </div>
          <h1 className="logo-text">
            <span className="logo-code">Code</span>
            <span className="logo-cruise">Cruise</span>
          </h1>
        </div>

        {/* Tagline */}
        <p className="landing-tagline">Code your way to anywhere</p>
        <p className="landing-subtitle">Tech-powered rides for the digital generation</p>

        {/* Features */}
        <div className="landing-features">
          <div className="feature-item">
            <div className="feature-icon">⚡</div>
            <div className="feature-text">Instant Booking</div>
          </div>
          <div className="feature-item">
            <div className="feature-icon">💰</div>
            <div className="feature-text">Best Prices</div>
          </div>
          <div className="feature-item">
            <div className="feature-icon">🛡️</div>
            <div className="feature-text">Safe & Secure</div>
          </div>
        </div>

        {/* CTA Button */}
        <button
          className="landing-cta-button"
          onClick={onGetStarted}
        >
          <span>Get Started</span>
          <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
            <path d="M7.5 15L12.5 10L7.5 5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </button>

        {/* Footer info */}
        <div className="landing-footer">
          <p>Available 24/7 • Trusted by thousands</p>
        </div>
      </div>

      {/* Floating elements decoration */}
      <div className="floating-elements">
        <div className="floating-circle circle-1"></div>
        <div className="floating-circle circle-2"></div>
        <div className="floating-circle circle-3"></div>
      </div>
    </div>
  );
}
