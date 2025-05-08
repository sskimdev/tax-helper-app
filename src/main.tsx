// src/main.tsx
import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.tsx'
import './index.css'
import { AuthProvider } from './contexts/AuthContext.tsx'
import { ProAuthProvider } from './hooks/useProAuth.tsx'; // ProAuthProvider 임포트
import { BrowserRouter } from 'react-router-dom';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <BrowserRouter>
      <AuthProvider>
        {/* ProAuthProvider 추가 */}
        <ProAuthProvider>
          <App />
        </ProAuthProvider>
      </AuthProvider>
    </BrowserRouter>
  </React.StrictMode>,
)