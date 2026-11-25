import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';
import { IS_TEST } from './utils/site';
import './styles.css';

// Test-Deployment visuell markieren (roter Header, TEST-Badge)
if (IS_TEST) document.documentElement.classList.add('is-test');

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
