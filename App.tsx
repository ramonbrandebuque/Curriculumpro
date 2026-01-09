
import React, { useState, useEffect, useMemo } from 'react';
import { 
  FileText, Upload, Target, Cpu, CheckCircle, AlertCircle, Download, Crown,
  ChevronRight, RefreshCw, FileSearch, Lock, Zap, ShieldCheck, Star, ArrowLeft,
  ChevronDown, History, Trash2, Calendar, ExternalLink, ClipboardPaste, Eraser,
  XCircle, Columns, Eye, Sparkles, ArrowUpRight, Linkedin, Copy, Check, Moon, Sun, Languages, Globe, Languages as LanguageIcon, Info, Share2, ArrowLeftCircle, BarChart3, ListChecks, MessageSquareText, Link as LinkIcon
} from 'lucide-react';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts';
import * as Diff from 'diff';
import { analyzeResume } from './geminiService';
import { AppState, UserCV, AnalysisResult, LanguageCode, ScoreFactor } from './types';

interface HistoryItem {
  id: string;
  date: string;
  jobTitle: string;
  score: number;
  analysis: AnalysisResult;
  originalContent?: string;
}

const translations = {
  'pt-BR': {
    heroTitle: 'Impulsione sua Carreira com',
    heroSubtitle: 'Análise instantânea de currículos baseada em algoritmos ATS. Aumente suas chances de entrevista em até 10x.',
    navOptimizer: 'Otimizador',
    navHistory: 'Meu Histórico',
    translateLabel: 'Traduzir para:',
    original: 'Original',
    optimized: 'IA Otimizado',
    comparison: 'Comparar Versões',
    download: 'Baixar Otimizado',
    viewJob: 'Ver Vaga',
    linkedinIntegration: 'LinkedIn Otimizado',
    scoreDetails: 'Detalhamento da Nota',
    share: 'Compartilhar',
    shareMessage: 'Consegui um score de {score} para a vaga de {job} no ResumeCVPro! Otimize seu currículo também: {url}',
    hoverInstruction: 'PASSE O MOUSE PARA DETALHES',
    viewDetails: 'Ver Detalhes da Nota',
    backToSummary: 'Voltar ao Resumo',
    summaryTitle: 'Resultado da Análise',
    detailedScoreTitle: 'Detalhamento Profundo',
    comparisonTitle: 'Comparação de Versões',
    linkedinTitle: 'LinkedIn Otimizado'
  },
  'en': {
    heroTitle: 'Boost your Career with',
    heroSubtitle: 'Instant resume analysis based on ATS algorithms. Increase your interview chances by up to 10x.',
    navOptimizer: 'Optimizer',
    navHistory: 'My History',
    translateLabel: 'Translate to:',
    original: 'Original',
    optimized: 'AI Optimized',
    comparison: 'Compare Versions',
    download: 'Download Optimized',
    viewJob: 'View Job',
    linkedinIntegration: 'LinkedIn Optimized',
    scoreDetails: 'Score Breakdown',
    share: 'Share',
    shareMessage: 'I scored {score} for the {job} position on ResumeCVPro! Optimize your resume too: {url}',
    hoverInstruction: 'HOVER FOR DETAILS',
    viewDetails: 'View Score Details',
    backToSummary: 'Back to Summary',
    summaryTitle: 'Analysis Result',
    detailedScoreTitle: 'Deep Breakdown',
    comparisonTitle: 'Version Comparison',
    linkedinTitle: 'LinkedIn Optimized'
  }
};

const motivationalMessages = [
  "Sua próxima grande oportunidade está sendo preparada...",
  "O mercado precisa de talentos como você. Estamos polindo seu brilho!",
  "Pequenos ajustes hoje, grandes conquistas amanhã. Quase lá!",
  "Você é capaz de alcançar seus objetivos. Estamos focando no seu sucesso!",
  "Transformando sua experiência em um convite para entrevista...",
  "Acredite no seu potencial. Nossa IA está destacando o melhor de você!"
];

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy text: ', err);
    }
  };

  return (
    <button
      onClick={handleCopy}
      className="p-1.5 hover:bg-white/20 rounded-xl transition-all text-white/60 hover:text-white bg-white/5"
      title="Copiar"
    >
      {copied ? <Check size={16} className="text-green-400" /> : <Copy size={16} />}
    </button>
  );
}

const VisualDiff = ({ oldText, newText, showAddsOnly = false, showRemovalsOnly = false }: { oldText: string, newText: string, showAddsOnly?: boolean, showRemovalsOnly?: boolean }) => {
  const diffs = useMemo(() => Diff.diffWords(oldText, newText), [oldText, newText]);

  return (
    <div className="whitespace-pre-wrap leading-relaxed">
      {diffs.map((part, index) => {
        if (part.added) {
          if (showRemovalsOnly) return null;
          return (
            <span 
              key={index} 
              className="bg-green-100 dark:bg-green-900/40 text-green-700 dark:text-green-300 px-0.5 rounded border-b-2 border-green-500"
            >
              {part.value}
            </span>
          );
        }
        if (part.removed) {
          if (showAddsOnly) return null;
          return (
            <span 
              key={index} 
              className="bg-red-100 dark:bg-red-900/40 text-red-700 dark:text-red-400 line-through px-0.5 rounded opacity-60 decoration-2"
            >
              {part.value}
            </span>
          );
        }
        return <span key={index}>{part.value}</span>;
      })}
    </div>
  );
};

