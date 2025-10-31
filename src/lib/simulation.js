// lib/simulation.js
// MODELAGEM MATEMÁTICA DO CICLO DO CARBONO
// Preserva rigorosamente as equações diferenciais do código original

// ===================== CONSTANTES E DADOS INICIAIS =====================

// Estoques iniciais (GtC)
export const Y0 = {
  A: 750.0,        // Atmosfera
  V: 610.0,        // Vegetação
  S: 1580.0,       // Solos e Detritívoros
  Os: 1020.0,      // Superfície do Oceano e Biota Marinha
  Od: 38100.0,     // Oceano Profundo
  F: 4000.0,       // Combustíveis Fósseis
  R: 100_000_000.0 // Rochas sedimentares
};

export const RES_ORDER = ['A', 'V', 'S', 'Os', 'Od', 'F', 'R'];
export const TOTAL_CARBON = Object.values(Y0).reduce((sum, val) => sum + val, 0);

// Processos: [nome, origem_j, destino_i, F0_inicial]
export const PROCS = [
  ['Fotossíntese', 'A', 'V', 121.5],
  ['Respiração autotrófica', 'V', 'A', 60.0],
  ['Desmatamento', 'V', 'A', 0.0],
  ['Decomposição', 'V', 'S', 61.0],
  ['Respiração heterotrófica', 'S', 'A', 60.0],
  ['Difusão A–O', 'A', 'Os', 92.0],
  ['Difusão O–A', 'Os', 'A', 90.0],
  ['Circulação Oₛ→O_d', 'Os', 'Od', 102.0],
  ['Circulação O_d→Oₛ', 'Od', 'Os', 100.0],
  ['Queima de Combustíveis Fósseis', 'F', 'A', 0.0],
  ['Formação de combustíveis', 'Od', 'F', 0.0],
  ['Sedimentação', 'Od', 'R', 0.05],
  ['Erosão', 'R', 'S', 0.05]
];

// Fluxos-semente para processos com F0=0
export const SEED_FLOW = {
  'Desmatamento': 50.0,
  'Queima de Combustíveis Fósseis': 50.0,
  'Formação de combustíveis': 10.0
};

// Processos controlados diretamente pelo usuário (inputs em GtC/ano)
export const HUMAN_PROCS = ['Desmatamento', 'Queima de Combustíveis Fósseis'];

// Cálculo de a0 por processo
export const a0_name = {};
PROCS.forEach(([name, j, i, F0]) => {
  a0_name[name] = Y0[j] > 0 ? F0 / Y0[j] : 0.0;
});

// Mapa: nome do processo → (destino_i, origem_j)
export const PROC_NAME_TO_PAIR = {};
PROCS.forEach(([name, j, i]) => {
  PROC_NAME_TO_PAIR[name] = [i, j];
});

// Parâmetros de escala exponencial
export const THETA = Math.log(2.0); // p = +1 → ×2; p = -1 → ×0.5

// ===================== FUNÇÕES DE CÁLCULO DE FLUXOS =====================

/**
 * Calcula coeficientes a_ij efetivos para cada processo
 * @param {Object} p_by_name - Parâmetros dos sliders por nome do processo
 * @param {Object} y_state - Estado atual dos estoques
 * @returns {Object} - a_ij por nome do processo
 */
export function a_effective(p_by_name, y_state) {
  const out = {};
  
  PROCS.forEach(([name, j, i, F0]) => {
    const p = p_by_name[name] !== undefined ? parseFloat(p_by_name[name]) : 0.0;
    
    if (F0 > 0) {
      // Processo natural com fluxo inicial
      out[name] = a0_name[name] * Math.exp(THETA * p);
    } else {
      // Processo com F0=0 (humano ou geológico)
      const seed = SEED_FLOW[name] || 0.1;
      const yj = y_state[j] || 0.0;
      const a_seed = yj > 0 ? seed / yj : 0.0;
      const rel = Math.max(0.0, Math.exp(THETA * p) - 1.0);
      out[name] = a_seed * rel;
    }
  });
  
  return out;
}

/**
 * Calcula fluxos F_ij para cada processo
 * @param {Object} a_eff_by_name - Coeficientes a_ij por processo
 * @param {Object} y_state - Estado atual dos estoques
 * @param {Object} human_F - Fluxos humanos diretos (GtC/ano)
 * @returns {Object} - Fluxos por nome do processo
 */
export function fluxes_by_name(a_eff_by_name, y_state, human_F = {}) {
  const F_name = {};
  
  PROCS.forEach(([name, j]) => {
    if (HUMAN_PROCS.includes(name)) {
      // Usa valor digitado pelo usuário
      try {
        const f = parseFloat(human_F[name] || 0.0);
        F_name[name] = Math.max(0.0, f);
      } catch {
        F_name[name] = 0.0;
      }
    } else {
      // Calcula F = a * y_j
      const aij = a_eff_by_name[name];
      F_name[name] = aij * y_state[j];
    }
  });
  
  return F_name;
}

