import EnterpriseIntelligence from './enterprise-v11/IntegratedIntelligence';
import Cockpit from './gestao-v14/Cockpit';
import ErrorBoundary from './components/ErrorBoundary';
/** V14 (cockpit de gestão) é a visão padrão; a V13 continua disponível em ?v=13. */
const legacy = typeof location !== 'undefined' && ['11', '13'].includes(new URLSearchParams(location.search).get('v') ?? '');
export default function App() { return <ErrorBoundary>{legacy ? <EnterpriseIntelligence /> : <Cockpit />}</ErrorBoundary>; }
