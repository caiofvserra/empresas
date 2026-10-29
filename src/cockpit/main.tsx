import React from 'react';
import ReactDOM from 'react-dom/client';
import ErrorBoundary from '../components/ErrorBoundary';
import Cockpit from './Cockpit';
ReactDOM.createRoot(document.getElementById('root')!).render(<React.StrictMode><ErrorBoundary><Cockpit /></ErrorBoundary></React.StrictMode>);
