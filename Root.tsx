import App from './App';
import { ErrorBoundary } from './src/components/ErrorBoundary';
import { installCrashHandlers } from './src/logic/crash';

// Az app gyökere: hiba esetén üres képernyő helyett a hibaképernyő (aktív jeggyel) jelenik meg, és névtelen hibajelentés megy.
installCrashHandlers();

// Tesztelés: a webes demóban a ?crashtest paraméter szándékos hibát vált ki (e2e teszt, és így Boti is kipróbálhatja)
const crashTest = typeof window !== 'undefined' && typeof window.location?.search === 'string' && /[?&]crashtest\b/.test(window.location.search);
function CrashTest(): never {
  throw new Error('Szándékos teszthiba (crashtest) ABC-123 teszt@pelda.hu 47.49781,19.04015');
}

export default function Root() {
  return <ErrorBoundary>{crashTest ? <CrashTest /> : <App />}</ErrorBoundary>;
}
