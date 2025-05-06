// src/main.tsx
import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.tsx'
import './index.css'
import { AuthProvider } from './contexts/AuthContext.tsx' // AuthProvider 임포트
import { BrowserRouter } from 'react-router-dom'; // BrowserRouter 임포트

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <BrowserRouter> {/* BrowserRouter로 App 감싸기 */}
      <AuthProvider> {/* AuthProvider로 App 감싸기 */}
        <App />
      </AuthProvider>
    </BrowserRouter>
  </React.StrictMode>,
)