import React from 'react';

class ErrorBoundary extends React.Component {
    constructor(props) {
        super(props);
        this.state = { hasError: false, error: null, errorInfo: null };
    }

    static getDerivedStateFromError(error) {
        return { hasError: true, error };
    }

    componentDidCatch(error, errorInfo) {
        this.setState({ error, errorInfo });
        console.error("Uncaught error:", error, errorInfo);
    }

    render() {
        if (this.state.hasError) {
            return (
                <div style={{
                    minHeight: '100vh', display: 'flex', flexDirection: 'column',
                    alignItems: 'center', justifyContent: 'center',
                    fontFamily: 'system-ui, sans-serif', background: '#f8f9fa', padding: '32px'
                }}>
                    <div style={{
                        background: 'white', border: '1px solid #fee2e2', borderRadius: '16px',
                        padding: '40px', maxWidth: '600px', width: '100%', boxShadow: '0 4px 24px rgba(0,0,0,0.06)'
                    }}>
                        <div style={{ fontSize: '48px', marginBottom: '16px' }}>⚠️</div>
                        <h1 style={{ color: '#dc2626', fontSize: '24px', fontWeight: '800', marginBottom: '8px' }}>
                            Something went wrong
                        </h1>
                        <p style={{ color: '#64748b', marginBottom: '20px', fontSize: '14px' }}>
                            The app encountered an error. Check the browser console for details.
                        </p>
                        <details style={{ background: '#fef2f2', borderRadius: '8px', padding: '16px', fontSize: '12px', color: '#991b1b' }}>
                            <summary style={{ cursor: 'pointer', fontWeight: '700', marginBottom: '8px' }}>
                                Error Details
                            </summary>
                            <pre style={{ whiteSpace: 'pre-wrap', overflow: 'auto', maxHeight: '200px' }}>
                                {this.state.error && this.state.error.toString()}
                                {'\n'}
                                {this.state.errorInfo && this.state.errorInfo.componentStack}
                            </pre>
                        </details>
                        <button
                            onClick={() => window.location.reload()}
                            style={{
                                marginTop: '20px', background: '#f97316', color: 'white',
                                border: 'none', borderRadius: '10px', padding: '12px 24px',
                                fontWeight: '700', cursor: 'pointer', fontSize: '14px'
                            }}
                        >
                            Reload Page
                        </button>
                    </div>
                </div>
            );
        }

        return this.props.children;
    }
}

export default ErrorBoundary;
