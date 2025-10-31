// lib/visualization.js
// GEOMETRIA E VISUALIZAÇÃO DO DIAGRAMA
// Preserva o posicionamento exato e sistema de vias dinâmicas

import { Y0, HUMAN_PROCS } from './simulation';

// ===================== DEFINIÇÃO DAS CAIXAS =====================

export const boxes = {
  A: {
    name: 'Atmosfera (750)',
    cx: 0.500,
    cy: 0.900,
    w: 0.230,
    h: 0.090,
    fill: 'rgba(169,169,169,0.95)'
  },
  V: {
    name: 'Vegetação (610)',
    cx: 0.100,
    cy: 0.770,
    w: 0.165,
    h: 0.085,
    fill: 'rgba(50,205,50,0.50)'
  },
  S: {
    name: 'Solos e Detritívoros (1.500)',
    cx: 0.100,
    cy: 0.540,
    w: 0.185,
    h: 0.100,
    fill: 'rgba(50,205,50,0.50)'
  },
  Os: {
    name: 'Superfície do Oceano e Biota Marinha (1.020)',
    cx: 0.950,
    cy: 0.795,
    w: 0.260,
    h: 0.105,
    fill: 'rgba(0,191,255,0.45)'
  },
  Od: {
    name: 'Oceano Profundo (38.100)',
    cx: 0.950,
    cy: 0.560,
    w: 0.300,
    h: 0.115,
    fill: 'rgba(0,191,255,0.45)'
  },
  F: {
    name: 'Combustíveis Fósseis (4.000)',
    cx: 0.660,
    cy: 0.350,
    w: 0.295,
    h: 0.085,
    fill: 'rgba(210,105,30,0.65)'
  },
  R: {
    name: 'Rochas sedimentares (100.000.000)',
    cx: 0.100,
    cy: 0.170,
    w: 0.500,
    h: 0.185,
    fill: 'rgba(210,105,30,0.65)'
  }
};

// ===================== DEFINIÇÃO DAS SETAS =====================

export const ARROWS = [
  // [src, src_side, dst, dst_side, label, vias, nudge]
  
  // A <-> V
  ['A', 'L', 'V', 'R', 'Fotossíntese (121,5)', [], [-0.001, 0.012]],
  
  ['V', 'T', 'A', 'L', 'Respiração autotrófica (60)',
    [{ x: ['V', 'cx'], y: ['A', 'cy'] }],
    [0.010, 0.010]],
  
  ['V', 'L', 'A', 'T', 'Desmatamento (0)',
    [
      {
        x: { op: 'min', items: [['A', 'L'], ['V', 'L'], ['S', 'L'], ['R', 'L']], offset: -0.005 },
        y: ['V', 'cy']
      },
      {
        x: { op: 'min', items: [['A', 'L'], ['V', 'L'], ['S', 'L'], ['R', 'L']], offset: -0.005 },
        y: ['A', 'T', 0.015]
      }
    ],
    [0.035, -0.010]],
  
  // V -> S
  ['V', 'B', 'S', 'T', 'Decomposição (61)', [], [0.000, 0.000]],
  
  // S -> A
  ['S', 'R', 'A', 'B', 'Respiração heterotrófica (60)',
    [{ x: ['A', 'cx'], y: ['S', 'cy'] }],
    [0.055, -0.012]],
  
  // A <-> Os
  ['A', 'R', 'Os', 'L', 'Difusão A–O (92)',
    [{ x: ['A', 'R', 0.010], y: ['Os', 'cy'] }],
    [0.015, 0.012]],
  
  ['Os', 'T', 'A', 'R', 'Difusão O–A (90)',
    [{ x: ['Os', 'cx'], y: ['A', 'cy'] }],
    [-0.015, 0.000]],
  
  // Os <-> Od
  ['Os', 'R', 'Od', 'R', 'Circulação Oₛ→O_d (102)',
    [
      { x: { op: 'max', items: [['Os', 'R'], ['Od', 'R']], offset: 0.10 }, y: ['Os', 'cy'] },
      { x: { op: 'max', items: [['Os', 'R'], ['Od', 'R']], offset: 0.10 }, y: ['Od', 'cy'] }
    ],
    [0.000, -0.012]],
  
  ['Od', 'T', 'Os', 'B', 'Circulação O_d→Oₛ (100)', [], [0.000, 0.012]],
  
  // F -> A
  ['F', 'T', 'A', 'B', 'Queima de Combustíveis Fósseis (0)', [], [0.012, -0.010]],
  
  // Od -> F
  ['Od', 'B', 'F', 'R', 'Formação de combustíveis (0)', [], [0.000, -0.010]],
  
  // Od -> R
  ['Od', 'B', 'R', 'R', 'Sedimentação (0,05)',
    [{ x: ['Od', 'cx'], y: ['R', 'cy'] }],
    [0.012, -0.015]],
  
  // R -> S
  ['R', 'T', 'S', 'B', 'Erosão (0,05)', [], [-0.090, 0.012]]
];

export const ARROW_COLOR_NAT = 'rgb(255,215,0)';   // dourado
export const ARROW_COLOR_HUM = 'rgb(135,206,250)'; // azul

// ===================== ESCALA DINÂMICA DAS CAIXAS =====================

export const AREA_POWER = 0.5;
export const SCALE_MIN = 0.60;
export const SCALE_MAX = 1.60;

/**
 * Calcula retângulos com dimensões ajustadas pelo estoque atual
 * @param {Object} y - Estoques atuais
 * @returns {Object} - Retângulos {key: [x0, y0, x1, y1]}
 */
