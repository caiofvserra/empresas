import React from 'react';
import ReactDOM from 'react-dom/client';
import ErrorBoundary from '../components/ErrorBoundary';
import Painel from './Painel';
ReactDOM.createRoot(document.getElementById('root')!).render(<React.StrictMode><ErrorBoundary><Painel /></ErrorBoundary></React.StrictMode>);
