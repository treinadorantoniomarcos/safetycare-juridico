'use client';

import React, { useState, useEffect } from 'react';

// Mock Data integrated with our SQL Seed
const INITIAL_STATS = [
  { label: 'Pacientes Monitorados', value: '1,248', color: 'text-blue-400' },
  { label: 'Risco Médio Hospitalar', value: '14%', color: 'text-emerald-400' },
  { label: 'Processos Evitados (Est.)', value: '42', color: 'text-orange-400' },
  { label: 'Economia Gerada', value: 'R$ 840k', color: 'text-emerald-500' },
];

const CASE_DATA = {
  id: 'SC-4920',
  patient: 'João Silva',
  department: 'Neurologia / Emergência',
  riskScore: 82,
  status: 'Critical',
  timeline: [
    { time: '10:00', event: 'Admissão Hospitalar', status: 'success', icon: '✅', risk: 'Baixo' },
    { time: '11:45', event: 'Protocolo Meningite Ativado', status: 'success', icon: '✅', risk: 'Baixo' },
    { time: '14:20', event: 'Exame de LCR (Atraso Detectado)', status: 'critical', icon: '🚨', risk: 'Atraso de 2h detectado pelo Agente de Jornada' },
    { time: '15:10', event: 'Coleta de LCR Realizada', status: 'warning', icon: '⚠️', risk: 'Procedimento concluído com atraso' },
    { time: '16:00', event: 'Análise Documental', status: 'critical', icon: '📄', risk: 'Termo de Consentimento sem assinatura do responsável' },
  ],
  dossier: {
    thesis: "A conduta clínica seguiu o protocolo de meningite. O atraso operacional no exame de LCR deve ser justificado pela sobrecarga da unidade (escala de enfermagem reduzida no período).",
    nexus: "O atraso de 2h não comprometeu o nexo causal, visto que a antibioticoterapia foi mantida preventivamente.",
    action: "Obter relatório de escala da enfermagem e coletar assinatura do consentimento retroativo com ressalva."
  }
};