export function dynamic_rects(y) {
  const rects = {};
  
  Object.entries(boxes).forEach(([key, b]) => {
    let s = Y0[key] > 0 ? Math.pow(y[key] / Y0[key], AREA_POWER) : 1.0;
    s = Math.max(SCALE_MIN, Math.min(SCALE_MAX, s));
    
    const w = b.w * s;
    const h = b.h * s;
    const { cx, cy } = b;
    
    rects[key] = [cx - w/2, cy - h/2, cx + w/2, cy + h/2];
  });
  
  return rects;
}

/**
 * Retorna fator de escala de uma caixa
 */
export function scale_of(key, y) {
  if (Y0[key] <= 0) return 1.0;
  const s = Math.pow(y[key] / Y0[key], AREA_POWER);
  return Math.max(SCALE_MIN, Math.min(SCALE_MAX, s));
}

// ===================== PONTOS DE ANCORAGEM =====================

export function rect_from_box(b) {
  const { cx, cy, w, h } = b;
  return [cx - w/2, cy - h/2, cx + w/2, cy + h/2];
}

export function anchor_point_from_rect(rect, side, gap = 0.010) {
  const [x0, y0, x1, y1] = rect;
  
  switch (side) {
    case 'L': return [x0 - gap, (y0 + y1) / 2];
    case 'R': return [x1 + gap, (y0 + y1) / 2];
    case 'T': return [(x0 + x1) / 2, y1 + gap];
    case 'B': return [(x0 + x1) / 2, y0 - gap];
    default: throw new Error(`Invalid side: ${side}`);
  }
}

// ===================== SISTEMA DE VIAS DINÂMICAS =====================

function _metrics(rects, key) {
  const [x0, y0, x1, y1] = rects[key];
  return {
    L: x0,
    R: x1,
    B: y0,
    T: y1,
    cx: (x0 + x1) / 2,
    cy: (y0 + y1) / 2
  };
}

function _eval_axis(spec, rects) {
  // Número direto
  if (typeof spec === 'number') {
    return spec;
  }
  
  // Array [ref, attr] ou [ref, attr, offset]
  if (Array.isArray(spec)) {
    const [ref, attr, offset = 0] = spec;
    const m = _metrics(rects, ref);
    return m[attr] + offset;
  }
  
  // Objeto com operações
  if (typeof spec === 'object' && spec.op) {
    const { op, items, offset = 0 } = spec;
    const vals = items.map(s => _eval_axis(s, rects));
    
    let base;
    if (op === 'mid') {
      if (vals.length !== 2) throw new Error('mid requires 2 items');
      base = (vals[0] + vals[1]) / 2;
    } else if (op === 'max') {
      base = Math.max(...vals);
    } else if (op === 'min') {
      base = Math.min(...vals);
    } else {
      throw new Error(`Unknown operation: ${op}`);
    }
    
    return base + offset;
  }
  
  throw new Error(`Invalid spec: ${JSON.stringify(spec)}`);
}

export function resolve_via(v, rects) {
  if (typeof v === 'object' && 'x' in v && 'y' in v) {
    return [_eval_axis(v.x, rects), _eval_axis(v.y, rects)];
  }
  return v;
}

// ===================== FORMATAÇÃO E LABELS =====================

export function label_text_and_fs(key, valor, y, rect) {
  const base = boxes[key].name.split('(')[0].trim();
  const val_str = `${Math.round(valor)} GtC`;
  
  // Fonte escala com tamanho da caixa
  const s = scale_of(key, y);
  let fs = Math.round(13 * s * 0.92);
  fs = Math.max(8, Math.min(28, fs));
  
  // Casos especiais de formatação
  if (key === 'Os') {
    return [`<b>Superfície do Oceano e<br>Biota Marinha</b><br><b>(${val_str})</b>`, fs];
  }
  
  if (key === 'V') {
    return [`<b>${base}</b><br><b>(${val_str})</b>`, fs];
  }
  
  if (key === 'S') {
    return [`<b>Solos e<br>Detritívoros</b><br><b>(${val_str})</b>`, fs];
  }
  
  // Demais caixas
  const one_line = `${base} (${val_str})`;
  if (s < 0.85 || one_line.length >= 24) {
    return [`<b>${base}</b><br><b>(${val_str})</b>`, fs];
  } else {
    return [`<b>${one_line}</b>`, fs];
  }
}

export function fmt_flux(x) {
  const s = Math.abs(x) >= 1 ? x.toFixed(1) : x.toFixed(2);
  return s.replace('.', ',');
}

export function fmt_speed(v) {
  const val = parseFloat(v);
  const s = Number.isInteger(val) ? val.toString() : val.toFixed(1);
  return s.replace('.', ',');
}

export function fmt_years(t) {
  try {
    return Math.round(parseFloat(t)).toString();
  } catch {
    return '0';
  }
}

export function midpoint_with_normal(points, d_perp = [0, 0]) {
  if (points.length < 2) return points[0];
  
  const mid_idx = Math.floor((points.length - 1) / 2);
  const [x0, y0] = points[mid_idx];
  const [x1, y1] = points[mid_idx + 1];
  const mx = (x0 + x1) / 2;
  const my = (y0 + y1) / 2;
  
  const vx = x1 - x0;
  const vy = y1 - y0;
  let nx = -vy;
  let ny = vx;
  const nl = Math.sqrt(nx*nx + ny*ny) || 1.0;
  nx /= nl;
  ny /= nl;
  
  const LABEL_OFF = 0.014;
  return [mx + nx * (LABEL_OFF + d_perp[0]), my + ny * (LABEL_OFF + d_perp[1])];
}

/**
 * Verifica se um processo é humano
 */
export function is_human_process(process_base_name) {
  return HUMAN_PROCS.includes(process_base_name);
}
