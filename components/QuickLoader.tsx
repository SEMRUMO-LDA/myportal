/**
 * QuickLoader.tsx
 * Ultra-lightweight loader component with inline styles for maximum speed
 * Used during initial app loading before CSS is available
 */

import React, { memo } from 'react';

export const QuickLoader = memo(() => (
  <div style={{
    position: 'fixed',
    inset: 0,
    background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 9999
  }}>
    <div style={{
      textAlign: 'center'
    }}>
      <div style={{
        width: '80px',
        height: '80px',
        background: 'white',
        borderRadius: '20px',
        margin: '0 auto 20px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        animation: 'quickPulse 1.5s ease-in-out infinite'
      }}>
        <span style={{ fontSize: '36px' }}>⏰</span>
      </div>
      <div style={{
        color: 'white',
        fontSize: '24px',
        fontWeight: 'bold',
        marginBottom: '8px'
      }}>
        SEMRUMO
      </div>
      <div style={{
        color: 'rgba(255, 255, 255, 0.8)',
        fontSize: '14px'
      }}>
        A carregar...
      </div>
    </div>
    <style>{`
      @keyframes quickPulse {
        0%, 100% {
          opacity: 0.6;
          transform: scale(0.95);
        }
        50% {
          opacity: 1;
          transform: scale(1);
        }
      }
    `}</style>
  </div>
));

QuickLoader.displayName = 'QuickLoader';