import React, { Component, ErrorInfo, ReactNode } from 'react';
import { AlertCircle, RefreshCw, Home } from 'lucide-react';
import { errorHandler } from '../utils/errorHandler';

interface Props {
    children?: ReactNode;
    fallback?: ReactNode;
    onError?: (error: Error, errorInfo: ErrorInfo) => void;
}

interface State {
    hasError: boolean;
    error?: Error;
    errorInfo?: ErrorInfo;
}

export class ErrorBoundary extends Component<Props, State> {
    public state: State = {
        hasError: false
    };

    public static getDerivedStateFromError(error: Error): State {
        return { hasError: true, error };
    }

    public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
        // Log usando nosso sistema centralizado
        errorHandler.handleSilent(error, 'ErrorBoundary');

        // Callback personalizado (ex: enviar para Sentry)
        if (this.props.onError) {
            this.props.onError(error, errorInfo);
        }

        this.setState({ errorInfo });
    }

    private handleReset = () => {
        this.setState({ hasError: false, error: undefined, errorInfo: undefined });
    };

    private handleReload = () => {
        window.location.reload();
    };

    private handleGoHome = () => {
        window.location.hash = '/';
    };

    public render() {
        if (this.state.hasError) {
            // Use custom fallback if provided
            if (this.props.fallback) {
                return this.props.fallback;
            }

            return (
                <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
                    <div className="bg-white rounded-2xl shadow-xl p-8 max-w-lg w-full border border-gray-100">
                        <div className="text-center mb-6">
                            <div className="w-16 h-16 bg-red-50 text-red-500 rounded-full flex items-center justify-center mx-auto mb-4">
                                <AlertCircle size={32} />
                            </div>
                            <h1 className="text-2xl font-bold text-gray-900 mb-2">Ups, algo correu mal.</h1>
                            <p className="text-gray-500 leading-relaxed">
                                Ocorreu um erro inesperado na aplicação. <br />
                                A nossa equipa técnica foi notificada.
                            </p>
                        </div>

                        {import.meta.env.DEV && this.state.error && (
                            <div className="mb-6">
                                <details className="bg-gray-50 border border-gray-200 rounded-lg overflow-hidden">
                                    <summary className="px-4 py-3 cursor-pointer text-sm font-medium text-gray-700 hover:bg-gray-100">
                                        Detalhes técnicos (DEV)
                                    </summary>
                                    <div className="px-4 py-3 border-t border-gray-200 space-y-2">
                                        <div>
                                            <p className="text-xs font-semibold text-gray-600 mb-1">Erro:</p>
                                            <p className="text-xs font-mono text-red-600 break-all">
                                                {this.state.error.toString()}
                                            </p>
                                        </div>
                                        {this.state.error.stack && (
                                            <div>
                                                <p className="text-xs font-semibold text-gray-600 mb-1">Stack:</p>
                                                <pre className="text-[10px] font-mono text-gray-500 overflow-auto max-h-32">
                                                    {this.state.error.stack}
                                                </pre>
                                            </div>
                                        )}
                                        {this.state.errorInfo?.componentStack && (
                                            <div>
                                                <p className="text-xs font-semibold text-gray-600 mb-1">Component Stack:</p>
                                                <pre className="text-[10px] font-mono text-gray-500 overflow-auto max-h-32">
                                                    {this.state.errorInfo.componentStack}
                                                </pre>
                                            </div>
                                        )}
                                    </div>
                                </details>
                            </div>
                        )}

                        <div className="grid grid-cols-2 gap-3">
                            <button
                                onClick={this.handleGoHome}
                                className="flex items-center justify-center gap-2 bg-white hover:bg-gray-50 text-gray-700 font-semibold py-3 rounded-lg transition-colors border border-gray-200"
                            >
                                <Home size={18} />
                                Ir para Início
                            </button>
                            <button
                                onClick={this.handleReload}
                                className="flex items-center justify-center gap-2 bg-brand-600 hover:bg-brand-700 text-white font-bold py-3 rounded-lg transition-colors shadow-lg shadow-brand-900/20"
                            >
                                <RefreshCw size={18} />
                                Recarregar
                            </button>
                        </div>

                        {import.meta.env.DEV && (
                            <button
                                onClick={this.handleReset}
                                className="w-full mt-3 text-sm text-gray-500 hover:text-gray-700 underline"
                            >
                                Tentar novamente sem recarregar (DEV)
                            </button>
                        )}
                    </div>
                </div>
            );
        }

        return this.props.children;
    }
}
