import React, { Component, ReactNode } from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'
import './index.css'

// Error Boundary to catch React errors
class ErrorBoundary extends Component<{ children: ReactNode }, { hasError: boolean; error: Error | null }> {
    constructor(props: { children: ReactNode }) {
        super(props);
        this.state = { hasError: false, error: null };
    }

    static getDerivedStateFromError(error: Error) {
        return { hasError: true, error };
    }

    componentDidCatch(error: Error, errorInfo: any) {
        console.error('ErrorBoundary caught an error:', error, errorInfo);
    }

    render() {
        if (this.state.hasError) {
            return (
                <div style={{ padding: '40px', fontFamily: 'sans-serif', background: '#0F1117', minHeight: '100vh', color: '#f9fafb' }}>
                    <h1 style={{ color: '#ef4444', fontSize: '24px', fontWeight: 'bold' }}>Oops! Algo deu errado.</h1>
                    <p style={{ color: '#9ca3af', marginTop: '8px' }}>A aplicação encontrou um erro inesperado.</p>
                    <pre style={{
                        background: '#1a1d2e',
                        color: '#f9fafb',
                        padding: '16px',
                        borderRadius: '12px',
                        overflow: 'auto',
                        whiteSpace: 'pre-wrap',
                        marginTop: '16px',
                        border: '1px solid rgba(255,255,255,0.1)',
                        fontSize: '13px'
                    }}>
                        {this.state.error?.message}
                        {'\n\n'}
                        {this.state.error?.stack}
                    </pre>
                    <button
                        onClick={() => window.location.reload()}
                        style={{
                            marginTop: '16px',
                            padding: '12px 24px',
                            background: 'linear-gradient(135deg, #7C3AED, #6D28D9)',
                            color: 'white',
                            border: 'none',
                            borderRadius: '12px',
                            cursor: 'pointer',
                            fontWeight: '600',
                            fontSize: '14px'
                        }}
                    >
                        Recarregar Página
                    </button>
                </div>
            );
        }

        return this.props.children;
    }
}

ReactDOM.createRoot(document.getElementById('root')!).render(
    <React.StrictMode>
        <ErrorBoundary>
            <App />
        </ErrorBoundary>
    </React.StrictMode>,
)