export default function App() {
  const [view, setView] = useState<'tool' | 'history'>('tool');
  const [resultSubView, setResultSubView] = useState<'summary' | 'details' | 'comparison' | 'linkedin'>('summary');
  const [theme, setTheme] = useState<'light' | 'dark'>(() => {
    return localStorage.getItem('theme') === 'dark' ? 'dark' : 'light';
  });
  const [lang, setLang] = useState<LanguageCode>(() => {
    return (localStorage.getItem('lang') as LanguageCode) || 'pt-BR';
  });
  const [state, setState] = useState<AppState>({
    step: 'upload',
    cvData: null,
    analysis: null,
    downloadCount: 0,
    isPaid: true
  });
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [tempText, setTempText] = useState('');
  const [jobDescription, setJobDescription] = useState('');
  const [jobUrl, setJobUrl] = useState('');
  const [selectedFormat, setSelectedFormat] = useState<'pdf' | 'docx'>('pdf');
  const [targetLang, setTargetLang] = useState<LanguageCode | ''>('');
  const [shared, setShared] = useState(false);
  const [currentMotivationalIndex, setCurrentMotivationalIndex] = useState(0);

  const t = translations[lang] || translations['pt-BR'];

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, [state.step, view, resultSubView]);

  useEffect(() => {
    if (theme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
    localStorage.setItem('theme', theme);
  }, [theme]);

  useEffect(() => {
    const savedHistory = localStorage.getItem('resume_cv_pro_history');
    if (savedHistory) setHistory(JSON.parse(savedHistory));
  }, []);

  useEffect(() => {
    let interval: number | undefined;
    if (state.step === 'analyzing') {
      interval = window.setInterval(() => {
        setCurrentMotivationalIndex(prev => (prev + 1) % motivationalMessages.length);
      }, 3000);
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [state.step]);

  const toggleTheme = () => setTheme(prev => prev === 'light' ? 'dark' : 'light');

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setError(null);
    setLoading(true);
    const reader = new FileReader();
    reader.onload = (event) => {
      setTempText(event.target?.result as string || '');
      setLoading(false);
      setState(prev => ({ ...prev, step: 'job-info' }));
    };
    reader.readAsText(file);
  };

  const handleStartAnalysis = async () => {
    if (!jobDescription && !jobUrl) {
      setError("Por favor, preencha a descrição da vaga ou insira o link.");
      return;
    }
    setLoading(true);
    setState(prev => ({ ...prev, step: 'analyzing' }));

    try {
      const result = await analyzeResume(tempText, jobDescription, jobUrl, targetLang || undefined);
      const newItem: HistoryItem = {
        id: crypto.randomUUID(),
        date: new Date().toLocaleDateString('pt-BR'),
        jobTitle: jobDescription.substring(0, 50) || "Análise via Link",
        score: result.score,
        analysis: result,
        originalContent: tempText
      };
      const updatedHistory = [newItem, ...history].slice(0, 50); 
      setHistory(updatedHistory);
      localStorage.setItem('resume_cv_pro_history', JSON.stringify(updatedHistory));
      setState(prev => ({ ...prev, step: 'result', cvData: { content: tempText, targetJob: jobDescription, jobUrl }, analysis: result }));
      setResultSubView('summary');
    } catch (err: any) {
      setError(err.message);
      setState(prev => ({ ...prev, step: 'job-info' }));
    } finally {
      setLoading(false);
    }
  };

  const handleSelectHistoryItem = (item: HistoryItem) => {
    setState(prev => ({ ...prev, step: 'result', analysis: item.analysis, cvData: { content: item.originalContent || '', targetJob: item.jobTitle, jobUrl: item.analysis.linkedinOptimization ? 'linkedin-optimized' : undefined } }));
    setResultSubView('summary');
    setView('tool');
  };

  const handleReset = () => {
    setState(prev => ({ ...prev, step: 'upload', cvData: null, analysis: null }));
    setResultSubView('summary');
    setTempText('');
    setJobDescription('');
    setJobUrl('');
  };

  const handleDownload = () => {
    const content = state.analysis?.optimizedContent || "";
    const blob = new Blob([content], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `ResumeCVPro_Otimizado.${selectedFormat}`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleShare = async () => {
    const jobTitle = state.cvData?.targetJob || "Vaga Estratégica";
    const text = t.shareMessage
      .replace('{score}', state.analysis?.score.toString() || '0')
      .replace('{job}', jobTitle)
      .replace('{url}', window.location.origin);
      
    if (navigator.share) {
      try {
        await navigator.share({ title: 'ResumeCVPro', text: text, url: window.location.origin });
      } catch (e) {
        console.error("Error sharing", e);
      }
    } else {
      await navigator.clipboard.writeText(text);
      setShared(true);
      setTimeout(() => setShared(false), 2000);
    }
  };

  return (
    <div className={`min-h-screen flex flex-col transition-colors duration-300 ${theme === 'dark' ? 'bg-gray-950 text-gray-100' : 'bg-slate-50 text-slate-900'}`}>
      
      {/* Navbar */}
      <nav className={`px-6 py-4 flex items-center justify-between sticky top-0 z-50 border-b transition-colors ${theme === 'dark' ? 'bg-gray-900/80 border-gray-800 backdrop-blur-md' : 'bg-white/80 border-gray-200 backdrop-blur-md'}`}>
        <div className="flex items-center gap-2 cursor-pointer" onClick={() => setView('tool')}>
          <div className="bg-blue-600 p-2 rounded-lg"><Cpu className="text-white w-6 h-6" /></div>
          <span className="text-xl font-black tracking-tight">ResumeCV<span className="text-blue-600">Pro</span></span>
        </div>
        <div className="hidden md:flex items-center gap-8">
          <button onClick={() => setView('tool')} className={`text-sm font-bold ${view === 'tool' ? 'text-blue-600' : 'opacity-60 hover:opacity-100'}`}>{t.navOptimizer}</button>
          <button onClick={() => setView('history')} className={`text-sm font-bold ${view === 'history' ? 'text-blue-600' : 'opacity-60 hover:opacity-100'}`}>{t.navHistory}</button>
        </div>
        <div className="flex items-center gap-4">
          <button onClick={toggleTheme} className="p-2 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors">
            {theme === 'light' ? <Moon size={20} className="text-slate-600" /> : <Sun size={20} className="text-yellow-400" />}
          </button>
          <button className="bg-blue-600 text-white px-5 py-2 rounded-full text-sm font-bold hover:bg-blue-700 transition-colors">Entrar</button>
        </div>
      </nav>

      {/* Main Content */}
      <main className="flex-1 max-w-5xl mx-auto w-full px-6 py-12">
        {view === 'tool' && (
          <>
            {state.step !== 'result' && (
              <div className="text-center mb-12 animate-in fade-in duration-700">
                <h1 className="text-4xl md:text-5xl font-extrabold mb-4">{t.heroTitle} <span className="text-blue-600">IA</span></h1>
                <p className={`text-lg max-w-2xl mx-auto ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>{t.heroSubtitle}</p>
              </div>
            )}

            <StepIndicator currentStep={state.step} />

            <div className={`rounded-[2.5rem] shadow-2xl border overflow-hidden transition-colors ${theme === 'dark' ? 'bg-gray-900 border-gray-800' : 'bg-white border-gray-100 shadow-slate-200/50'}`}>
              
              {state.step === 'upload' && (
                <div className="p-10 text-center">
                  <div className="max-w-xl mx-auto">
                    <div className={`border-2 border-dashed rounded-3xl p-12 hover:border-blue-500 transition-all group cursor-pointer relative ${theme === 'dark' ? 'border-gray-700 bg-gray-800/50' : 'border-slate-200 bg-slate-50'}`}>
                      <input type="file" className="absolute inset-0 w-full h-full opacity-0 cursor-pointer" onChange={handleFileUpload} />
                      <div className="bg-blue-600/10 w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-6"><Upload className="text-blue-600 w-10 h-10" /></div>
                      <h3 className="text-2xl font-black mb-2">Envie seu Currículo</h3>
                      <p className="opacity-60 mb-6">PDF, DOCX ou TXT</p>
                    </div>
                    <div className="mt-8 flex flex-col gap-4">
                      <textarea className={`w-full h-32 p-4 rounded-2xl border ${theme === 'dark' ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'}`} placeholder="Ou cole o texto aqui..." value={tempText} onChange={(e) => setTempText(e.target.value)} />
                      <button onClick={() => setState(prev => ({ ...prev, step: 'job-info' }))} disabled={!tempText} className="bg-blue-600 text-white py-4 rounded-2xl font-black text-lg shadow-lg shadow-blue-500/20 active:scale-95 transition-all">Continuar</button>
                    </div>
                  </div>
                </div>
              )}

              {state.step === 'job-info' && (
                <div className="p-10">
                  <div className="max-w-2xl mx-auto space-y-10">
                    <div className="text-center">
                      <h3 className="text-2xl font-black flex items-center justify-center gap-2 mb-2"><Target className="text-blue-600"/> Para qual vaga você está se candidatando?</h3>
                      <p className="text-sm opacity-50 font-medium">Informe a descrição da vaga ou o link direto do LinkedIn para uma análise precisa.</p>
                    </div>

                    <div className="space-y-8">
                      <div className="space-y-4">
                        <label className="text-xs font-black uppercase tracking-widest opacity-60 flex items-center gap-2">
                          <Linkedin size={14} className="text-blue-600" /> Link da Vaga (LinkedIn)
                        </label>
                        <div className="relative group">
                          <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none opacity-40 group-focus-within:opacity-100 transition-opacity">
                            <LinkIcon size={18} />
                          </div>
                          <input 
                            type="text"
                            className={`w-full pl-11 pr-4 py-4 rounded-2xl border outline-none transition-all ${theme === 'dark' ? 'bg-gray-800 border-gray-700 focus:border-blue-500' : 'bg-gray-50 border-gray-200 focus:border-blue-500 focus:bg-white'}`}
                            value={jobUrl}
                            onChange={(e) => setJobUrl(e.target.value)}
                            placeholder="https://www.linkedin.com/jobs/view/..."
                          />
                        </div>
                      </div>

                      <div className="flex items-center gap-4">
                        <div className="h-px flex-1 bg-gray-100 dark:bg-gray-800" />
                        <span className="text-[10px] font-black opacity-30 uppercase tracking-[0.3em]">Ou</span>
                        <div className="h-px flex-1 bg-gray-100 dark:bg-gray-800" />
                      </div>

                      <div className="space-y-4">
                        <label className="text-xs font-black uppercase tracking-widest opacity-60 flex items-center gap-2">
                          <FileSearch size={14} className="text-blue-600" /> Descrição da Vaga (Texto)
                        </label>
                        <textarea 
                          className={`w-full h-48 p-5 rounded-2xl border outline-none transition-all resize-none ${theme === 'dark' ? 'bg-gray-800 border-gray-700 focus:border-blue-500' : 'bg-gray-50 border-gray-200 focus:border-blue-500 focus:bg-white'}`} 
                          value={jobDescription} 
                          onChange={(e) => setJobDescription(e.target.value)} 
                          placeholder="Cole aqui as competências, responsabilidades e requisitos da vaga..." 
                        />
                      </div>
                    </div>

                    <div className="flex gap-4 pt-4">
                      <button onClick={() => setState(prev => ({ ...prev, step: 'upload' }))} className="flex-1 py-4 border rounded-2xl font-bold opacity-60 hover:opacity-100 transition-all flex items-center justify-center gap-2">
                        <ArrowLeft size={18} /> Voltar
                      </button>
                      <button 
                        onClick={handleStartAnalysis} 
                        disabled={!jobDescription && !jobUrl} 
                        className="flex-[2] bg-blue-600 text-white py-4 rounded-2xl font-black text-lg shadow-xl shadow-blue-500/20 active:scale-95 transition-transform disabled:opacity-50 disabled:active:scale-100"
                      >
                        Analisar Agora
                      </button>
                    </div>

                    {error && (
                      <div className="p-4 bg-red-600/10 text-red-600 rounded-2xl text-sm font-bold flex items-center gap-2 animate-in fade-in duration-300">
                        <AlertCircle size={18} /> {error}
                      </div>
                    )}
                  </div>
                </div>
              )}

              {state.step === 'analyzing' && (
                <div className="p-20 text-center flex flex-col items-center gap-8 animate-in fade-in duration-500">
                  <div className="relative">
                    <div className="w-24 h-24 border-4 border-blue-600/20 rounded-full animate-spin border-t-blue-600"></div>
                    <div className="absolute inset-0 flex items-center justify-center">
                       <Sparkles className="text-blue-600 w-8 h-8 animate-pulse" />
                    </div>
                  </div>
                  <div className="space-y-4 max-w-md">
                    <h3 className="text-2xl font-black tracking-tight">Otimizando sua Carreira...</h3>
                    <p className="text-lg font-medium opacity-80 leading-relaxed min-h-[4rem] text-blue-600/80 dark:text-blue-400">
                      {motivationalMessages[currentMotivationalIndex]}
                    </p>
                  </div>
                </div>
              )}

              {state.step === 'result' && state.analysis && (
                <div className="p-6 md:p-10 animate-in fade-in zoom-in-95 duration-500">
                  
                  <div className="flex items-center justify-between mb-8 border-b dark:border-gray-800 pb-6 flex-wrap gap-4">
                    <div className="flex items-center gap-4">
                      {resultSubView !== 'summary' && (
                        <button onClick={() => setResultSubView('summary')} className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-full transition-colors text-blue-600">
                          <ArrowLeftCircle size={24} />
                        </button>
                      )}
                      <div>
                        <h2 className="text-2xl font-black leading-tight">
                          {resultSubView === 'summary' && t.summaryTitle}
                          {resultSubView === 'details' && t.detailedScoreTitle}
                          {resultSubView === 'comparison' && t.comparisonTitle}
                          {resultSubView === 'linkedin' && t.linkedinTitle}
                        </h2>
                        {resultSubView === 'summary' && <p className="text-xs font-bold opacity-40 uppercase tracking-widest mt-1">Soma das notas detalhadas</p>}
                      </div>
                    </div>
                    
                    <div className="flex gap-2 bg-gray-100 dark:bg-gray-800 p-1 rounded-2xl overflow-x-auto">
                      <button 
                        onClick={() => setResultSubView('summary')} 
                        className={`px-5 py-2.5 rounded-xl text-xs font-black transition-all shrink-0 ${resultSubView === 'summary' ? 'bg-white dark:bg-gray-700 text-blue-600 shadow-md' : 'opacity-40 hover:opacity-80'}`}
                      >
                        Resumo
                      </button>
                      <button 
                        onClick={() => setResultSubView('details')} 
                        className={`px-5 py-2.5 rounded-xl text-xs font-black transition-all shrink-0 ${resultSubView === 'details' ? 'bg-white dark:bg-gray-700 text-blue-600 shadow-md' : 'opacity-40 hover:opacity-80'}`}
                      >
                        Notas
                      </button>
                      <button 
                        onClick={() => setResultSubView('comparison')} 
                        className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-black transition-all shrink-0 ${resultSubView === 'comparison' ? 'bg-white dark:bg-gray-700 text-blue-600 shadow-md' : 'opacity-40 hover:opacity-80'}`}
                      >
                        Comparação
                      </button>
                      <button 
                        onClick={() => setResultSubView('linkedin')} 
                        className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-black transition-all shrink-0 ${resultSubView === 'linkedin' ? 'bg-white dark:bg-gray-700 text-blue-600 shadow-md' : 'opacity-40 hover:opacity-80'}`}
                      >
                        <Linkedin size={14}/> LinkedIn
                      </button>
                    </div>
                  </div>

                  {resultSubView === 'summary' && (
                    <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 animate-in fade-in slide-in-from-left-4 duration-500">
                      <div className="lg:col-span-4 space-y-6">
                        <div className={`p-8 rounded-[2.5rem] border text-left transition-all relative overflow-hidden group ${theme === 'dark' ? 'bg-gray-950 border-gray-800' : 'bg-white border-gray-100 shadow-xl shadow-slate-200/40'}`}>
                           <div className="flex items-center justify-between mb-8">
                             <h4 className="text-[10px] font-black opacity-30 uppercase tracking-[0.2em]">Score Geral</h4>
                             <Sparkles size={16} className="text-blue-600 animate-pulse" />
                           </div>
                           
                           <div className="relative w-48 h-48 mx-0 mb-6">
                              <ResponsiveContainer width="100%" height="100%">
                                <PieChart>
                                  <Pie 
                                    data={[{ value: state.analysis.score }, { value: 100 - state.analysis.score }]} 
                                    cx="50%" cy="50%" innerRadius="70%" outerRadius="90%" startAngle={90} endAngle={450} paddingAngle={5} dataKey="value" stroke="none"
                                  >
                                    <Cell fill="#2563eb" className="drop-shadow-[0_0_8px_rgba(37,99,235,0.4)]" />
                                    <Cell fill={theme === 'dark' ? '#1f2937' : '#f1f5f9'} />
                                  </Pie>
                                </PieChart>
                              </ResponsiveContainer>
                              <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                                <span className="text-6xl font-black text-blue-600 tracking-tighter">{state.analysis.score}</span>
                                <span className="text-[10px] font-bold opacity-30 tracking-widest uppercase mt-1">Pts</span>
                              </div>
                           </div>
                           
                           <button onClick={() => setResultSubView('details')} className="w-full flex items-center justify-center gap-2 py-4 rounded-2xl bg-blue-600/5 text-blue-600 text-xs font-black hover:bg-blue-600/10 transition-colors border border-blue-600/10">
                              <BarChart3 size={16}/> {t.viewDetails}
                           </button>
                        </div>

                        <div className={`p-6 rounded-[2.5rem] border ${theme === 'dark' ? 'bg-gray-950 border-gray-800' : 'bg-white border-gray-100 shadow-xl'}`}>
                           <h4 className="text-[10px] font-black opacity-30 uppercase tracking-[0.2em] mb-6">Componentes do Score</h4>
                           <div className="space-y-4">
                             {state.analysis.scoreBreakdown.map((f, i) => (
                               <div key={i} className="flex items-center justify-between group cursor-default">
                                  <span className="text-xs font-bold opacity-60 group-hover:opacity-100 transition-opacity truncate max-w-[150px]">{f.category}</span>
                                  <div className="flex items-center gap-3 shrink-0">
                                    <div className="w-16 h-1 bg-gray-100 dark:bg-gray-800 rounded-full overflow-hidden">
                                      <div className="h-full bg-blue-600" style={{ width: `${(f.score/f.maxScore)*100}%` }} />
                                    </div>
                                    <span className="text-[10px] font-black text-blue-600 shrink-0">{f.score}/{f.maxScore}</span>
                                  </div>
                               </div>
                             ))}
                           </div>
                        </div>
                      </div>

                      <div className="lg:col-span-8 space-y-6">
                        <div className={`p-8 rounded-[3rem] border relative overflow-hidden ${theme === 'dark' ? 'bg-gray-900 border-gray-800' : 'bg-white border-slate-100 shadow-2xl shadow-slate-200/50'}`}>
                          <div className="flex items-center justify-between mb-8 flex-wrap gap-4">
                            <div>
                              <h4 className="text-lg font-black text-blue-600">Prévia Otimizada</h4>
                              <p className="text-[10px] font-bold opacity-40 uppercase tracking-widest mt-1">Pronto para download</p>
                            </div>
                            <div className="flex gap-2 bg-gray-100 dark:bg-gray-800 p-1 rounded-2xl">
                               <button onClick={() => setSelectedFormat('pdf')} className={`px-5 py-2 rounded-xl text-[10px] font-black transition-all ${selectedFormat === 'pdf' ? 'bg-white dark:bg-gray-700 text-blue-600 shadow-sm' : 'opacity-40 hover:opacity-100'}`}>PDF</button>
                               <button onClick={() => setSelectedFormat('docx')} className={`px-5 py-2 rounded-xl text-[10px] font-black transition-all ${selectedFormat === 'docx' ? 'bg-white dark:bg-gray-700 text-blue-600 shadow-sm' : 'opacity-40 hover:opacity-100'}`}>DOCX</button>
                            </div>
                          </div>
                          
                          <div className="max-h-[450px] overflow-y-auto custom-scrollbar font-mono text-[11px] leading-loose opacity-80 bg-slate-50/50 dark:bg-black/20 p-6 rounded-[2rem] border dark:border-gray-800 shadow-inner">
                            {state.analysis.optimizedContent}
                          </div>
                          
                          <div className="mt-8 flex gap-4 flex-wrap">
                            <button onClick={handleShare} className={`flex-1 min-w-[150px] flex items-center justify-center gap-2 py-4 rounded-2xl font-black text-sm transition-all active:scale-95 shadow-lg ${shared ? 'bg-green-600 text-white shadow-green-500/20' : 'bg-blue-600/10 text-blue-600 shadow-blue-500/5'}`}>
                              {shared ? <Check size={18}/> : <Share2 size={18}/>} {shared ? 'Copiado!' : t.share}
                            </button>
                            <button onClick={handleDownload} className="flex-[2] min-w-[200px] bg-blue-600 text-white py-4 rounded-2xl font-black text-sm shadow-xl shadow-blue-500/30 flex items-center justify-center gap-2 active:scale-95 transition-transform">
                              <Download size={18}/> {t.download}
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                  {resultSubView === 'details' && (
                    <div className="animate-in fade-in slide-in-from-right-4 duration-500">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                        {state.analysis.scoreBreakdown.map((factor, i) => (
                          <div key={i} className={`p-8 rounded-[2.5rem] border group transition-all hover:shadow-2xl ${theme === 'dark' ? 'bg-gray-950 border-gray-800' : 'bg-white border-gray-100 shadow-xl shadow-slate-200/40'}`}>
                            <div className="flex items-center justify-between mb-8">
                              <div className="flex items-center gap-4">
                                <div className="p-3 bg-blue-600/10 rounded-2xl text-blue-600 group-hover:scale-110 transition-transform"><ListChecks size={24}/></div>
                                <div>
                                  <h4 className="text-xl font-black">{factor.category}</h4>
                                  <p className="text-[10px] font-bold opacity-30 uppercase tracking-widest mt-1">Análise Técnica Fiel</p>
                                </div>
                              </div>
                              <div className="text-3xl font-black text-blue-600 tracking-tighter">{factor.score}<span className="text-xs opacity-20 ml-1 font-bold">/{factor.maxScore}</span></div>
                            </div>
                            <div className="w-full h-2.5 bg-gray-100 dark:bg-gray-800 rounded-full mb-6 overflow-hidden shadow-inner">
                              <div className="h-full bg-blue-600 shadow-[0_0_10px_rgba(37,99,235,0.3)] transition-all duration-1000" style={{ width: `${(factor.score / factor.maxScore) * 100}%` }} />
                            </div>
                            <div className="bg-slate-50 dark:bg-black/10 p-5 rounded-2xl border dark:border-gray-800 border-slate-100">
                              <p className="text-sm opacity-70 leading-relaxed italic">{factor.details}</p>
                            </div>
                          </div>
                        ))}
                      </div>

                      <div className="mt-12 grid grid-cols-1 md:grid-cols-3 gap-8">
                        <div className={`p-8 rounded-[2.5rem] border ${theme === 'dark' ? 'bg-blue-900/10 border-blue-900/30' : 'bg-blue-50 border-blue-100 shadow-lg shadow-blue-500/5'}`}>
                          <h5 className="font-black text-[10px] uppercase tracking-[0.2em] mb-6 flex items-center gap-2 text-blue-600"><CheckCircle size={16}/> Pontos Fortes</h5>
                          <ul className="space-y-4">
                            {state.analysis.strengths.map((s, i) => (
                              <li key={i} className="text-xs font-bold opacity-70 leading-relaxed flex gap-2">
                                <div className="w-1.5 h-1.5 bg-blue-600 rounded-full shrink-0 mt-1.5" />
                                {s}
                              </li>
                            ))}
                          </ul>
                        </div>
                        <div className={`p-8 rounded-[2.5rem] border ${theme === 'dark' ? 'bg-amber-900/10 border-amber-900/30' : 'bg-amber-50 border-amber-100 shadow-lg shadow-amber-500/5'}`}>
                          <h5 className="font-black text-[10px] uppercase tracking-[0.2em] mb-6 flex items-center gap-2 text-amber-600"><MessageSquareText size={16}/> Sugestões</h5>
                          <ul className="space-y-4">
                            {state.analysis.suggestions.map((s, i) => (
                              <li key={i} className="text-xs font-bold opacity-70 leading-relaxed flex gap-2">
                                <div className="w-1.5 h-1.5 bg-amber-600 rounded-full shrink-0 mt-1.5" />
                                {s}
                              </li>
                            ))}
                          </ul>
                        </div>
                        <div className={`p-8 rounded-[2.5rem] border ${theme === 'dark' ? 'bg-red-900/10 border-red-900/30' : 'bg-red-50 border-red-100 shadow-lg shadow-red-500/5'}`}>
                          <h5 className="font-black text-[10px] uppercase tracking-[0.2em] mb-6 flex items-center gap-2 text-red-600"><Target size={16}/> Palavras Ausentes</h5>
                          <div className="flex flex-wrap gap-2">
                            {state.analysis.missingKeywords.map((kw, i) => (
                              <span key={i} className="px-3 py-1.5 bg-red-600/10 rounded-xl text-[10px] font-black text-red-600 border border-red-600/10">{kw}</span>
                            ))}
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                  {resultSubView === 'comparison' && (
                    <div className="space-y-10 animate-in fade-in slide-in-from-bottom-4 duration-500">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
                         <div className="space-y-6">
                           <div className="flex items-center justify-between px-4">
                             <div>
                               <h5 className="text-[10px] font-black opacity-30 uppercase tracking-[0.2em]">{t.original}</h5>
                               <p className="text-xs font-black mt-1">Versão Enviada</p>
                             </div>
                             <span className="text-[9px] font-black text-red-600 bg-red-600/10 px-4 py-1.5 rounded-full border border-red-600/10">REMOÇÕES</span>
                           </div>
                           <div className={`p-8 h-[650px] overflow-y-auto rounded-[3rem] border text-xs font-mono custom-scrollbar leading-loose ${theme === 'dark' ? 'bg-gray-950 border-gray-800 text-gray-500' : 'bg-white border-slate-200 shadow-inner'}`}>
                             <VisualDiff oldText={state.cvData?.content || ''} newText={state.analysis.optimizedContent} showRemovalsOnly={true} />
                           </div>
                         </div>
                         <div className="space-y-6">
                           <div className="flex items-center justify-between px-4">
                             <div>
                               <h5 className="text-[10px] font-black text-blue-600 uppercase tracking-[0.2em]">{t.optimized}</h5>
                               <p className="text-xs font-black mt-1">Versão IA ResumeCVPro</p>
                             </div>
                             <span className="text-[9px] font-black text-green-600 bg-green-600/10 px-4 py-1.5 rounded-full border border-green-600/10 flex items-center gap-1"><Sparkles size={10}/> ADIÇÕES</span>
                           </div>
                           <div className={`p-8 h-[650px] overflow-y-auto rounded-[3rem] border text-xs font-mono custom-scrollbar leading-loose ${theme === 'dark' ? 'bg-blue-600/5 border-blue-600/20 text-blue-100' : 'bg-blue-50/20 border-blue-100 shadow-inner'}`}>
                             <VisualDiff oldText={state.cvData?.content || ''} newText={state.analysis.optimizedContent} showAddsOnly={true} />
                           </div>
                         </div>
                      </div>
                    </div>
                  )}

                  {resultSubView === 'linkedin' && state.analysis.linkedinOptimization && (
                    <div className="animate-in fade-in slide-in-from-right-4 duration-500 max-w-3xl mx-auto space-y-10">
                       <div className={`p-10 rounded-[3rem] border relative overflow-hidden ${theme === 'dark' ? 'bg-gray-950 border-gray-800 shadow-black' : 'bg-white border-blue-50 shadow-2xl shadow-blue-500/10'}`}>
                          <div className="flex items-center gap-4 mb-10">
                             <div className="p-3 bg-blue-600 rounded-2xl text-white shadow-lg shadow-blue-600/20"><Linkedin size={28}/></div>
                             <div>
                                <h3 className="text-2xl font-black">Seu Perfil LinkedIn Otimizado</h3>
                                <p className="text-[10px] font-bold opacity-40 uppercase tracking-[0.2em]">Melhorado pela IA</p>
                             </div>
                          </div>

                          <div className="space-y-10">
                             <div className="space-y-4">
                                <div className="flex items-center justify-between">
                                   <h4 className="text-xs font-black uppercase tracking-[0.1em] opacity-60">Título Profissional (Headline)</h4>
                                   <CopyButton text={state.analysis.linkedinOptimization.headline} />
                                </div>
                                <div className={`p-6 rounded-2xl border ${theme === 'dark' ? 'bg-blue-600/5 border-blue-600/20' : 'bg-blue-50 border-blue-100 shadow-inner'}`}>
                                   <p className="text-sm font-bold leading-relaxed text-blue-600 dark:text-blue-400 italic">
                                      "{state.analysis.linkedinOptimization.headline}"
                                   </p>
                                </div>
                             </div>

                             <div className="space-y-4">
                                <div className="flex items-center justify-between">
                                   <h4 className="text-xs font-black uppercase tracking-[0.1em] opacity-60">Sobre (About)</h4>
                                   <CopyButton text={state.analysis.linkedinOptimization.about} />
                                </div>
                                <div className={`p-8 rounded-[2rem] border whitespace-pre-wrap leading-relaxed ${theme === 'dark' ? 'bg-gray-900 border-gray-800' : 'bg-slate-50 border-slate-100 shadow-inner'}`}>
                                   <p className="text-sm opacity-80 leading-loose">
                                      {state.analysis.linkedinOptimization.about}
                                   </p>
                                </div>
                             </div>
                          </div>
                       </div>
                    </div>
                  )}

                  <div className="mt-12 pt-8 border-t dark:border-gray-800 flex justify-between items-center flex-wrap gap-4">
                    <button onClick={handleReset} className="flex items-center gap-2 px-6 py-3 rounded-2xl font-bold opacity-40 hover:opacity-100 transition-all text-xs">
                      <RefreshCw size={14}/> Começar Novo Currículo
                    </button>
                    {resultSubView !== 'summary' && (
                      <button onClick={() => setResultSubView('summary')} className="flex items-center gap-2 px-8 py-4 rounded-2xl bg-blue-600 text-white font-black text-sm hover:scale-105 transition-transform active:scale-95 shadow-xl shadow-blue-500/20">
                        <ArrowLeft size={16}/> {t.backToSummary}
                      </button>
                    )}
                  </div>
                </div>
              )}
            </div>
          </>
        )}

        {view === 'history' && <HistoryPage history={history} onSelect={handleSelectHistoryItem} onDelete={(id: string) => setHistory(h => h.filter(x => x.id !== id))} theme={theme} />}
      </main>
    </div>
  );
}

function StepIndicator({ currentStep }: { currentStep: string }) {
  const steps = ['upload', 'job-info', 'result'];
  const currentIndex = steps.indexOf(currentStep === 'analyzing' ? 'job-info' : currentStep);
  if (currentStep === 'upload' || currentStep === 'analyzing' || currentStep === 'job-info') {
    return (
      <div className="flex items-center justify-center gap-4 mb-10">
        {steps.map((s, i) => (
          <React.Fragment key={s}>
            <div className={`w-3.5 h-3.5 rounded-full transition-all duration-700 ${i <= currentIndex ? 'bg-blue-600 scale-125 shadow-[0_0_15px_rgba(37,99,235,0.4)]' : 'bg-gray-300 dark:bg-gray-800'}`} />
            {i < steps.length - 1 && <div className={`h-[2px] w-12 rounded transition-all duration-700 ${i < currentIndex ? 'bg-blue-600' : 'bg-gray-300 dark:bg-gray-800'}`} />}
          </React.Fragment>
        ))}
      </div>
    );
  }
  return null;
}

function HistoryPage({ history, onSelect, onDelete, theme }: any) {
  return (
    <div className="animate-in slide-in-from-bottom-8 duration-700">
      <div className="flex items-center justify-between mb-12">
        <h2 className="text-4xl font-black flex items-center gap-4"><History className="text-blue-600 w-10 h-10"/> Histórico</h2>
        <div className="px-4 py-2 bg-blue-600/10 rounded-xl text-blue-600 text-xs font-black">{history.length} Registros</div>
      </div>
      {history.length === 0 ? <div className="text-center py-24 opacity-30 italic font-bold">Nenhum registro encontrado ainda.</div> : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {history.map((h: any) => (
            <div key={h.id} className={`p-8 rounded-[2.5rem] border group transition-all hover:scale-105 hover:shadow-2xl ${theme === 'dark' ? 'bg-gray-900 border-gray-900 hover:border-blue-600/30' : 'bg-white border-gray-100 shadow-xl shadow-slate-200/40'}`}>
               <div className="mb-8">
                 <div className="text-[10px] font-black opacity-30 mb-3 uppercase tracking-widest flex items-center justify-between">
                   {h.date}
                   <CheckCircle size={14} className="text-blue-600 opacity-0 group-hover:opacity-100 transition-opacity" />
                 </div>
                 <h4 className="font-black text-xl line-clamp-2 leading-tight min-h-[3rem] group-hover:text-blue-600 transition-colors">{h.jobTitle}</h4>
               </div>
               <div className="flex items-end justify-between">
                 <div>
                    <div className="text-blue-600 font-black text-5xl tracking-tighter">{h.score}</div>
                    <div className="text-[10px] font-bold opacity-30 uppercase tracking-widest">Score ATS</div>
                 </div>
                 <div className="flex gap-2">
                   <button onClick={() => onSelect(h)} className="px-6 py-3 bg-blue-600 text-white rounded-2xl font-black text-sm shadow-lg shadow-blue-500/20 active:scale-95 transition-transform">Ver</button>
                   <button onClick={() => onDelete(h.id)} className="p-3 bg-red-600/10 text-red-600 rounded-2xl hover:bg-red-600 hover:text-white transition-all active:scale-95"><Trash2 size={20}/></button>
                 </div>
               </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