export default function ProtectDashboard() {
  const [showDossier, setShowDossier] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Simulate AIOX Agent Processing
    const timer = setTimeout(() => setLoading(false), 1500);
    return () => clearTimeout(timer);
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center text-white">
        <div className="w-16 h-16 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mb-4"></div>
        <p className="text-blue-400 font-mono animate-pulse">ORQUESTRADOR AIOX: SINCRONIZANDO SQUADS...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 p-8 font-sans">
      {/* Header */}
      <header className="flex justify-between items-center mb-10 border-b border-slate-800 pb-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-white flex items-center gap-2">
            <span className="text-blue-500">SAFETYCARE</span> PROTECT
            <span className="bg-blue-500/10 text-blue-500 text-xs px-2 py-1 rounded border border-blue-500/20 ml-2">B2B DEFENSE</span>
          </h1>
          <p className="text-slate-400 mt-1">Inteligência Jurídica Preventiva — Unidade: Hospital Central</p>
        </div>
        <div className="flex gap-4 items-center">
            <div className="bg-rose-500/10 border border-rose-500/30 px-4 py-2 rounded-lg">
                <p className="text-[10px] text-rose-500 font-bold uppercase">Alertas Críticos</p>
                <p className="text-xl font-bold text-rose-400">01</p>
            </div>
            <div className="text-right">
                <p className="text-emerald-400 flex items-center justify-end gap-2 font-mono text-sm">
                <span className="w-2 h-2 bg-emerald-400 rounded-full animate-pulse"></span> SQUADS ATIVOS
                </p>
            </div>
        </div>
      </header>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-10">
        {INITIAL_STATS.map((stat, i) => (
          <div key={i} className="bg-slate-900 border border-slate-800 p-6 rounded-xl shadow-lg border-l-4 border-l-blue-500">
            <p className="text-xs text-slate-500 uppercase font-bold mb-1">{stat.label}</p>
            <p className={`text-3xl font-bold ${stat.color}`}>{stat.value}</p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Main Panel */}
        <div className="lg:col-span-8 space-y-8">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-2xl">
            <div className="p-6 border-b border-slate-800 flex justify-between items-center bg-slate-900/50">
              <h2 className="font-bold flex items-center gap-2">
                <span className="w-2 h-4 bg-blue-500 rounded-full"></span>
                Jornada do Paciente: {CASE_DATA.patient}
              </h2>
              <div className="flex gap-2">
                <span className="text-xs bg-rose-500/20 text-rose-400 px-3 py-1 rounded-full border border-rose-500/30 font-bold">Risco: {CASE_DATA.riskScore}%</span>
                <span className="text-xs bg-slate-800 text-slate-400 px-3 py-1 rounded-full border border-slate-700">{CASE_DATA.id}</span>
              </div>
            </div>
            
            <div className="p-10 relative bg-[url('https://www.transparenttextures.com/patterns/carbon-fibre.png')]">
              <div className="absolute left-[3.25rem] top-10 bottom-10 w-0.5 bg-slate-800"></div>

              {CASE_DATA.timeline.map((item, i) => (
                <div key={i} className="flex gap-8 mb-8 relative z-10 group">
                  <div className="text-slate-500 font-mono text-sm pt-1 w-12">{item.time}</div>
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm border-4 border-slate-950 transition-transform group-hover:scale-125 ${
                    item.status === 'success' ? 'bg-emerald-500' : item.status === 'warning' ? 'bg-orange-500' : 'bg-rose-500'
                  }`}>
                    {item.icon}
                  </div>
                  <div className={`flex-1 p-4 rounded-lg border transition-all ${
                    item.status === 'critical' ? 'bg-rose-500/5 border-rose-500/20' : 'bg-slate-950/50 border-slate-800'
                  }`}>
                    <p className="font-bold">{item.event}</p>
                    <p className={`text-xs mt-1 ${
                      item.status === 'success' ? 'text-slate-500' : item.status === 'warning' ? 'text-orange-400' : 'text-rose-400'
                    }`}>
                      {item.risk}
                    </p>
                  </div>
                </div>
              ))}
            </div>

            <div className="p-6 bg-blue-600/10 border-t border-blue-500/20 flex justify-between items-center">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-blue-500 rounded-lg animate-bounce">🛡️</div>
                <div>
                    <p className="text-xs text-blue-400 font-bold uppercase tracking-wider">Análise de Defesa Disponível</p>
                    <p className="text-sm text-slate-300">O Squad Jurídico preparou a tese antecipada para este caso.</p>
                </div>
              </div>
              <button 
                onClick={() => setShowDossier(true)}
                className="bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold px-6 py-3 rounded-lg transition-all shadow-lg shadow-blue-500/20 uppercase tracking-widest"
              >
                Ver Dossiê de Defesa
              </button>
            </div>
          </div>
        </div>

        {/* Sidebar */}
        <div className="lg:col-span-4 space-y-8">
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl">
                <h3 className="text-sm font-bold mb-6 flex items-center gap-2 text-blue-400 uppercase tracking-widest">
                Checklist de Prova
                </h3>
                <div className="space-y-4">
                    {[
                        { label: 'Prontuário Admissional', status: 'ok' },
                        { label: 'Termo de Consentimento', status: 'error' },
                        { label: 'Evolução de Enfermagem', status: 'warning' },
                        { label: 'Protocolo de Meningite', status: 'ok' },
                    ].map((check, i) => (
                        <div key={i} className="flex justify-between items-center p-3 bg-slate-950/50 rounded-lg border border-slate-800">
                            <span className="text-sm text-slate-300">{check.label}</span>
                            <span className={check.status === 'ok' ? 'text-emerald-500' : check.status === 'warning' ? 'text-orange-500' : 'text-rose-500'}>
                                {check.status === 'ok' ? '✅' : check.status === 'warning' ? '⚠️' : '❌'}
                            </span>
                        </div>
                    ))}
                </div>
            </div>

            <div className="bg-gradient-to-br from-blue-600 to-indigo-700 rounded-2xl p-6 shadow-2xl text-white">
                <h3 className="font-bold text-lg mb-2">Suporte Jurídico</h3>
                <p className="text-blue-100 text-sm mb-6">Deseja acionar o escritório de advocacia parceiro para este caso crítico?</p>
                <button className="w-full bg-white text-blue-700 font-bold py-3 rounded-xl shadow-lg hover:bg-blue-50 transition-colors uppercase text-xs tracking-widest">
                    Acionar Advogado
                </button>
            </div>
        </div>
      </div>

      {/* Dossier Modal */}
      {showDossier && (
        <div className="fixed inset-0 bg-slate-950/90 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 w-full max-w-2xl rounded-3xl shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-300">
            <div className="p-8 border-b border-slate-800 flex justify-between items-center bg-blue-600">
              <h2 className="text-2xl font-bold text-white">Dossiê de Defesa Prévia</h2>
              <button onClick={() => setShowDossier(false)} className="text-white/50 hover:text-white text-2xl">×</button>
            </div>
            <div className="p-8 space-y-6 overflow-y-auto max-h-[70vh]">
              <div className="bg-slate-950 p-6 rounded-xl border border-slate-800">
                <h4 className="text-blue-400 font-bold text-xs uppercase mb-2">Tese Principal</h4>
                <p className="text-slate-200 italic leading-relaxed">"{CASE_DATA.dossier.thesis}"</p>
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-slate-950 p-4 rounded-xl border border-slate-800">
                  <h4 className="text-emerald-400 font-bold text-xs uppercase mb-2">Nexo Causal</h4>
                  <p className="text-sm text-slate-400">{CASE_DATA.dossier.nexus}</p>
                </div>
                <div className="bg-slate-950 p-4 rounded-xl border border-slate-800">
                  <h4 className="text-orange-400 font-bold text-xs uppercase mb-2">Ação Recomendada</h4>
                  <p className="text-sm text-slate-400">{CASE_DATA.dossier.action}</p>
                </div>
              </div>

              <div className="border-t border-slate-800 pt-6">
                <p className="text-[10px] text-slate-500 uppercase font-bold mb-4">Evidências Digitais Rastreadeas</p>
                <div className="flex gap-2">
                    <span className="bg-slate-800 text-[10px] px-2 py-1 rounded text-slate-400 font-mono">HASH: 7a8b9c...</span>
                    <span className="bg-slate-800 text-[10px] px-2 py-1 rounded text-slate-400 font-mono">LOG: SC-JOURNEY-001</span>
                </div>
              </div>
            </div>
            <div className="p-6 bg-slate-800/50 flex gap-4">
              <button className="flex-1 bg-blue-600 text-white font-bold py-3 rounded-xl uppercase text-xs tracking-widest">Exportar PDF para Jurídico</button>
              <button onClick={() => setShowDossier(false)} className="flex-1 bg-slate-800 text-slate-400 font-bold py-3 rounded-xl uppercase text-xs tracking-widest">Fechar</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
