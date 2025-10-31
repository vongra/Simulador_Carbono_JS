'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import dynamic from 'next/dynamic';
import html2canvas from 'html2canvas';
import {
  Y0,
  RES_ORDER,
  PROCS,
  HUMAN_PROCS,
  integrate_substeps,
  a_effective,
  fluxes_by_name,
  res_pretty_name
} from '@/lib/simulation';
import {
  boxes,
  ARROWS,
  ARROW_COLOR_NAT,
  ARROW_COLOR_HUM,
  dynamic_rects,
  anchor_point_from_rect,
  resolve_via,
  label_text_and_fs,
  fmt_flux,
  fmt_speed,
  fmt_years,
  midpoint_with_normal,
  is_human_process
} from '@/lib/visualization';

// Import dinâmico do Plotly para evitar SSR issues
const Plot = dynamic(() => import('react-plotly.js'), { ssr: false });

// ===================== CONSTANTES =====================

const INTERVAL_MS = 200; // 200ms por tick
const MAX_HISTORY_LEN = 2000;
const GAP = 0.010;
const LINE_WIDTH = 2.2;
const HEAD_SIZE = 1.05;
const HEAD_WIDTH = 2.4;

// Processos que terão sliders (solicitação: apenas 4)
const SLIDER_PROCESSES = [
  'Fotossíntese',
  'Respiração autotrófica',
  'Decomposição',
  'Respiração heterotrófica'
];

// ===================== COMPONENTE PRINCIPAL =====================

