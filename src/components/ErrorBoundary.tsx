import { Component } from 'react';
import type { ErrorInfo, ReactNode } from 'react';
export default class ErrorBoundary extends Component<{ children: ReactNode }, { failed: boolean }> {
  state = { failed: false };
  static getDerivedStateFromError() { return { failed: true }; }
  componentDidCatch(error: Error, info: ErrorInfo) { console.error('Falha na plataforma demonstrativa', error.message, info.componentStack); }
  render() { if (this.state.failed) return <main className="p-error"><h1>Não foi possível concluir esta análise</h1><p>Recarregue a demonstração para reconstruir os índices. Os dados de origem permanecem preservados.</p><button onClick={() => { localStorage.removeItem('crea-filters-v2'); window.location.assign(window.location.pathname); }}>Reiniciar demonstração</button></main>; return this.props.children; }
}
