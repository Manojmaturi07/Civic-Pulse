import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import App from './App.jsx'
import './index.css'
import { AuthProvider } from './context/AuthContext.jsx'
import { IssueProvider } from './context/IssueContext.jsx'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <BrowserRouter>
      <AuthProvider>
        <IssueProvider>
          <App />
        </IssueProvider>
      </AuthProvider>
    </BrowserRouter>
  </StrictMode>,
)