export default function CarbonCycleSimulator() {
  // Estados principais
  const [y, setY] = useState(Y0);
  const [t, setT] = useState(0.0);
  const [isRunning, setIsRunning] = useState(true);
  const [speed, setSpeed] = useState(1);
  const [viewMode, setViewMode] = useState('diagram'); // 'diagram' ou 'timeseries'
  
  // Parâmetros dos processos
  const [processParams, setProcessParams] = useState(() => {
    const params = {};
    PROCS.forEach(([name]) => {
      params[name] = 0.0;
    });
    return params;
  });
  
  // Processos humanos (inputs diretos)
  const [humanFluxes, setHumanFluxes] = useState({
    'Desmatamento': 0.0,
    'Queima de Combustíveis Fósseis': 0.0
  });
  
  // Histórico para gráfico temporal
  const [history, setHistory] = useState(() => init_history());
  
  // Refs
  const timeseriesRef = useRef(null);
  
  // ===================== FUNÇÕES AUXILIARES =====================
  
  function init_history() {
    const hist = { t: [0.0] };
    RES_ORDER.forEach(r => {
      hist[r] = [Y0[r]];
    });
    return hist;
  }
  
  function push_history(hist, time, state) {
    const newHist = { ...hist };
    newHist.t = [...newHist.t, time];
    
    RES_ORDER.forEach(r => {
      newHist[r] = [...newHist[r], state[r]];
    });
    
    // Limita tamanho
    const keys = ['t', ...RES_ORDER];
    keys.forEach(k => {
      if (newHist[k].length > MAX_HISTORY_LEN) {
        newHist[k] = newHist[k].slice(-MAX_HISTORY_LEN);
      }
    });
    
    return newHist;
  }
  
  // ===================== TICK DA SIMULAÇÃO =====================
  
  useEffect(() => {
    if (!isRunning || speed === 0) return;
    
    const interval = setInterval(() => {
      setY(prevY => {
        const dt_years = speed * (INTERVAL_MS / 1000.0);
        const y_next = integrate_substeps(
          prevY,
          processParams,
          humanFluxes,
          dt_years
        );
        return y_next;
      });
      
      setT(prevT => {
        const dt_years = speed * (INTERVAL_MS / 1000.0);
        return prevT + dt_years;
      });
      
      setHistory(prevHist => {
        const dt_years = speed * (INTERVAL_MS / 1000.0);
        const newT = t + dt_years;
        return push_history(prevHist, newT, y);
      });
    }, INTERVAL_MS);
    
    return () => clearInterval(interval);
  }, [isRunning, speed, processParams, humanFluxes, y, t]);
  
  // ===================== HANDLERS =====================
  
  const handleReset = useCallback(() => {
    setY(Y0);
    setT(0.0);
    setHistory(init_history());
    setSpeed(1.0);
    setIsRunning(true);
    
    const params = {};
    PROCS.forEach(([name]) => {
      params[name] = 0.0;
    });
    setProcessParams(params);
    
    setHumanFluxes({
      'Desmatamento': 0.0,
      'Queima de Combustíveis Fósseis': 0.0
    });
    
    setViewMode('diagram');
  }, []);
  
  const handleToggleView = useCallback(() => {
    setViewMode(prev => prev === 'diagram' ? 'timeseries' : 'diagram');
  }, []);
  
  const handleTogglePlay = useCallback(() => {
    setIsRunning(prev => !prev);
  }, []);
  
  const handleDownloadTimeseries = useCallback(async () => {
    if (!timeseriesRef.current) return;
    
    try {
      const canvas = await html2canvas(timeseriesRef.current, {
        backgroundColor: '#363636',
        scale: 2,
        logging: false,
        useCORS: true,
        allowTaint: true,
        scrollY: -window.scrollY,
        scrollX: -window.scrollX,
        windowWidth: timeseriesRef.current.scrollWidth,
        windowHeight: timeseriesRef.current.scrollHeight
      });
      
      const link = document.createElement('a');
      link.download = `ciclo-carbono-${Math.round(t)}-anos.png`;
      link.href = canvas.toDataURL('image/png');
      link.click();
    } catch (error) {
      console.error('Erro ao exportar gráfico:', error);
      alert('Erro ao exportar gráfico. Tente novamente.');
    }
  }, [t]);
  
  // ===================== GERAÇÃO DO DIAGRAMA =====================
  
  const makeDiagram = useCallback(() => {
    const rects = dynamic_rects(y);
    const shapes = [];
    const annotations = [];
    
    // Caixas
    Object.entries(boxes).forEach(([key, b]) => {
      const [x0, y0, x1, y1] = rects[key];
      
      shapes.push({
        type: 'rect',
        xref: 'x',
        yref: 'y',
        x0,
        y0,
        x1,
        y1,
        line: { color: 'black', width: 1.2 },
        fillcolor: b.fill
      });
      
      const [text, fs] = label_text_and_fs(key, y[key], y, rects[key]);
      annotations.push({
        x: (x0 + x1) / 2,
        y: (y0 + y1) / 2,
        xref: 'x',
        yref: 'y',
        showarrow: false,
        text,
        font: { size: fs, color: '#0b0b0b' },
        xanchor: 'center',
        yanchor: 'middle',
        align: 'center'
      });
    });
    
    // Calcula fluxos atuais para labels dinâmicos
    const a_eff = a_effective(processParams, y);
    const F_name = fluxes_by_name(a_eff, y, humanFluxes);
    
    // Setas
    ARROWS.forEach(([src, sside, dst, dside, label, vias, nudge]) => {
      const s = anchor_point_from_rect(rects[src], sside, GAP);
      const e = anchor_point_from_rect(rects[dst], dside, GAP);
      const resolvedVias = vias.map(v => resolve_via(v, rects));
      const pts = [s, ...resolvedVias, e];
      
      // Label dinâmico
      const baseName = label.split('(')[0].trim();
      let useLabel = label;
      
      if (F_name[baseName] !== undefined) {
        useLabel = `${baseName} (${fmt_flux(F_name[baseName])} GtC/ano)`;
      }
      
      const labelBold = useLabel.includes('(')
        ? `<b>${useLabel.split('(')[0].trim()}</b> (${useLabel.split('(')[1]}`
        : `<b>${useLabel}</b>`;
      
      const isHuman = is_human_process(baseName);
      const lineColor = isHuman ? ARROW_COLOR_HUM : ARROW_COLOR_NAT;
      
      // Path da seta
      const pathStr = pts.map((p, i) =>
        i === 0 ? `M ${p[0]} ${p[1]}` : `L ${p[0]} ${p[1]}`
      ).join(' ');
      
      shapes.push({
        type: 'path',
        xref: 'x',
        yref: 'y',
        path: pathStr,
        line: { color: lineColor, width: LINE_WIDTH }
      });
      
      // Cabeça da seta
      const [x0, y0] = pts[pts.length - 2];
      const [x1, y1] = pts[pts.length - 1];
      annotations.push({
        x: x1,
        y: y1,
        ax: x0,
        ay: y0,
        xref: 'x',
        yref: 'y',
        axref: 'x',
        ayref: 'y',
        text: '',
        showarrow: true,
        arrowhead: 3,
        arrowsize: HEAD_SIZE,
        arrowwidth: HEAD_WIDTH,
        arrowcolor: lineColor
      });
      
      // Label da seta
      const [lx, ly] = midpoint_with_normal(pts, nudge);
      annotations.push({
        x: lx,
        y: ly,
        xref: 'x',
        yref: 'y',
        showarrow: false,
        text: labelBold,
        font: { size: 11, color: '#111' },
        bgcolor: 'rgba(255,255,255,0.88)',
        bordercolor: 'rgba(0,0,0,0.15)',
        borderwidth: 1,
        borderpad: 2
      });
    });
    
    return {
      data: [],
      layout: {
        height: 820,
        margin: { l: 50, r: 50, t: 40, b: 40 },
        paper_bgcolor: 'rgb(54,54,54)',
        plot_bgcolor: 'rgb(54,54,54)',
        xaxis: {
          visible: false,
          range: [-0.12, 1.12],
          fixedrange: true
        },
        yaxis: {
          visible: false,
          range: [0, 1],
          fixedrange: true,
          scaleanchor: 'x',
          scaleratio: 1
        },
        shapes,
        annotations
      },
      config: { displayModeBar: false }
    };
  }, [y, processParams, humanFluxes]);
  
  // ===================== GERAÇÃO DO GRÁFICO TEMPORAL =====================
  
  const makeTimeseries = useCallback(() => {
    const traces = [];
    
    // Ciclo rápido
    ['A', 'V', 'S', 'Os'].forEach(r => {
      traces.push({
        x: history.t,
        y: history[r],
        mode: 'lines',
        name: res_pretty_name(r),
        line: { width: 2 },
        xaxis: 'x',
        yaxis: 'y'
      });
    });
    
    // Ciclo lento - eixo primário
    ['Od', 'F'].forEach(r => {
      traces.push({
        x: history.t,
        y: history[r],
        mode: 'lines',
        name: res_pretty_name(r),
        line: { width: 2 },
        xaxis: 'x2',
        yaxis: 'y2'
      });
    });
    
    // R - eixo secundário
    traces.push({
      x: history.t,
      y: history.R,
      mode: 'lines',
      name: `${res_pretty_name('R')} (eixo dir.)`,
      line: { width: 2 },
      xaxis: 'x2',
      yaxis: 'y3'
    });
    
    return {
      data: traces,
      layout: {
        height: 820,
        margin: { l: 80, r: 80, t: 120, b: 80 },
        paper_bgcolor: 'rgb(54,54,54)',
        plot_bgcolor: 'rgb(54,54,54)',
        font: { color: '#eeeeee' },
        
        // Grid 2x1
        grid: {
          rows: 1,
          columns: 2,
          pattern: 'independent',
          subplots: [['xy'], ['x2y2']]
        },
        
        // Painel esquerdo (ciclo rápido)
        xaxis: {
          title: 'Tempo (anos)',
          rangemode: 'tozero',
          color: '#eeeeee',
          gridcolor: 'rgba(255,255,255,0.08)',
          zerolinecolor: 'rgba(255,255,255,0.15)',
          domain: [0, 0.58]
        },
        yaxis: {
          title: 'Estoque (GtC)',
          rangemode: 'tozero',
          color: '#eeeeee',
          gridcolor: 'rgba(255,255,255,0.08)',
          zerolinecolor: 'rgba(255,255,255,0.15)'
        },
        
        // Painel direito (ciclo lento)
        xaxis2: {
          title: 'Tempo (anos)',
          rangemode: 'tozero',
          color: '#eeeeee',
          gridcolor: 'rgba(255,255,255,0.08)',
          zerolinecolor: 'rgba(255,255,255,0.15)',
          domain: [0.62, 1]
        },
        yaxis2: {
          title: 'Estoque (GtC)',
          rangemode: 'tozero',
          color: '#eeeeee',
          gridcolor: 'rgba(255,255,255,0.08)',
          zerolinecolor: 'rgba(255,255,255,0.15)',
          anchor: 'x2'
        },
        yaxis3: {
          title: 'Rochas sedimentares (GtC)',
          rangemode: 'tozero',
          color: '#eeeeee',
          gridcolor: 'rgba(255,255,255,0.08)',
          zerolinecolor: 'rgba(255,255,255,0.15)',
          anchor: 'x2',
          overlaying: 'y2',
          side: 'right',
          showgrid: false
        },
        
        annotations: [
          {
            text: `Ciclo rápido (A, V, S, Os) — Tempo: ${fmt_years(t)} anos`,
            xref: 'x domain',
            yref: 'paper',
            x: 0.29,
            y: 1.08,
            xanchor: 'center',
            showarrow: false,
            font: { size: 15, color: '#eeeeee', weight: 'bold' }
          },
          {
            text: `Ciclo lento (Od, F, R) — Tempo: ${fmt_years(t)} anos`,
            xref: 'x2 domain',
            yref: 'paper',
            x: 0.5,
            y: 1.08,
            xanchor: 'center',
            showarrow: false,
            font: { size: 15, color: '#eeeeee', weight: 'bold' }
          }
        ],
        
        legend: {
          x: 0.5,
          y: -0.15,
          xanchor: 'center',
          yanchor: 'top',
          orientation: 'h',
          bgcolor: 'rgba(42,42,42,0.8)',
          bordercolor: '#555',
          borderwidth: 1,
          font: { size: 12, color: '#eeeeee' }
        }
      },
      config: { 
        displayModeBar: true,
        displaylogo: false,
        modeBarButtonsToRemove: ['lasso2d', 'select2d']
      }
    };
  }, [history, t]);
  
  // ===================== RENDER =====================
  
  const diagram = makeDiagram();
  const timeseries = makeTimeseries();
  
  return (
    <div style={{ 
      minHeight: '100vh', 
      backgroundColor: '#0a1f0a',
      display: 'flex',
      flexDirection: 'column'
    }}>
      {/* ============= CABEÇALHO COM TÍTULO E CONTROLES ============= */}
      <header style={{
        backgroundColor: '#1a2e1a',
        borderBottom: '3px solid #2d5016',
        padding: '24px 20px',
        boxShadow: '0 4px 6px rgba(0,0,0,0.3)'
      }}>
        {/* Título Principal */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '16px',
          marginBottom: '20px'
        }}>
          <div style={{
            fontSize: '48px',
            background: 'linear-gradient(135deg, #10b981, #059669)',
            borderRadius: '50%',
            width: '80px',
            height: '80px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: '0 4px 12px rgba(16, 185, 129, 0.5)'
          }}>
            🌍
          </div>
          <h1 style={{
            color: '#d1fae5',
            fontSize: '42px',
            fontWeight: '700',
            margin: 0,
            textShadow: '2px 2px 4px rgba(0,0,0,0.5)',
            letterSpacing: '0.5px'
          }}>
            Simulador do Ciclo do Carbono
          </h1>
        </div>

        {/* Controles - Sempre Visíveis */}
        <div style={{
          display: 'flex',
          gap: '20px',
          justifyContent: 'center',
          alignItems: 'center',
          flexWrap: 'wrap',
          maxWidth: '1400px',
          margin: '0 auto'
        }}>
          {/* Velocidade */}
          <div style={{
            backgroundColor: '#22543d',
            padding: '12px 20px',
            borderRadius: '8px',
            border: '2px solid #10b981',
            display: 'flex',
            alignItems: 'center',
            gap: '12px'
          }}>
            <label style={{ 
              color: '#6ee7b7', 
              fontWeight: '700',
              fontSize: '14px',
              whiteSpace: 'nowrap'
            }}>
              ⚡ Velocidade:
            </label>
            <input
              type="number"
              min="0"
              max="50"
              step="1"
              value={Math.round(speed)}
              onChange={(e) => setSpeed(parseInt(e.target.value) || 0)}
              style={{
                width: '70px',
                padding: '8px 12px',
                borderRadius: '6px',
                border: '2px solid #10b981',
                backgroundColor: '#1a2e1a',
                color: '#d1fae5',
                fontSize: '16px',
                fontWeight: '700',
                textAlign: 'center'
              }}
            />
            <span style={{ 
              color: '#d1fae5', 
              fontWeight: '600',
              fontSize: '14px'
            }}>
              anos/s
            </span>
          </div>

          {/* Tempo Decorrido */}
          <div style={{
            backgroundColor: '#22543d',
            padding: '12px 20px',
            borderRadius: '8px',
            border: '2px solid #34d399',
            display: 'flex',
            alignItems: 'center',
            gap: '8px'
          }}>
            <span style={{ color: '#34d399', fontSize: '18px' }}>⏱️</span>
            <span style={{ 
              color: '#d1fae5', 
              fontWeight: '700',
              fontSize: '16px'
            }}>
              Tempo: {fmt_years(t)} anos
            </span>
          </div>

          {/* Botões de Controle */}
          <div style={{ display: 'flex', gap: '10px' }}>
            <button
              onClick={handleTogglePlay}
              style={{
                padding: '12px 24px',
                borderRadius: '8px',
                border: 'none',
                backgroundColor: isRunning ? '#f59e0b' : '#10b981',
                color: '#fff',
                fontWeight: '700',
                fontSize: '14px',
                cursor: 'pointer',
                boxShadow: '0 2px 8px rgba(0,0,0,0.3)',
                transition: 'transform 0.2s'
              }}
              onMouseOver={(e) => e.currentTarget.style.transform = 'scale(1.05)'}
              onMouseOut={(e) => e.currentTarget.style.transform = 'scale(1)'}
            >
              {isRunning ? '⏸ Pausar' : '▶ Continuar'}
            </button>
            
            <button
              onClick={handleReset}
              style={{
                padding: '12px 24px',
                borderRadius: '8px',
                border: 'none',
                backgroundColor: '#dc2626',
                color: '#fff',
                fontWeight: '700',
                fontSize: '14px',
                cursor: 'pointer',
                boxShadow: '0 2px 8px rgba(0,0,0,0.3)',
                transition: 'transform 0.2s'
              }}
              onMouseOver={(e) => e.currentTarget.style.transform = 'scale(1.05)'}
              onMouseOut={(e) => e.currentTarget.style.transform = 'scale(1)'}
            >
              🔄 Reiniciar
            </button>
            
            <button
              onClick={handleToggleView}
              style={{
                padding: '12px 24px',
                borderRadius: '8px',
                border: '2px solid #10b981',
                backgroundColor: '#1a2e1a',
                color: '#d1fae5',
                fontWeight: '700',
                fontSize: '14px',
                cursor: 'pointer',
                boxShadow: '0 2px 8px rgba(0,0,0,0.3)',
                transition: 'transform 0.2s'
              }}
              onMouseOver={(e) => e.currentTarget.style.transform = 'scale(1.05)'}
              onMouseOut={(e) => e.currentTarget.style.transform = 'scale(1)'}
            >
              {viewMode === 'diagram' ? '📊 Gráficos' : '🔄 Diagrama'}
            </button>

            {viewMode === 'timeseries' && (
              <button
                onClick={handleDownloadTimeseries}
                style={{
                  padding: '12px 24px',
                  borderRadius: '8px',
                  border: 'none',
                  backgroundColor: '#059669',
                  color: '#fff',
                  fontWeight: '700',
                  fontSize: '14px',
                  cursor: 'pointer',
                  boxShadow: '0 2px 8px rgba(0,0,0,0.3)',
                  transition: 'transform 0.2s'
                }}
                onMouseOver={(e) => e.currentTarget.style.transform = 'scale(1.05)'}
                onMouseOut={(e) => e.currentTarget.style.transform = 'scale(1)'}
              >
                💾 Baixar
              </button>
            )}
          </div>
        </div>
      </header>

      {/* ============= ÁREA PRINCIPAL (SIDEBAR + CONTEÚDO) ============= */}
      <div style={{ 
        display: 'flex',
        flex: 1,
        gap: '0'
      }}>
        {/* SIDEBAR - APENAS PROCESSOS */}
        <div style={{
          width: '340px',
          backgroundColor: '#1a2e1a',
          borderRight: '3px solid #2d5016',
          padding: '24px',
          overflowY: 'auto',
          boxShadow: '4px 0 12px rgba(0,0,0,0.3)'
        }}>
          
          {/* Processos Humanos */}
          <div style={{ 
            marginBottom: '32px',
            padding: '20px',
            backgroundColor: '#22543d',
            borderRadius: '12px',
            border: '3px solid #dc2626',
            boxShadow: '0 4px 12px rgba(220, 38, 38, 0.2)'
          }}>
            <h3 style={{ 
              color: '#fca5a5', 
              marginBottom: '20px',
              fontSize: '20px',
              fontWeight: '700',
              textAlign: 'center',
              textTransform: 'uppercase',
              letterSpacing: '1px',
              borderBottom: '2px solid #dc2626',
              paddingBottom: '10px'
            }}>
              🏭 Processos Humanos
            </h3>
            
            <div style={{ marginBottom: '20px' }}>
              <label style={{ 
                color: '#d1fae5', 
                display: 'block', 
                marginBottom: '8px',
                fontWeight: '600',
                fontSize: '14px'
              }}>
                🪓 Desmatamento
              </label>
              <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                <input
                  type="number"
                  min="0"
                  step="0.1"
                  value={humanFluxes['Desmatamento']}
                  onChange={(e) => setHumanFluxes(prev => ({
                    ...prev,
                    'Desmatamento': parseFloat(e.target.value) || 0
                  }))}
                  style={{
                    flex: 1,
                    padding: '10px',
                    borderRadius: '6px',
                    border: '2px solid #dc2626',
                    backgroundColor: '#0a1f0a',
                    color: '#d1fae5',
                    fontSize: '14px',
                    fontWeight: '600'
                  }}
                />
                <span style={{ 
                  color: '#a7f3d0', 
                  whiteSpace: 'nowrap',
                  fontSize: '13px',
                  fontWeight: '600'
                }}>
                  GtC/ano
                </span>
              </div>
            </div>
            
            <div>
              <label style={{ 
                color: '#d1fae5', 
                display: 'block', 
                marginBottom: '8px',
                fontWeight: '600',
                fontSize: '14px'
              }}>
                🏭 Queima de Combustíveis Fósseis
              </label>
              <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                <input
                  type="number"
                  min="0"
                  step="0.1"
                  value={humanFluxes['Queima de Combustíveis Fósseis']}
                  onChange={(e) => setHumanFluxes(prev => ({
                    ...prev,
                    'Queima de Combustíveis Fósseis': parseFloat(e.target.value) || 0
                  }))}
                  style={{
                    flex: 1,
                    padding: '10px',
                    borderRadius: '6px',
                    border: '2px solid #dc2626',
                    backgroundColor: '#0a1f0a',
                    color: '#d1fae5',
                    fontSize: '14px',
                    fontWeight: '600'
                  }}
                />
                <span style={{ 
                  color: '#a7f3d0', 
                  whiteSpace: 'nowrap',
                  fontSize: '13px',
                  fontWeight: '600'
                }}>
                  GtC/ano
                </span>
              </div>
            </div>
          </div>
          
          {/* Processos da Natureza */}
          <div style={{
            padding: '20px',
            backgroundColor: '#22543d',
            borderRadius: '12px',
            border: '3px solid #10b981',
            boxShadow: '0 4px 12px rgba(16, 185, 129, 0.3)'
          }}>
            <h3 style={{ 
              color: '#6ee7b7', 
              marginBottom: '20px',
              fontSize: '20px',
              fontWeight: '700',
              textAlign: 'center',
              textTransform: 'uppercase',
              letterSpacing: '1px',
              borderBottom: '2px solid #10b981',
              paddingBottom: '10px'
            }}>
              🌱 Processos da Natureza
            </h3>
            
            {SLIDER_PROCESSES.map(name => (
              <div key={name} style={{ marginBottom: '24px' }}>
                <label style={{ 
                  color: '#d1fae5', 
                  display: 'block', 
                  marginBottom: '10px',
                  textAlign: 'center',
                  fontWeight: '700',
                  fontSize: '14px'
                }}>
                  {name}
                </label>
                <input
                  type="range"
                  min="-2"
                  max="2"
                  step="0.01"
                  value={processParams[name] || 0}
                  onChange={(e) => setProcessParams(prev => ({
                    ...prev,
                    [name]: parseFloat(e.target.value)
                  }))}
                  style={{ width: '100%' }}
                />
                <div style={{ 
                  display: 'flex', 
                  justifyContent: 'space-between',
                  color: '#6ee7b7',
                  fontSize: '11px',
                  marginTop: '6px',
                  fontWeight: '600'
                }}>
                  <span>×0,25</span>
                  <span>×0,5</span>
                  <span>×1</span>
                  <span>×2</span>
                  <span>×4</span>
                </div>
              </div>
            ))}
          </div>
        </div>
        
        {/* ÁREA DE VISUALIZAÇÃO */}
        <div style={{ 
          flex: 1,
          padding: '20px',
          backgroundColor: '#1a2e1a',
          overflowY: 'auto'
        }}>
          {viewMode === 'diagram' ? (
            <div>
              <Plot {...diagram} style={{ width: '100%', height: 'calc(100vh - 220px)' }} />
            </div>
          ) : (
            <div ref={timeseriesRef} style={{ padding: '20px', backgroundColor: '#22543d', borderRadius: '12px' }}>
              <Plot {...timeseries} style={{ width: '100%', height: 'calc(100vh - 260px)' }} />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
