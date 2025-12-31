import React, { useState, useEffect } from 'react';
import { Demo } from './components/ui/demo';

const App: React.FC = () => {
  const [isLoading, setIsLoading] = useState(true);
  const [isFading, setIsFading] = useState(false);

  useEffect(() => {
    // Start fading out after 2.5 seconds, fully hidden at 3 seconds
    const fadeTimer = setTimeout(() => {
      setIsFading(true);
    }, 2500);

    const hideTimer = setTimeout(() => {
      setIsLoading(false);
    }, 3000);

    return () => {
      clearTimeout(fadeTimer);
      clearTimeout(hideTimer);
    };
  }, []);

  // Don't render anything when loading is complete
  if (!isLoading) {
    return null;
  }

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      width: '100vw',
      height: '100vh',
      backgroundColor: 'black',
      display: 'flex',
      flexDirection: 'column',
      justifyContent: 'center',
      alignItems: 'center',
      zIndex: 9999,
      color: 'white',
      opacity: isFading ? 0 : 1,
      transition: 'opacity 0.5s ease-out',
      pointerEvents: 'auto', // Enable during loading, parent will disable after
    }}>
      <h1 style={{
        fontSize: '2.5rem',
        color: '#ef4444',
        marginBottom: '1rem',
        fontWeight: 'bold',
        textAlign: 'center'
      }}>
        AgentVerse
      </h1>
      <p style={{
        color: '#9ca3af',
        marginBottom: '3rem',
        textAlign: 'center',
        fontSize: '1.1rem'
      }}>
        Multi-Agent Visual Collaboration
      </p>
      <Demo />
      <p style={{
        color: '#6b7280',
        marginTop: '2rem',
        fontSize: '0.875rem',
        textAlign: 'center'
      }}>
        Loading agents...
      </p>
    </div>
  );
};

export default App;
