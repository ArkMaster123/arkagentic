import React from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';
import './index.css';

// Import Phaser game - this runs immediately and creates the game
import './index';

const container = document.getElementById('root');
if (!container) {
  throw new Error('Root element not found');
}

const root = createRoot(container);
root.render(<App />);