/**
 * Soma fluxos que compartilham o mesmo par (i,j)
 * @param {Object} F_name - Fluxos por nome
 * @returns {Object} - Fluxos somados por par [i,j]
 */
export function sum_fluxes_by_pair(F_name) {
  const F_pair = {};
  
  Object.entries(F_name).forEach(([name, F]) => {
    const pair_key = PROC_NAME_TO_PAIR[name].join(',');
    F_pair[pair_key] = (F_pair[pair_key] || 0.0) + F;
  });
  
  return F_pair;
}

/**
 * Calcula dy/dt a partir dos fluxos
 * @param {Object} F_pair - Fluxos por par
 * @returns {Object} - dy/dt para cada reservatório
 */
export function dydt_from_flux(F_pair) {
  const din = {};
  const dout = {};
  
  RES_ORDER.forEach(r => {
    din[r] = 0.0;
    dout[r] = 0.0;
  });
  
  Object.entries(F_pair).forEach(([pair_key, val]) => {
    const [i, j] = pair_key.split(',');
    din[i] += val;
    dout[j] += val;
  });
  
  const dydt = {};
  RES_ORDER.forEach(r => {
    dydt[r] = din[r] - dout[r];
  });
  
  return dydt;
}

// ===================== INTEGRAÇÃO NUMÉRICA (RUNGE-KUTTA 4) =====================

/**
 * Um passo de integração RK4
 * @param {Object} y - Estado atual
 * @param {Object} p_by_name - Parâmetros dos processos
 * @param {number} dt_years - Passo de tempo em anos
 * @param {Object} human_F_by_name - Fluxos humanos
 * @returns {Object} - Novo estado
 */
export function rk4_step(y, p_by_name, dt_years, human_F_by_name = {}) {
  // Função f que calcula dy/dt
  const f = (state) => {
    const a_eff_name = a_effective(p_by_name, state);
    const F_name = fluxes_by_name(a_eff_name, state, human_F_by_name);
    const F_pair = sum_fluxes_by_pair(F_name);
    return dydt_from_flux(F_pair);
  };
  
  // k1
  const k1 = f(y);
  
  // k2
  const y2 = {};
  RES_ORDER.forEach(r => {
    y2[r] = y[r] + 0.5 * dt_years * k1[r];
  });
  const k2 = f(y2);
  
  // k3
  const y3 = {};
  RES_ORDER.forEach(r => {
    y3[r] = y[r] + 0.5 * dt_years * k2[r];
  });
  const k3 = f(y3);
  
  // k4
  const y4 = {};
  RES_ORDER.forEach(r => {
    y4[r] = y[r] + dt_years * k3[r];
  });
  const k4 = f(y4);
  
  // Novo estado
  const yn = {};
  RES_ORDER.forEach(r => {
    yn[r] = y[r] + (dt_years / 6.0) * (k1[r] + 2*k2[r] + 2*k3[r] + k4[r]);
  });
  
  // Clamp valores negativos e conserva massa total
  RES_ORDER.forEach(r => {
    if (yn[r] < 0) yn[r] = 0.0;
  });
  
  const s = RES_ORDER.reduce((sum, r) => sum + yn[r], 0);
  if (s > 0) {
    const corr = TOTAL_CARBON / s;
    RES_ORDER.forEach(r => {
      yn[r] *= corr;
    });
  }
  
  return yn;
}

/**
 * Integra usando subpassos para estabilidade
 * @param {Object} y - Estado inicial
 * @param {Object} p_by_name - Parâmetros
 * @param {Object} human_F_by_name - Fluxos humanos
 * @param {number} dt_total_years - Tempo total a integrar
 * @param {number} dt_max - Passo máximo por substep
 * @returns {Object} - Estado final
 */
export function integrate_substeps(y, p_by_name, human_F_by_name, dt_total_years, dt_max = 0.2) {
  if (dt_total_years <= 0.0) {
    return { ...y };
  }
  
  const n = Math.max(1, Math.ceil(dt_total_years / dt_max));
  const dt = dt_total_years / n;
  
  let state = { ...y };
  for (let i = 0; i < n; i++) {
    state = rk4_step(state, p_by_name, dt, human_F_by_name);
  }
  
  return state;
}

// ===================== UTILITÁRIOS =====================

export function clamp(x, lo, hi) {
  return Math.max(lo, Math.min(hi, x));
}

export function parse_speed(val, defaultVal = 1.0) {
  try {
    const v = parseFloat(val);
    return clamp(v, 0.0, 50.0);
  } catch {
    return defaultVal;
  }
}

// Nomes legíveis dos reservatórios
export function res_pretty_name(r) {
  const names = {
    'A': 'Atmosfera',
    'V': 'Vegetação',
    'S': 'Solos e Detritívoros',
    'Os': 'Superfície do Oceano e Biota Marinha',
    'Od': 'Oceano profundo',
    'F': 'Combustíveis fósseis',
    'R': 'Rochas sedimentares'
  };
  return names[r] || r;
}
