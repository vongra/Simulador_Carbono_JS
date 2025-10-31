# Simulador do Ciclo Biogeoquímico do Carbono

Simulação interativa do ciclo do carbono com modelagem matemática precisa baseada em equações diferenciais (Runge-Kutta 4ª ordem).

## 🌍 Características

- **Modelagem Matemática Rigorosa**: Sistema de 7 reservatórios (Atmosfera, Vegetação, Solos, Oceanos, Combustíveis Fósseis, Rochas) com 13 processos de transferência
- **Integração Numérica RK4**: Método Runge-Kutta de 4ª ordem com subpassos adaptativos para estabilidade
- **Conservação de Massa**: Garantia matemática de conservação do carbono total (~100 milhões GtC)
- **Visualização Dinâmica**: Caixas que mudam de tamanho proporcionalmente aos estoques
- **Controles Interativos**: 
  - 4 processos naturais com sliders (Fotossíntese, Respirações, Decomposição)
  - 2 processos humanos com inputs diretos (Desmatamento, Queima de Combustíveis Fósseis)
  - Controle de velocidade (0-50 anos/segundo)
  - Botão pausar/continuar
- **Gráficos Temporais**: Visualização separada dos ciclos rápido e lento
- **Exportação**: Download dos gráficos com informação temporal

## 🚀 Instalação e Uso

### Desenvolvimento Local

```bash
# Clone o repositório
cd carbon-cycle-simulator

# Instale as dependências
npm install

# Execute em modo desenvolvimento
npm run dev
```

Abra [http://localhost:3000](http://localhost:3000) no navegador.

### Build para Produção

```bash
# Cria build otimizado
npm run build

# Inicia servidor de produção
npm start
```

### Deploy no Vercel

1. Crie uma conta no [Vercel](https://vercel.com)
2. Conecte seu repositório GitHub
3. O Vercel detectará automaticamente o Next.js e fará o deploy
4. Ou use a CLI do Vercel:

```bash
npm install -g vercel
vercel
```

## 📐 Modelagem Matemática

### Equações Diferenciais

Para cada reservatório i, a taxa de variação é:

```
dy_i/dt = Σ(F_ji) - Σ(F_ij)
```

Onde F_ij é o fluxo do reservatório j para i.

### Cálculo de Fluxos

**Processos Naturais (F0 > 0):**
```
a_ij = a_0 × exp(θ × p)
F_ij = a_ij × y_j
```

**Processos Humanos/Geológicos (F0 = 0):**
```
a_ij = (F_seed / y_j) × max(0, exp(θ × p) - 1)
F_ij = a_ij × y_j  (ou valor digitado para Desmatamento/Indústria)
```

Onde:
- θ = ln(2) ≈ 0.693
- p = parâmetro do slider (-2 a +2)
- a_0 = taxa inicial (F0 / Y0_j)

### Integração RK4

```javascript
k1 = f(y_n)
k2 = f(y_n + 0.5×dt×k1)
k3 = f(y_n + 0.5×dt×k2)
k4 = f(y_n + dt×k3)
y_{n+1} = y_n + (dt/6)×(k1 + 2k2 + 2k3 + k4)
```

Com subpassos quando dt > 0.2 anos para garantir estabilidade numérica.

## 📊 Estrutura dos Reservatórios

| Reservatório | Símbolo | Estoque Inicial (GtC) |
|--------------|---------|----------------------|
| Atmosfera | A | 750 |
| Vegetação | V | 610 |
| Solos e Detritívoros | S | 1.580 |
| Superfície do Oceano | Os | 1.020 |
| Oceano Profundo | Od | 38.100 |
| Combustíveis Fósseis | F | 4.000 |
| Rochas Sedimentares | R | 100.000.000 |

**Total:** ~100.042.070 GtC (conservado durante toda a simulação)

## 🔄 Processos

### Processos Naturais (com sliders)
1. **Fotossíntese** (A → V): 121,5 GtC/ano
2. **Respiração Autotrófica** (V → A): 60 GtC/ano
3. **Decomposição** (V → S): 61 GtC/ano
4. **Respiração Heterotrófica** (S → A): 60 GtC/ano

### Processos Naturais (automáticos)
5. **Difusão A–O** (A → Os): 92 GtC/ano
6. **Difusão O–A** (Os → A): 90 GtC/ano
7. **Circulação Os→Od** (Os → Od): 102 GtC/ano
8. **Circulação Od→Os** (Od → Os): 100 GtC/ano
9. **Sedimentação** (Od → R): 0,05 GtC/ano
10. **Erosão** (R → S): 0,05 GtC/ano

### Processos Humanos (inputs diretos)
11. **Desmatamento** (V → A): controlado pelo usuário
12. **Queima de Combustíveis Fósseis** (F → A): controlado pelo usuário

### Processo Geológico (automático)
13. **Formação de Combustíveis** (Od → F): ~0 GtC/ano (escala geológica)

## 🎨 Visualização

### Diagrama
- Caixas com área proporcional ao estoque (área ∝ estoque^0.5)
- Setas douradas: processos naturais
- Setas azuis: processos humanos
- Labels dinâmicos mostrando fluxos atuais em GtC/ano

### Gráfico Temporal
- **Painel Esquerdo (60%)**: Ciclo rápido (A, V, S, Os)
- **Painel Direito (40%)**: Ciclo lento com 2 eixos Y
  - Eixo primário: Od, F
  - Eixo secundário: R (escala muito maior)

## 🛠️ Tecnologias

- **Next.js 14**: Framework React com App Router
- **React 18**: Biblioteca de interface
- **Plotly.js**: Visualização de gráficos científicos
- **html2canvas**: Exportação de gráficos como imagem
- **JavaScript**: Linguagem principal (sem TypeScript para simplicidade)

## 📁 Estrutura do Projeto

```
carbon-cycle-simulator/
├── src/
│   ├── app/
│   │   ├── layout.js          # Layout raiz
│   │   └── page.js             # Página principal
│   ├── components/
│   │   └── CarbonCycleSimulator.jsx  # Componente principal
│   └── lib/
│       ├── simulation.js       # Modelagem matemática (RK4, fluxos)
│       └── visualization.js    # Geometria e rendering
├── package.json
├── next.config.js
└── README.md
```

## 🔬 Validação Científica

O simulador preserva rigorosamente:

1. **Conservação de Massa**: Total de carbono constante (±0.001%)
2. **Equações Diferenciais**: RK4 com precisão de 4ª ordem
3. **Escalas Temporais**: Ciclo rápido (~anos) e lento (~milhões de anos)
4. **Fluxos Realistas**: Baseados em dados científicos do ciclo do carbono

## 📝 Licença

Este projeto é fornecido como está, para fins educacionais e de pesquisa.

## 🤝 Contribuições

Melhorias e correções são bem-vindas! Por favor, mantenha a precisão da modelagem matemática.

## 📧 Contato

Para questões sobre a modelagem ou implementação, abra uma issue no repositório.

---

**Nota Importante**: Este simulador é uma ferramenta educacional. Para pesquisa científica rigorosa, consulte modelos de circulação global (GCMs) validados pela comunidade científica.
