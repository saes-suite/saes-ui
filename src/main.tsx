import React from 'react'
import ReactDOM from 'react-dom/client'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import App from './App'
import './styles/index.css'

import { AppearanceProvider } from './context/AppearanceContext'
import { AISettingsProvider } from './context/AISettingsContext'

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      retry: 1,
    },
  },
})

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <QueryClientProvider client={queryClient}>
      <AppearanceProvider>
        <AISettingsProvider>
          <App />
        </AISettingsProvider>
      </AppearanceProvider>
    </QueryClientProvider>
  </React.StrictMode>
)
