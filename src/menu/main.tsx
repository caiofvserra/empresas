import React from 'react';
import ReactDOM from 'react-dom/client';
import { ArrowRight, Building2, HardHat, LayoutDashboard, Headset, Scale, ShieldCheck, Wallet } from 'lucide-react';
import type { ComponentType } from 'react';
import { EngineeringBlueprint, EngineeringEmblem } from '../components/EngineeringIdentity';
import { emFrase, paineisDoMenu, type PainelDoMenu } from './paineis';
import '../painel/painel.css';
import './menu.css';

/** Ícone de cada painel: os mesmos dos atalhos do menu lateral da Presidência (src/cockpit/Cockpit.tsx). */
const icones: Record<PainelDoMenu['id'], ComponentType<{ size?: number; 'aria-hidden'?: boolean }>> = {
  presidencia: LayoutDashboard, empresas: Building2, profissionais: HardHat, fiscalizacao: ShieldCheck, conselho: Scale, financeiro: Wallet, atendimento: Headset,
};

/** Página inicial do site: o nome do programa à esquerda, na faixa azul do menu lateral dos painéis, e a lista dos sete painéis à direita. */
function Menu() {
  return <div className="mn">
    <header className="mn-faixa">
      <div className="mn-marca"><EngineeringEmblem /></div>
      <h1>Inteligência Estratégica Crea-SP</h1>
      <p className="mn-lead">Os painéis de dados do Conselho num só lugar. Escolha um painel para abrir; o botão Voltar, no alto do menu lateral, traz de volta para cá.</p>
      <p className="mn-nota">Os dados internos são demonstrativos. Os dados públicos são reais e mostram a fonte e a data.</p>
      <div className="mn-desenho" aria-hidden="true"><EngineeringBlueprint /></div>
    </header>
    <main className="mn-corpo">
      <h2 className="mn-titulo">Painéis</h2>
      <nav aria-label="Painéis">
        <ul className="mn-lista">
          {paineisDoMenu.map(painel => {
            const Icone = icones[painel.id];
            return <li key={painel.id}>
              <a className="mn-painel" href={painel.arquivo}>
                <span className="mn-icone"><Icone size={22} aria-hidden /></span>
                <span className="mn-texto"><b>{painel.nome}</b><span>{emFrase(painel.paginas)}</span></span>
                <ArrowRight className="mn-seta" size={20} aria-hidden />
              </a>
            </li>;
          })}
        </ul>
      </nav>
    </main>
  </div>;
}

ReactDOM.createRoot(document.getElementById('root')!).render(<React.StrictMode><Menu /></React.StrictMode>);
