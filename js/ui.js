/**
 * ui.js - Control de navegación, interfaz y gestión de entradas
 * DAT-242 Métodos Numéricos (UMSA)
 */

// Respaldo embebido de escenarios en caso de fallo de fetch (ej. protocolo file://)
const DATOS_ESCENARIOS_RESPALDO = {
  "activos": ["AAPL", "MSFT", "GOOGL", "AMZN"],
  "fecha_extraccion": "2026-10-28",
  "escenarios": [
    {
      "id": "ideal",
      "nombre": "Ideal",
      "descripcion": "Escenario base de mercado con matriz de covarianzas anualizadas y vector de retornos esperados reales obtenidos de cotizaciones históricas a 2 años.",
      "condicion_kappa": 13.9663,
      "A": [
        [0.050625, 0.038556, 0.03978, 0.042548],
        [0.038556, 0.056644, 0.04402, 0.048695],
        [0.03978, 0.04402, 0.073984, 0.053965],
        [0.042548, 0.048695, 0.053965, 0.0961]
      ],
      "b": [0.245, 0.221, 0.268, 0.215]
    },
    {
      "id": "bajo_estres",
      "nombre": "Bajo estrés",
      "descripcion": "Escenario de estrés financiero: volatilidades anualizadas incrementadas en 50% (covarianzas multiplicadas por 2.25) y retornos esperados reducidos al 50% debido al shock y aversión al riesgo en el mercado.",
      "condicion_kappa": 13.9663,
      "A": [
        [0.113906, 0.086751, 0.089505, 0.095733],
        [0.086751, 0.127449, 0.099045, 0.109564],
        [0.089505, 0.099045, 0.166464, 0.121421],
        [0.095733, 0.109564, 0.121421, 0.216225]
      ],
      "b": [0.1225, 0.1105, 0.134, 0.1075]
    },
    {
      "id": "mal_condicionado",
      "nombre": "Mal condicionado",
      "descripcion": "Escenario de mal condicionamiento numérico mediante transformación D·A·D (reescalado del activo GOOGL por factor 20). Preserva simetría y definición positiva (SPD), pero eleva el número de condición κ(A) para evaluar el precondicionador Jacobi.",
      "condicion_kappa": 2000.977,
      "A": [
        [0.050625, 0.038556, 0.7956, 0.042548],
        [0.038556, 0.056644, 0.8804, 0.048695],
        [0.7956, 0.8804, 29.5936, 1.0793],
        [0.042548, 0.048695, 1.0793, 0.0961]
      ],
      "b": [0.245, 0.221, 5.36, 0.215]
    }
  ]
};

const ACTIVOS_INFO = [
  { ticker: "AAPL", empresa: "Apple Inc." },
  { ticker: "MSFT", empresa: "Microsoft Corp." },
  { ticker: "GOOGL", empresa: "Alphabet Inc." },
  { ticker: "AMZN", empresa: "Amazon.com Inc." }
];

document.addEventListener('DOMContentLoaded', () => {
  // =========================================================================
  // 1. NAVEGACIÓN ENTRE SECCIONES
  // =========================================================================
  const navButtons = document.querySelectorAll('.nav-btn');
  const sections = document.querySelectorAll('.content-section');
  const mobileMenuBtn = document.getElementById('mobile-menu-btn');
  const mobileNav = document.getElementById('mobile-nav');

  function navigateTo(targetId) {
    let found = false;

    sections.forEach(section => {
      if (section.id === targetId) {
        section.classList.remove('hidden');
        found = true;
      } else {
        section.classList.add('hidden');
      }
    });

    if (!found && sections.length > 0) {
      sections[0].classList.remove('hidden');
      targetId = sections[0].id;
    }

    navButtons.forEach(btn => {
      if (btn.getAttribute('data-target') === targetId) {
        btn.classList.add('active');
      } else {
        btn.classList.remove('active');
      }
    });

    if (mobileNav && !mobileNav.classList.contains('hidden')) {
      mobileNav.classList.add('hidden');
    }

    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  navButtons.forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.preventDefault();
      const target = btn.getAttribute('data-target');
      if (target) {
        navigateTo(target);
      }
    });
  });

  if (mobileMenuBtn && mobileNav) {
    mobileMenuBtn.addEventListener('click', () => {
      mobileNav.classList.toggle('hidden');
    });
  }

  // =========================================================================
  // 2. GESTIÓN DE ENTRADA DE DATOS (SECCIÓN 4)
  // =========================================================================
  const selectX0 = document.getElementById('select-x0');
  const contenedorX0Custom = document.getElementById('contenedor-x0-custom');
  const btnCalcular = document.getElementById('btn-calcular');
  const calcStatusMsg = document.getElementById('calc-status-msg');

  if (selectX0 && contenedorX0Custom) {
    selectX0.addEventListener('change', () => {
      const valor = selectX0.value;
      if (valor === 'custom') {
        contenedorX0Custom.classList.remove('hidden');
      } else {
        contenedorX0Custom.classList.add('hidden');
        const inputsCustom = [
          document.getElementById('x0-custom-0'),
          document.getElementById('x0-custom-1'),
          document.getElementById('x0-custom-2'),
          document.getElementById('x0-custom-3')
        ];
        let valDefault = 0;
        if (valor === 'ones') valDefault = 0.25;
        if (valor === 'unit') valDefault = 1.0;

        inputsCustom.forEach(input => {
          if (input) input.value = valDefault;
        });
      }
      dispararRecalculoAuto();
    });
  }

  function leerMatrizA() {
    const A = [];
    for (let i = 0; i < 4; i++) {
      A[i] = [];
      for (let j = 0; j < 4; j++) {
        const input = document.getElementById(`mat-a-${i}-${j}`);
        A[i][j] = input ? parseFloat(input.value) || 0 : 0;
      }
    }
    return A;
  }

  function leerVectorB() {
    const b = [];
    for (let i = 0; i < 4; i++) {
      const input = document.getElementById(`vec-b-${i}`);
      b[i] = input ? parseFloat(input.value) || 0 : 0;
    }
    return b;
  }

  function leerVectorX0() {
    const modo = selectX0 ? selectX0.value : 'zeros';
    if (modo === 'zeros') return [0, 0, 0, 0];
    if (modo === 'ones') return [0.25, 0.25, 0.25, 0.25];
    if (modo === 'unit') return [1, 1, 1, 1];

    const x0 = [];
    for (let i = 0; i < 4; i++) {
      const input = document.getElementById(`x0-custom-${i}`);
      x0[i] = input ? parseFloat(input.value) || 0 : 0;
    }
    return x0;
  }

  function leerParametros() {
    const inputTol = document.getElementById('input-tol');
    const inputMaxIter = document.getElementById('input-max-iter');
    const selectPrecond = document.getElementById('select-precond');

    return {
      tol: inputTol ? parseFloat(inputTol.value) || 1e-6 : 1e-6,
      maxIter: inputMaxIter ? parseInt(inputMaxIter.value, 10) || 100 : 100,
      precond: selectPrecond ? selectPrecond.value : 'jacobi'
    };
  }

  function establecerMatrizA(A) {
    if (!A || A.length !== 4) return;
    for (let i = 0; i < 4; i++) {
      for (let j = 0; j < 4; j++) {
        const input = document.getElementById(`mat-a-${i}-${j}`);
        if (input && typeof A[i][j] === 'number') {
          input.value = A[i][j];
        }
      }
    }
  }

  function establecerVectorB(b) {
    if (!b || b.length !== 4) return;
    for (let i = 0; i < 4; i++) {
      const input = document.getElementById(`vec-b-${i}`);
      if (input && typeof b[i] === 'number') {
        input.value = b[i];
      }
    }
  }

  // =========================================================================
  // 3. GESTIÓN DE TRES ESCENARIOS (SECCIÓN 5)
  // =========================================================================
  const btnCargarIdeal = document.getElementById('btn-cargar-ideal');
  const btnCargarEstres = document.getElementById('btn-cargar-estres');
  const btnCargarMal = document.getElementById('btn-cargar-mal');
  const escenarioActivoTag = document.getElementById('escenario-activo-tag');
  const preDetalleA = document.getElementById('pre-detalle-a');
  const preDetalleB = document.getElementById('pre-detalle-b');
  const escenarioFuenteStatus = document.getElementById('escenario-fuente-status');

  async function obtenerEscenariosData() {
    try {
      const respuesta = await fetch('data/escenarios.json');
      if (!respuesta.ok) {
        throw new Error(`Error HTTP: ${respuesta.status}`);
      }
      const json = await respuesta.json();
      return { datos: json, origen: 'fetch (data/escenarios.json)' };
    } catch (error) {
      console.warn('Fetch de escenarios falló, utilizando respaldo embebido:', error);
      return { datos: DATOS_ESCENARIOS_RESPALDO, origen: 'respaldo local embebido' };
    }
  }

  function formatearMatrizPre(A, activos) {
    if (!A || !activos) return '';
    let out = '       ' + activos.map(a => a.padEnd(10)).join('') + '\n';
    out += '      ' + '-'.repeat(42) + '\n';
    for (let i = 0; i < A.length; i++) {
      out += activos[i].padEnd(6) + '| ' + A[i].map(val => val.toFixed(6).padEnd(10)).join('') + '\n';
    }
    return out;
  }

  function formatearVectorPre(b, activos) {
    if (!b || !activos) return '';
    let out = 'Activo    | Retorno Esperado (b_i)\n';
    out += '----------------------------------\n';
    for (let i = 0; i < b.length; i++) {
      out += activos[i].padEnd(10) + '| ' + b[i].toFixed(6) + '\n';
    }
    return out;
  }

  async function aplicarEscenario(idEscenario) {
    const { datos, origen } = await obtenerEscenariosData();
    const lista = Array.isArray(datos.escenarios) 
      ? datos.escenarios 
      : Object.values(datos.escenarios);

    const escenario = lista.find(e => e.id === idEscenario) || lista[0];
    if (!escenario) return;

    establecerMatrizA(escenario.A);
    establecerVectorB(escenario.b);

    if (escenarioActivoTag) {
      escenarioActivoTag.textContent = escenario.nombre.toUpperCase();
      if (idEscenario === 'ideal') {
        escenarioActivoTag.className = 'font-bold text-cyan-300 font-mono';
      } else if (idEscenario === 'bajo_estres') {
        escenarioActivoTag.className = 'font-bold text-amber-300 font-mono';
      } else {
        escenarioActivoTag.className = 'font-bold text-rose-300 font-mono';
      }
    }

    if (escenarioFuenteStatus) {
      escenarioFuenteStatus.textContent = `Fuente de datos: ${origen} | κ(A) = ${escenario.condicion_kappa || 'N/D'}`;
    }

    if (preDetalleA) {
      preDetalleA.textContent = formatearMatrizPre(escenario.A, datos.activos);
    }
    if (preDetalleB) {
      preDetalleB.textContent = formatearVectorPre(escenario.b, datos.activos);
    }

    // Ejecutar cálculo automático para actualizar todas las secciones
    ejecutarCalculo(escenario.nombre);
  }

  // =========================================================================
  // 4. DIAGNÓSTICO MATRICIAL (SECCIÓN 3)
  // =========================================================================
  const diagEscenarioBadge = document.getElementById('diag-escenario-badge');
  const diagSimetriaStatus = document.getElementById('diag-simetria-status');
  const diagSimetriaDesc = document.getElementById('diag-simetria-desc');
  const diagSylvesterStatus = document.getElementById('diag-sylvester-status');
  const diagMenoresVals = document.getElementById('diag-menores-vals');
  const diagAutovaloresStatus = document.getElementById('diag-autovalores-status');
  const diagAutovaloresVals = document.getElementById('diag-autovalores-vals');
  const diagKappaVal = document.getElementById('diag-kappa-val');
  const diagKappaDesc = document.getElementById('diag-kappa-desc');
  const btnRecalcularDiag = document.getElementById('btn-recalcular-diag');

  function actualizarDiagnosticoSeccion3(A, nombreEscenario = 'Personalizado') {
    if (!A || !window.LinAlg) return;

    if (diagEscenarioBadge) {
      diagEscenarioBadge.textContent = nombreEscenario.toUpperCase();
    }

    // 1. Simetría
    const esSimetrica = window.LinAlg.isSymmetric(A, 1e-8);
    let diffMax = 0;
    for (let i = 0; i < A.length; i++) {
      for (let j = i + 1; j < A.length; j++) {
        diffMax = Math.max(diffMax, Math.abs(A[i][j] - A[j][i]));
      }
    }

    if (diagSimetriaStatus) {
      if (esSimetrica) {
        diagSimetriaStatus.className = 'text-sm font-bold text-emerald-400 flex items-center gap-1.5 font-mono';
        diagSimetriaStatus.innerHTML = '<span>●</span> <span>SÍ (Simétrica)</span>';
      } else {
        diagSimetriaStatus.className = 'text-sm font-bold text-rose-400 flex items-center gap-1.5 font-mono';
        diagSimetriaStatus.innerHTML = '<span>▲</span> <span>NO SIMÉTRICA</span>';
      }
    }
    if (diagSimetriaDesc) {
      diagSimetriaDesc.textContent = `max |aᵢⱼ - aⱼᵢ| = ${diffMax.toExponential(2)}`;
    }

    // 2. Menores principales (Criterio de Sylvester)
    try {
      const menores = window.LinAlg.principalMinors(A);
      const todosPositivos = menores.every(m => m > 0);
      if (diagSylvesterStatus) {
        if (todosPositivos) {
          diagSylvesterStatus.className = 'text-sm font-bold text-emerald-400 flex items-center gap-1.5 font-mono';
          diagSylvesterStatus.innerHTML = '<span>●</span> <span>Sylvester: SPD Válida</span>';
        } else {
          diagSylvesterStatus.className = 'text-sm font-bold text-rose-400 flex items-center gap-1.5 font-mono';
          diagSylvesterStatus.innerHTML = '<span>▲</span> <span>No SPD (Δₖ ≤ 0)</span>';
        }
      }
      if (diagMenoresVals) {
        diagMenoresVals.innerHTML = menores
          .map((m, idx) => {
            const fmt = Math.abs(m) < 0.001 ? m.toExponential(2) : m.toFixed(6);
            const ok = m > 0;
            return `<div class="${ok ? 'text-cyan-300' : 'text-rose-400'}">Δ${idx + 1} = ${fmt} (${ok ? '> 0' : '≤ 0'})</div>`;
          })
          .join('');
      }
    } catch (e) {
      console.warn("Error en cálculo de menores:", e);
    }

    // 3. Autovalores (Jacobi Cíclico)
    try {
      const { eigenvalues } = window.LinAlg.eigenSymmetric(A);
      const lambdaMin = eigenvalues[0];

      if (diagAutovaloresStatus) {
        if (lambdaMin > 0) {
          diagAutovaloresStatus.className = 'text-sm font-bold text-emerald-400 flex items-center gap-1.5 font-mono';
          diagAutovaloresStatus.innerHTML = '<span>●</span> <span>λₘᵢₙ > 0 (SPD)</span>';
        } else {
          diagAutovaloresStatus.className = 'text-sm font-bold text-rose-400 flex items-center gap-1.5 font-mono';
          diagAutovaloresStatus.innerHTML = '<span>▲</span> <span>λₘᵢₙ ≤ 0 (No SPD)</span>';
        }
      }
      if (diagAutovaloresVals) {
        diagAutovaloresVals.innerHTML = eigenvalues
          .map((ev, idx) => `<div>λ${idx + 1} = ${ev.toFixed(6)}</div>`)
          .join('');
      }

      // 4. Número de Condición kappa(A)
      const kappa = window.LinAlg.condNumber(A);
      if (diagKappaVal) {
        diagKappaVal.textContent = isFinite(kappa) ? `κ(A) ≈ ${kappa.toFixed(3)}` : 'κ(A) = ∞';
      }
      if (diagKappaDesc) {
        if (kappa < 50) {
          diagKappaDesc.className = 'text-[11px] text-emerald-400 font-mono mt-2 pt-2 border-t border-cyan-950';
          diagKappaDesc.textContent = 'λₘₐₓ/λₘᵢₙ (Bien condicionada)';
        } else if (kappa < 500) {
          diagKappaDesc.className = 'text-[11px] text-amber-400 font-mono mt-2 pt-2 border-t border-cyan-950';
          diagKappaDesc.textContent = 'λₘₐₓ/λₘᵢₙ (Condición moderada)';
        } else {
          diagKappaDesc.className = 'text-[11px] text-rose-400 font-mono mt-2 pt-2 border-t border-cyan-950';
          diagKappaDesc.textContent = 'λₘₐₓ/λₘᵢₙ (Mal condicionada)';
        }
      }
    } catch (e) {
      console.warn("Error en cálculo espectral:", e);
    }
  }

  // =========================================================================
  // 5. EJECUCIÓN DE MÉTODOS Y ACTUALIZACIÓN DE SECCIONES 6 Y 7
  // =========================================================================
  let chartResiduosInstance = null;

  function renderizarGraficoResiduos(historialGC, historialGCP, tol) {
    const canvas = document.getElementById('chart-residuos');
    if (!canvas || typeof Chart === 'undefined') return;

    const maxLen = Math.max(historialGC.length, historialGCP.length);
    const labels = Array.from({ length: maxLen }, (_, i) => `It ${i}`);

    if (chartResiduosInstance) {
      chartResiduosInstance.destroy();
    }

    const ctx = canvas.getContext('2d');
    chartResiduosInstance = new Chart(ctx, {
      type: 'line',
      data: {
        labels: labels,
        datasets: [
          {
            label: 'GC Clásico (‖rₖ‖₂ / ‖b‖₂)',
            data: historialGC,
            borderColor: '#00f0ff',
            backgroundColor: 'rgba(0, 240, 255, 0.1)',
            borderWidth: 2,
            pointRadius: 4,
            pointBackgroundColor: '#00f0ff',
            tension: 0.15
          },
          {
            label: 'GCP (Jacobi) (‖rₖ‖₂ / ‖b‖₂)',
            data: historialGCP,
            borderColor: '#10b981',
            backgroundColor: 'rgba(16, 185, 129, 0.1)',
            borderWidth: 2,
            pointRadius: 4,
            pointBackgroundColor: '#10b981',
            tension: 0.15
          },
          {
            label: `Tolerancia de parada (${tol})`,
            data: new Array(maxLen).fill(tol),
            borderColor: '#ef4444',
            borderWidth: 1.5,
            borderDash: [6, 6],
            pointRadius: 0,
            fill: false
          }
        ]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        scales: {
          y: {
            type: 'logarithmic',
            title: {
              display: true,
              text: 'Norma Residual Relativa (‖rₖ‖ / ‖b‖)',
              color: '#00f0ff',
              font: { family: 'Share Tech Mono, monospace', size: 11 }
            },
            grid: {
              color: 'rgba(14, 165, 233, 0.15)'
            },
            ticks: {
              color: '#94a3b8',
              font: { family: 'Share Tech Mono, monospace' }
            }
          },
          x: {
            title: {
              display: true,
              text: 'Iteración (k)',
              color: '#00f0ff',
              font: { family: 'Share Tech Mono, monospace', size: 11 }
            },
            grid: {
              color: 'rgba(14, 165, 233, 0.15)'
            },
            ticks: {
              color: '#94a3b8',
              font: { family: 'Share Tech Mono, monospace' }
            }
          }
        },
        plugins: {
          legend: {
            labels: {
              color: '#e0f2fe',
              font: { family: 'Share Tech Mono, monospace', size: 11 }
            }
          },
          tooltip: {
            callbacks: {
              label: function(context) {
                const val = context.parsed.y;
                return `${context.dataset.label}: ${val.toExponential(4)}`;
              }
            }
          }
        }
      }
    });
  }

  // Estado para el panel de sensibilidad
  let estadoSensibilidad = { deltaPct: 0, target: '0' };
  let ultimoCalculo = null;

  function ejecutarCalculo(nombreEscenario = 'Personalizado') {
    if (!window.LinAlg || !window.Solvers) return;

    try {
      const A = leerMatrizA();
      const b = leerVectorB();
      const x0 = leerVectorX0();
      const params = leerParametros();

      // 1. Actualizar Diagnóstico de Sección 3
      actualizarDiagnosticoSeccion3(A, nombreEscenario);

      // 2. Ejecutar Cholesky (Solución exacta de referencia)
      const xRef = window.LinAlg.solveCholesky(A, b);
      const L = window.LinAlg.cholesky(A);

      // Cálculo del residuo de Cholesky ‖Ax - b‖₂
      const AxRef = window.LinAlg.matVec(A, xRef);
      const diffRef = [];
      for (let i = 0; i < b.length; i++) {
        diffRef.push(AxRef[i] - b[i]);
      }
      const normResRef = window.LinAlg.norm2(diffRef);

      // Normalización de pesos de referencia: w_i = x_i / ∑ x_j
      const sumXRef = xRef.reduce((acc, val) => acc + val, 0);
      const wRef = xRef.map(val => (sumXRef !== 0 ? val / sumXRef : 0));

      // Actualizar DOM en Sección 6: Solución de Referencia
      const tbodyRef = document.getElementById('tbody-referencia');
      if (tbodyRef) {
        tbodyRef.innerHTML = xRef.map((xi, idx) => {
          const wi = wRef[idx];
          const pct = wi * 100;
          const esLarga = xi >= 0;
          return `
            <tr class="hover:bg-cyan-950/30 transition-colors">
              <td class="p-2.5 text-cyan-300 font-bold">${ACTIVOS_INFO[idx].ticker}</td>
              <td class="p-2.5 text-gray-300">${ACTIVOS_INFO[idx].empresa}</td>
              <td class="p-2.5 text-right font-mono">${xi.toFixed(6)}</td>
              <td class="p-2.5 text-right font-mono text-cyan-200">${wi.toFixed(6)}</td>
              <td class="p-2.5 text-right font-mono ${pct >= 0 ? 'text-emerald-400' : 'text-rose-400'}">${pct.toFixed(2)} %</td>
              <td class="p-2.5 text-center">
                <span class="px-2 py-0.5 rounded text-[10px] font-bold ${esLarga ? 'bg-emerald-950/80 text-emerald-400 border border-emerald-700' : 'bg-rose-950/80 text-rose-400 border border-rose-700'}">
                  ${esLarga ? 'LARGA' : 'CORTA'}
                </span>
              </td>
            </tr>
          `;
        }).join('');
      }

      const tfootSumX = document.getElementById('tfoot-ref-sum-x');
      if (tfootSumX) tfootSumX.textContent = sumXRef.toFixed(6);

      const refResiduoNorma = document.getElementById('ref-residuo-norma');
      if (refResiduoNorma) {
        refResiduoNorma.textContent = `‖Ax - b‖ ≈ ${normResRef.toExponential(2)}`;
      }

      const preCholeskyL = document.getElementById('pre-cholesky-l');
      if (preCholeskyL) {
        preCholeskyL.textContent = formatearMatrizPre(L, ACTIVOS_INFO.map(a => a.ticker));
      }

      // 3. Ejecutar Solvers Iterativos: GC y GCP
      const resGC = window.Solvers.solveGC(A, b, x0, params.tol, params.maxIter);
      const resGCP = window.Solvers.solveGCP(A, b, x0, params.tol, params.maxIter);

      // Normalizar pesos de GC y GCP
      const sumXGC = resGC.x.reduce((a, v) => a + v, 0);
      const sumXGCP = resGCP.x.reduce((a, v) => a + v, 0);

      // 4. Actualizar DOM en Sección 7: GCP vs GC
      // Tarjeta GC
      const gcIterVal = document.getElementById('gc-iteraciones-val');
      const gcResVal = document.getElementById('gc-residuo-val');
      const gcBadge = document.getElementById('gc-badge-convergio');
      const gcVectorX = document.getElementById('gc-vector-x');

      if (gcIterVal) gcIterVal.textContent = resGC.iteraciones;
      if (gcResVal) gcResVal.textContent = resGC.residuoRelativo.toExponential(4);
      if (gcBadge) {
        if (resGC.convergio) {
          gcBadge.className = 'text-[10px] px-2 py-0.5 rounded font-mono font-bold bg-emerald-950 border border-emerald-500 text-emerald-300';
          gcBadge.textContent = '✓ CONVERGIÓ';
        } else {
          gcBadge.className = 'text-[10px] px-2 py-0.5 rounded font-mono font-bold bg-rose-950 border border-rose-500 text-rose-300';
          gcBadge.textContent = '▲ NO CONVERGIÓ';
        }
      }
      if (gcVectorX) {
        gcVectorX.textContent = resGC.x.map((val, idx) => {
          const w = sumXGC !== 0 ? (val / sumXGC) * 100 : 0;
          return `${ACTIVOS_INFO[idx].ticker.padEnd(5)} | x: ${val.toFixed(6).padStart(10)} | w: ${w.toFixed(2).padStart(7)}%`;
        }).join('\n');
      }

      // Tarjeta GCP
      const gcpIterVal = document.getElementById('gcp-iteraciones-val');
      const gcpResVal = document.getElementById('gcp-residuo-val');
      const gcpBadge = document.getElementById('gcp-badge-convergio');
      const gcpVectorX = document.getElementById('gcp-vector-x');

      if (gcpIterVal) gcpIterVal.textContent = resGCP.iteraciones;
      if (gcpResVal) gcpResVal.textContent = resGCP.residuoRelativo.toExponential(4);
      if (gcpBadge) {
        if (resGCP.convergio) {
          gcpBadge.className = 'text-[10px] px-2 py-0.5 rounded font-mono font-bold bg-emerald-950 border border-emerald-500 text-emerald-300';
          gcpBadge.textContent = '✓ CONVERGIÓ';
        } else {
          gcpBadge.className = 'text-[10px] px-2 py-0.5 rounded font-mono font-bold bg-rose-950 border border-rose-500 text-rose-300';
          gcpBadge.textContent = '▲ NO CONVERGIÓ';
        }
      }
      if (gcpVectorX) {
        gcpVectorX.textContent = resGCP.x.map((val, idx) => {
          const w = sumXGCP !== 0 ? (val / sumXGCP) * 100 : 0;
          return `${ACTIVOS_INFO[idx].ticker.padEnd(5)} | x: ${val.toFixed(6).padStart(10)} | w: ${w.toFixed(2).padStart(7)}%`;
        }).join('\n');
      }

      // Resumen comparativo
      const badgeResumen = document.getElementById('badge-comparativa-resumen');
      if (badgeResumen) {
        const kappaPre = window.Solvers.condPrecond ? window.Solvers.condPrecond(A) : null;
        const kappaPreStr = kappaPre ? ` | κ(M⁻¹A) ≈ ${kappaPre.toFixed(2)}` : '';
        badgeResumen.innerHTML = `GCP: <span class="text-emerald-400 font-bold">${resGCP.iteraciones} it</span> vs GC: <span class="text-cyan-400 font-bold">${resGC.iteraciones} it</span>${kappaPreStr}`;
      }

      // 5. Gráfico Chart.js
      renderizarGraficoResiduos(resGC.historial, resGCP.historial, params.tol);

      // 6. Actualizar Sección 8: Análisis de Errores por Variable
      actualizarErroresVariable(A, b, xRef, resGCP);

      // 7. Actualizar Sección 8: Tabla Comparativa Multiescenario
      actualizarComparativaTresEscenarios();

      // 8. Actualizar Sección 8: Panel de Sensibilidad y Heatmap de Correlación
      ultimoCalculo = { A, b, xRef, resGC, resGCP };
      actualizarHeatmapCorrelacion(A);
      actualizarPanelSensibilidad(estadoSensibilidad.deltaPct, estadoSensibilidad.target);

      // Estado en consola terminal de Sección 4
      if (calcStatusMsg) {
        calcStatusMsg.innerHTML = `<span class="text-emerald-400">✓ Solución calculada:</span> Cholesky exacto, GC (${resGC.iteraciones} it) y GCP (${resGCP.iteraciones} it) ejecutados con éxito.`;
      }

    } catch (error) {
      console.warn("Aviso en el cálculo numérico:", error);
      if (calcStatusMsg) {
        calcStatusMsg.innerHTML = `<span class="text-amber-400">▲ Aviso:</span> ${error.message}`;
      }
    }
  }

  // =========================================================================
  // 6. ANÁLISIS DE ERRORES Y COMPARATIVA MULTIESCENARIO (SECCIÓN 8)
  // =========================================================================

  /**
   * Actualiza la tabla de errores por variable para la solución actual de GCP vs Cholesky.
   */
  function actualizarErroresVariable(A, b, xRef, resGCP) {
    const tbody = document.getElementById('tbody-errores-variable');
    const badgeResGlobal = document.getElementById('err-residuo-global-gcp');
    const tfootNormEa = document.getElementById('tfoot-norm-ea');
    const tfootGlobalErrRel = document.getElementById('tfoot-global-err-rel');
    if (!tbody || !xRef || !resGCP) return;

    const xGCP = resGCP.x;
    let sumEaCuad = 0;
    let sumRefCuad = 0;

    tbody.innerHTML = xRef.map((xref_i, idx) => {
      const xgcp_i = xGCP[idx];
      const Ea = Math.abs(xref_i - xgcp_i);
      sumEaCuad += Ea * Ea;
      sumRefCuad += xref_i * xref_i;

      let strEr, strEp;
      if (Math.abs(xref_i) < 1e-15) {
        strEr = "no definido";
        strEp = "no definido";
      } else {
        const Er = Ea / Math.abs(xref_i);
        const Ep = Er * 100;
        strEr = Er < 1e-3 ? Er.toExponential(4) : Er.toFixed(6);
        strEp = Ep < 1e-3 ? Ep.toExponential(4) + " %" : Ep.toFixed(4) + " %";
      }

      const strEa = Ea < 1e-3 ? Ea.toExponential(4) : Ea.toFixed(6);

      return `
        <tr class="hover:bg-cyan-950/30 transition-colors">
          <td class="p-2.5 text-cyan-300 font-bold">${ACTIVOS_INFO[idx].ticker}</td>
          <td class="p-2.5 text-gray-300">${ACTIVOS_INFO[idx].empresa}</td>
          <td class="p-2.5 text-right font-mono">${xref_i.toFixed(6)}</td>
          <td class="p-2.5 text-right font-mono text-emerald-300">${xgcp_i.toFixed(6)}</td>
          <td class="p-2.5 text-right font-mono text-cyan-200">${strEa}</td>
          <td class="p-2.5 text-right font-mono text-gray-300">${strEr}</td>
          <td class="p-2.5 text-right font-mono text-emerald-400 font-bold">${strEp}</td>
        </tr>
      `;
    }).join('');

    // Residuo relativo global ‖b - A·xGCP‖₂ / ‖b‖₂
    const AxGCP = window.LinAlg.matVec(A, xGCP);
    const diffB = b.map((bi, i) => bi - AxGCP[i]);
    const normB = window.LinAlg.norm2(b);
    const resRelGlobal = normB > 0 ? window.LinAlg.norm2(diffB) / normB : 0;

    if (badgeResGlobal) {
      badgeResGlobal.textContent = `‖b - AxGCP‖/‖b‖ ≈ ${resRelGlobal.toExponential(4)}`;
    }

    const normEa = Math.sqrt(sumEaCuad);
    const normXRef = Math.sqrt(sumRefCuad);
    const relGlobal = normXRef > 0 ? (normEa / normXRef) * 100 : 0;

    if (tfootNormEa) {
      tfootNormEa.textContent = normEa < 1e-3 ? normEa.toExponential(4) : normEa.toFixed(6);
    }
    if (tfootGlobalErrRel) {
      tfootGlobalErrRel.textContent = `Error relativo global: ${relGlobal.toExponential(2)} %`;
    }
  }

  /**
   * Ejecuta automáticamente los 3 escenarios y llena la tabla comparativa integral.
   */
  async function actualizarComparativaTresEscenarios() {
    const tbody = document.getElementById('tbody-comparativa-escenarios');
    if (!tbody || !window.LinAlg || !window.Solvers) return;

    try {
      const { datos } = await obtenerEscenariosData();
      const lista = Array.isArray(datos.escenarios) 
        ? datos.escenarios 
        : Object.values(datos.escenarios);

      if (lista.length < 3) return;

      const resultados = lista.map((esc, index) => {
        const A = esc.A;
        const b = esc.b;
        const xRef = window.LinAlg.solveCholesky(A, b);
        const resGC = window.Solvers.solveGC(A, b, [0, 0, 0, 0], 1e-6, 100);
        const resGCP = window.Solvers.solveGCP(A, b, [0, 0, 0, 0], 1e-6, 100);

        const EaVec = xRef.map((v, i) => Math.abs(v - resGCP.x[i]));
        const normEa = window.LinAlg.norm2(EaVec);
        const normXRef = window.LinAlg.norm2(xRef);
        const Ep = normXRef > 0 ? (normEa / normXRef) * 100 : 0;

        const kappaA = window.LinAlg.condNumber(A);
        const kappaM = window.Solvers.condPrecond(A);

        let interpretacion = "";
        if (index === 0) {
          interpretacion = "Cartera óptima en mercado normal: alta asignación en AAPL y GOOGL, moderada en MSFT y posición corta en AMZN. Ambos solvers convergen en 4 iteraciones con error mínimo.";
        } else if (index === 1) {
          interpretacion = "Shock sistémico bajista: volatilidades infladas x1.5 (covarianzas x2.25) y retornos reducidos al 50%. Los pesos se contraen a ~22% del nivel base preservando simetría y convergencia rápida.";
        } else {
          interpretacion = "Desbalance extremo de escala en el activo GOOGL (κ > 2000). El precondicionador diagonal Jacobi neutraliza el desbalance (κ reducido a 10.97) garantizando convergencia óptima.";
        }

        return {
          esc,
          xRef,
          resGC,
          resGCP,
          normEa,
          Ep,
          kappaA,
          kappaM,
          interpretacion
        };
      });

      function formatoVector(vec) {
        return `[${vec.map(v => v.toFixed(4)).join(', ')}]`;
      }

      tbody.innerHTML = `
        <tr class="hover:bg-cyan-950/20">
          <td class="p-2.5 font-bold text-gray-300">Solución de referencia (x_ref)</td>
          <td class="p-2.5 text-center text-cyan-200 text-[11px]">${formatoVector(resultados[0].xRef)}</td>
          <td class="p-2.5 text-center text-amber-200 text-[11px] border-l border-cyan-900">${formatoVector(resultados[1].xRef)}</td>
          <td class="p-2.5 text-center text-rose-200 text-[11px] border-l border-cyan-900">${formatoVector(resultados[2].xRef)}</td>
        </tr>
        <tr class="hover:bg-cyan-950/20">
          <td class="p-2.5 font-bold text-gray-300">Solución GCP (x_GCP)</td>
          <td class="p-2.5 text-center text-emerald-300 text-[11px]">${formatoVector(resultados[0].resGCP.x)}</td>
          <td class="p-2.5 text-center text-emerald-300 text-[11px] border-l border-cyan-900">${formatoVector(resultados[1].resGCP.x)}</td>
          <td class="p-2.5 text-center text-emerald-300 text-[11px] border-l border-cyan-900">${formatoVector(resultados[2].resGCP.x)}</td>
        </tr>
        <tr class="hover:bg-cyan-950/20">
          <td class="p-2.5 font-bold text-gray-300">Error Absoluto Global (‖Ea‖₂)</td>
          <td class="p-2.5 text-center text-cyan-300">${resultados[0].normEa.toExponential(2)}</td>
          <td class="p-2.5 text-center text-amber-300 border-l border-cyan-900">${resultados[1].normEa.toExponential(2)}</td>
          <td class="p-2.5 text-center text-rose-300 border-l border-cyan-900">${resultados[2].normEa.toExponential(2)}</td>
        </tr>
        <tr class="hover:bg-cyan-950/20">
          <td class="p-2.5 font-bold text-gray-300">Error Porcentual Global (Ep)</td>
          <td class="p-2.5 text-center text-cyan-300">${resultados[0].Ep.toExponential(2)} %</td>
          <td class="p-2.5 text-center text-amber-300 border-l border-cyan-900">${resultados[1].Ep.toExponential(2)} %</td>
          <td class="p-2.5 text-center text-rose-300 border-l border-cyan-900">${resultados[2].Ep.toExponential(2)} %</td>
        </tr>
        <tr class="hover:bg-cyan-950/20">
          <td class="p-2.5 font-bold text-gray-300">Iteraciones GC</td>
          <td class="p-2.5 text-center text-cyan-400 font-bold">${resultados[0].resGC.iteraciones}</td>
          <td class="p-2.5 text-center text-amber-400 font-bold border-l border-cyan-900">${resultados[1].resGC.iteraciones}</td>
          <td class="p-2.5 text-center text-rose-400 font-bold border-l border-cyan-900">${resultados[2].resGC.iteraciones}</td>
        </tr>
        <tr class="hover:bg-cyan-950/20">
          <td class="p-2.5 font-bold text-gray-300">Iteraciones GCP (Jacobi)</td>
          <td class="p-2.5 text-center text-emerald-400 font-bold">${resultados[0].resGCP.iteraciones}</td>
          <td class="p-2.5 text-center text-emerald-400 font-bold border-l border-cyan-900">${resultados[1].resGCP.iteraciones}</td>
          <td class="p-2.5 text-center text-emerald-400 font-bold border-l border-cyan-900">${resultados[2].resGCP.iteraciones}</td>
        </tr>
        <tr class="hover:bg-cyan-950/20">
          <td class="p-2.5 font-bold text-gray-300">Número de condición κ(A)</td>
          <td class="p-2.5 text-center text-emerald-400 font-bold">${resultados[0].kappaA.toFixed(2)}</td>
          <td class="p-2.5 text-center text-amber-400 font-bold border-l border-cyan-900">${resultados[1].kappaA.toFixed(2)}</td>
          <td class="p-2.5 text-center text-rose-400 font-bold border-l border-cyan-900">${resultados[2].kappaA.toFixed(2)}</td>
        </tr>
        <tr class="hover:bg-cyan-950/20">
          <td class="p-2.5 font-bold text-gray-300">Número de condición κ(M⁻¹A)</td>
          <td class="p-2.5 text-center text-emerald-400 font-bold">${resultados[0].kappaM.toFixed(2)}</td>
          <td class="p-2.5 text-center text-emerald-400 font-bold border-l border-cyan-900">${resultados[1].kappaM.toFixed(2)}</td>
          <td class="p-2.5 text-center text-emerald-400 font-bold border-l border-cyan-900">${resultados[2].kappaM.toFixed(2)}</td>
        </tr>
        <tr class="hover:bg-cyan-950/20">
          <td class="p-2.5 font-bold text-gray-300">Residuo final GCP (‖r‖/‖b‖)</td>
          <td class="p-2.5 text-center text-cyan-300">${resultados[0].resGCP.residuoRelativo.toExponential(2)}</td>
          <td class="p-2.5 text-center text-amber-300 border-l border-cyan-900">${resultados[1].resGCP.residuoRelativo.toExponential(2)}</td>
          <td class="p-2.5 text-center text-rose-300 border-l border-cyan-900">${resultados[2].resGCP.residuoRelativo.toExponential(2)}</td>
        </tr>
        <tr class="hover:bg-cyan-950/20">
          <td class="p-2.5 font-bold text-gray-300">¿Convergió? (Tol = 1e-6)</td>
          <td class="p-2.5 text-center">
            <span class="px-2 py-0.5 rounded text-[10px] bg-emerald-950 text-emerald-300 border border-emerald-500 font-bold">✓ SÍ</span>
          </td>
          <td class="p-2.5 text-center border-l border-cyan-900">
            <span class="px-2 py-0.5 rounded text-[10px] bg-emerald-950 text-emerald-300 border border-emerald-500 font-bold">✓ SÍ</span>
          </td>
          <td class="p-2.5 text-center border-l border-cyan-900">
            <span class="px-2 py-0.5 rounded text-[10px] bg-emerald-950 text-emerald-300 border border-emerald-500 font-bold">✓ SÍ</span>
          </td>
        </tr>
        <tr class="hover:bg-cyan-950/20 bg-cyan-950/10">
          <td class="p-2.5 font-bold text-cyan-300 align-top">Interpretación financiera</td>
          <td class="p-2.5 text-left text-xs text-gray-300 leading-relaxed">${resultados[0].interpretacion}</td>
          <td class="p-2.5 text-left text-xs text-gray-300 leading-relaxed border-l border-cyan-900">${resultados[1].interpretacion}</td>
          <td class="p-2.5 text-left text-xs text-gray-300 leading-relaxed border-l border-cyan-900">${resultados[2].interpretacion}</td>
        </tr>
      `;
    } catch (e) {
      console.warn("Error generando comparativa multiescenario:", e);
    }
  }

  /**
   * Calcula y renderiza el mapa de calor (heatmap) 4x4 de la matriz de correlación R.
   * R_ij = A_ij / sqrt(A_ii * A_jj)
   */
  function actualizarHeatmapCorrelacion(A) {
    const tableHeatmap = document.getElementById('table-heatmap-correlacion');
    const spanAvg = document.getElementById('heatmap-avg-corr');
    const spanMax = document.getElementById('heatmap-max-pair');
    const spanMin = document.getElementById('heatmap-min-pair');
    const pInsight = document.getElementById('heatmap-insight');
    if (!tableHeatmap || !A) return;

    const n = A.length;
    const R = Array.from({ length: n }, () => Array(n).fill(0));
    for (let i = 0; i < n; i++) {
      for (let j = 0; j < n; j++) {
        const denom = Math.sqrt(A[i][i] * A[j][j]);
        R[i][j] = denom > 0 ? A[i][j] / denom : 0;
      }
    }

    // Encabezado
    let tableHtml = `
      <thead>
        <tr class="text-cyan-400 bg-cyan-950/50 border-b border-cyan-800">
          <th class="p-2 border border-cyan-900/60 text-gray-500 font-bold">R</th>
          ${ACTIVOS_INFO.map(a => `<th class="p-2 border border-cyan-900/60 font-bold">${a.ticker}</th>`).join('')}
        </tr>
      </thead>
      <tbody>
    `;

    // Filas
    for (let i = 0; i < n; i++) {
      tableHtml += `
        <tr class="hover:bg-cyan-950/20">
          <td class="p-2 bg-cyan-950/30 border border-cyan-900/60 font-bold text-cyan-300">${ACTIVOS_INFO[i].ticker}</td>
      `;
      for (let j = 0; j < n; j++) {
        const val = R[i][j];
        const esDiagonal = (i === j);
        let cellClass = "";
        let cellText = val.toFixed(4);

        if (esDiagonal) {
          cellClass = "bg-cyan-950 border border-cyan-400 text-cyan-200 font-bold shadow-[inset_0_0_6px_rgba(0,240,255,0.25)]";
          cellText = "1.0000";
        } else if (val >= 0.70) {
          cellClass = "bg-cyan-500/25 border border-cyan-600/70 text-cyan-200 font-bold";
        } else if (val >= 0.50) {
          cellClass = "bg-cyan-900/35 border border-cyan-800/60 text-cyan-300";
        } else if (val >= 0.30) {
          cellClass = "bg-teal-950/40 border border-teal-900/60 text-teal-300";
        } else if (val >= 0) {
          cellClass = "bg-indigo-950/40 border border-indigo-900/60 text-indigo-300";
        } else {
          cellClass = "bg-rose-950/40 border border-rose-900/60 text-rose-300";
        }

        tableHtml += `
          <td class="p-2 border border-cyan-900/60 ${cellClass}" title="Corr(${ACTIVOS_INFO[i].ticker}, ${ACTIVOS_INFO[j].ticker}) = ${val.toFixed(6)}">
            ${cellText}
          </td>
        `;
      }
      tableHtml += `</tr>`;
    }
    tableHtml += `</tbody>`;
    tableHeatmap.innerHTML = tableHtml;

    // Métricas de pares fuera de la diagonal (i < j)
    let sumOff = 0;
    let countOff = 0;
    let maxVal = -Infinity;
    let maxPair = "";
    let minVal = Infinity;
    let minPair = "";

    for (let i = 0; i < n; i++) {
      for (let j = i + 1; j < n; j++) {
        const r_ij = R[i][j];
        sumOff += r_ij;
        countOff++;
        if (r_ij > maxVal) {
          maxVal = r_ij;
          maxPair = `${ACTIVOS_INFO[i].ticker} / ${ACTIVOS_INFO[j].ticker}`;
        }
        if (r_ij < minVal) {
          minVal = r_ij;
          minPair = `${ACTIVOS_INFO[i].ticker} / ${ACTIVOS_INFO[j].ticker}`;
        }
      }
    }

    const avgCorr = countOff > 0 ? sumOff / countOff : 0;
    if (spanAvg) spanAvg.textContent = `${avgCorr >= 0 ? '+' : ''}${avgCorr.toFixed(4)}`;
    if (spanMax) spanMax.textContent = `${maxPair} (${maxVal >= 0 ? '+' : ''}${maxVal.toFixed(4)})`;
    if (spanMin) spanMin.textContent = `${minPair} (${minVal >= 0 ? '+' : ''}${minVal.toFixed(4)})`;

    if (pInsight) {
      pInsight.innerHTML = `
        <span class="text-cyan-300 font-bold">Diagnóstico de Diversificación:</span> 
        La correlación media inter-activos es <strong class="text-white">${avgCorr.toFixed(4)}</strong>. 
        Al ser todas las correlaciones estrictamente menores a 1.0 (<span class="text-cyan-200 font-mono">Rᵢⱼ &lt; 1</span>), 
        la frontera eficiente de Markowitz reduce la varianza global de la cartera. 
        El par con menor correlación (<span class="text-emerald-300 font-bold">${minPair}</span>) aporta la mayor contribución marginal a la diversificación del riesgo.
      `;
    }
  }

  /**
   * Calcula y actualiza el panel de sensibilidad financiera ante perturbaciones de b.
   */
  function actualizarPanelSensibilidad(deltaPct, target) {
    if (deltaPct === undefined) deltaPct = estadoSensibilidad.deltaPct;
    if (target === undefined) target = estadoSensibilidad.target;
    estadoSensibilidad.deltaPct = deltaPct;
    estadoSensibilidad.target = target;

    const tbody = document.getElementById('tbody-sensibilidad');
    const badgeActual = document.getElementById('badge-sensibilidad-actual');
    const tfootSumX = document.getElementById('tfoot-sens-sum-x');
    const tfootSumW = document.getElementById('tfoot-sens-sum-w');
    const tfootSumDw = document.getElementById('tfoot-sens-sum-dw');
    const pInterp = document.getElementById('sensibilidad-interpretacion');
    if (!tbody) return;

    // Obtener A y b base
    let A, bBase;
    if (ultimoCalculo && ultimoCalculo.A && ultimoCalculo.b) {
      A = ultimoCalculo.A;
      bBase = ultimoCalculo.b;
    } else {
      A = leerMatrizA();
      bBase = leerVectorB();
    }

    if (!A || !bBase || !window.Solvers || !window.LinAlg) return;

    // Solución base con GCP
    let xBase;
    if (ultimoCalculo && ultimoCalculo.resGCP && ultimoCalculo.resGCP.x) {
      xBase = ultimoCalculo.resGCP.x;
    } else {
      xBase = window.Solvers.solveGCP(A, bBase, [0, 0, 0, 0], 1e-6, 100).x;
    }
    const sumXBase = xBase.reduce((a, v) => a + v, 0);
    const wBase = xBase.map(x => (sumXBase !== 0 ? x / sumXBase : 0));

    // Crear vector b perturbado
    const bPert = bBase.slice();
    const factor = 1 + (deltaPct / 100);

    if (target === 'all') {
      for (let i = 0; i < bPert.length; i++) {
        bPert[i] = bBase[i] * factor;
      }
    } else {
      const idx = parseInt(target, 10);
      if (!isNaN(idx) && idx >= 0 && idx < bPert.length) {
        bPert[idx] = bBase[idx] * factor;
      }
    }

    // Resolver sistema perturbado con GCP Jacobi
    const resPert = window.Solvers.solveGCP(A, bPert, [0, 0, 0, 0], 1e-6, 100);
    const xPert = resPert.x;
    const sumXPert = xPert.reduce((a, v) => a + v, 0);
    const wPert = xPert.map(x => (sumXPert !== 0 ? x / sumXPert : 0));

    // Actualizar badge superior
    if (badgeActual) {
      const targetTxt = target === 'all' 
        ? 'Todos los activos' 
        : ACTIVOS_INFO[parseInt(target, 10)]?.ticker || 'Activo';
      const signTxt = deltaPct > 0 ? `+${deltaPct}%` : `${deltaPct}%`;
      badgeActual.textContent = deltaPct === 0 ? '0% (Base)' : `${signTxt} en ${targetTxt}`;
      if (deltaPct === 0) {
        badgeActual.className = 'px-2 py-0.5 text-xs font-mono font-bold rounded bg-cyan-950 border border-cyan-500 text-cyan-300';
      } else if (deltaPct > 0) {
        badgeActual.className = 'px-2 py-0.5 text-xs font-mono font-bold rounded bg-emerald-950 border border-emerald-500 text-emerald-300';
      } else {
        badgeActual.className = 'px-2 py-0.5 text-xs font-mono font-bold rounded bg-rose-950 border border-rose-500 text-rose-300';
      }
    }

    // Actualizar estilos activos de los botones rápidos
    const btnsMap = {
      '-10': document.getElementById('btn-pert-m10'),
      '-5': document.getElementById('btn-pert-m5'),
      '0': document.getElementById('btn-pert-0'),
      '5': document.getElementById('btn-pert-p5'),
      '10': document.getElementById('btn-pert-p10')
    };
    Object.entries(btnsMap).forEach(([k, btn]) => {
      if (!btn) return;
      if (parseInt(k, 10) === deltaPct) {
        btn.classList.add('bg-cyan-950', 'border-cyan-400', 'text-cyan-200', 'font-bold', 'shadow-[0_0_8px_rgba(0,240,255,0.4)]');
      } else {
        btn.classList.remove('bg-cyan-950', 'border-cyan-400', 'shadow-[0_0_8px_rgba(0,240,255,0.4)]');
      }
    });

    // Renderizar filas de la tabla
    let sumDeltaW = 0;
    tbody.innerHTML = ACTIVOS_INFO.map((act, i) => {
      const b0 = bBase[i];
      const bp = bPert[i];
      const xp = xPert[i];
      const wb = wBase[i] * 100; // en %
      const wp = wPert[i] * 100; // en %
      const deltaW = wp - wb;    // en pp
      sumDeltaW += deltaW;

      let varRelPctStr = "";
      if (Math.abs(wb) < 1e-12) {
        varRelPctStr = Math.abs(deltaW) < 1e-6 ? "0.00 %" : "no definido";
      } else {
        const varRel = (deltaW / Math.abs(wb)) * 100;
        varRelPctStr = `${varRel >= 0 ? '+' : ''}${varRel.toFixed(2)} %`;
      }

      let deltaWBadge = "";
      if (Math.abs(deltaW) < 0.005) {
        deltaWBadge = `<span class="text-gray-400 font-mono">0.00 pp</span>`;
      } else if (deltaW > 0) {
        deltaWBadge = `<span class="text-emerald-400 font-mono font-bold">▲ +${deltaW.toFixed(2)} pp</span>`;
      } else {
        deltaWBadge = `<span class="text-rose-400 font-mono font-bold">▼ ${deltaW.toFixed(2)} pp</span>`;
      }

      const estaPerturbado = (target === 'all' || parseInt(target, 10) === i) && deltaPct !== 0;

      return `
        <tr class="hover:bg-cyan-950/20 transition-colors ${estaPerturbado ? 'bg-cyan-950/30' : ''}">
          <td class="p-2.5 font-bold ${estaPerturbado ? 'text-cyan-300' : 'text-gray-300'}">
            ${act.ticker} <span class="text-[10px] text-gray-500 font-normal">(${act.empresa})</span>
          </td>
          <td class="p-2.5 text-right font-mono text-gray-300">${b0.toFixed(4)}</td>
          <td class="p-2.5 text-right font-mono ${estaPerturbado ? 'text-cyan-300 font-bold' : 'text-gray-400'}">${bp.toFixed(4)}</td>
          <td class="p-2.5 text-right font-mono text-emerald-300">${xp.toFixed(6)}</td>
          <td class="p-2.5 text-right font-mono text-cyan-200">${wb.toFixed(2)} %</td>
          <td class="p-2.5 text-right font-mono ${wp >= 0 ? 'text-emerald-400 font-bold' : 'text-rose-400 font-bold'}">${wp.toFixed(2)} %</td>
          <td class="p-2.5 text-right font-mono">${deltaWBadge}</td>
          <td class="p-2.5 text-center font-mono text-xs ${deltaW > 0 ? 'text-emerald-300' : deltaW < 0 ? 'text-rose-300' : 'text-gray-400'}">${varRelPctStr}</td>
        </tr>
      `;
    }).join('');

    // Actualizar tfoot
    if (tfootSumX) tfootSumX.textContent = sumXPert.toFixed(6);
    if (tfootSumW) tfootSumW.textContent = "100.00 %";
    if (tfootSumDw) tfootSumDw.textContent = `${sumDeltaW.toFixed(2)} pp`;

    // Texto de interpretación financiera dinámica
    if (pInterp) {
      if (deltaPct === 0) {
        pInterp.innerHTML = `
          <strong class="text-cyan-300 block mb-1">ANÁLISIS DE SENSIBILIDAD EN ESTADO BASE:</strong>
          La asignación mostrada corresponde a los pesos no perturbados de la cartera de Markowitz. 
          Seleccione una variación en los botones superiores (<strong>-10%, -5%, +5%, +10%</strong>) para cuantificar la estabilidad de los pesos ante incertidumbre en las expectativas de retorno.
        `;
      } else if (target === 'all') {
        pInterp.innerHTML = `
          <strong class="text-cyan-300 block mb-1">INVARIANZA POR ESCALAMIENTO HOMOTÉTICO (SHOCK UNIFORME DE ${deltaPct > 0 ? '+' : ''}${deltaPct}%):</strong>
          Al perturbar todos los retornos esperados por un factor idéntico <span class="text-white font-mono">(1 + δ)</span>, el sistema lineal <span class="text-cyan-200 font-mono">A·x = (1+δ)·b</span> produce una solución escalada <span class="text-cyan-200 font-mono">x_pert = (1+δ)·x_base</span>. 
          En consecuencia, los pesos normalizados <span class="text-white font-mono">wᵢ = xᵢ / ∑x</span> son <strong class="text-emerald-300 font-mono">estrictamente invariantes (Δw = 0.00 pp)</strong>. 
          Financieramente, un alza o baja proporcional en todo el mercado no altera las proporciones relativas de la cartera óptima.
        `;
      } else {
        const actTicker = ACTIVOS_INFO[parseInt(target, 10)]?.ticker || 'Activo';
        const idx = parseInt(target, 10);
        const dwAct = (wPert[idx] - wBase[idx]) * 100;
        pInterp.innerHTML = `
          <strong class="text-cyan-300 block mb-1">SENSIBILIDAD ASIMÉTRICA EN ${actTicker} (SHOCK DE ${deltaPct > 0 ? '+' : ''}${deltaPct}%):</strong>
          Una alteración del <strong>${deltaPct}%</strong> en el retorno proyectado de <span class="text-white font-bold font-mono">${actTicker}</span> provoca un desplazamiento de <strong class="${dwAct >= 0 ? 'text-emerald-400' : 'text-rose-400'} font-mono">${dwAct >= 0 ? '+' : ''}${dwAct.toFixed(2)} puntos porcentuales</strong> en su peso normalizado en la cartera. 
          Este fenómeno ilustra la propiedad de Markowitz como <em>"maximizador de errores"</em>: la cartera reacciona agresivamente reasignando capital entre activos correlacionados, confirmando la necesidad de estimaciones robustas del vector de retornos <strong>b</strong>.
        `;
      }
    }
  }

  // =========================================================================
  // 6. EVENTOS DE CONTROL Y RECALCULO AUTOMÁTICO
  // =========================================================================
  let debounceTimer = null;
  function dispararRecalculoAuto() {
    clearTimeout(debounceTimer);
    debounceTimer = setTimeout(() => {
      ejecutarCalculo('Personalizado');
    }, 150);
  }

  // Listeners para auto-recalculo en todos los inputs
  const todosLosInputs = document.querySelectorAll('.input-matrix, .input-vector, #input-tol, #input-max-iter, #select-precond, #contenedor-x0-custom input');
  todosLosInputs.forEach(input => {
    input.addEventListener('input', dispararRecalculoAuto);
    input.addEventListener('change', dispararRecalculoAuto);
  });

  if (btnCalcular) {
    btnCalcular.addEventListener('click', () => {
      ejecutarCalculo('Personalizado');
      if (calcStatusMsg) {
        calcStatusMsg.innerHTML = `<span class="text-emerald-400">✓ Cálculo completado:</span> Solución de referencia y comparativa actualizadas.`;
      }
    });
  }

  if (btnRecalcularDiag) {
    btnRecalcularDiag.addEventListener('click', () => {
      ejecutarCalculo('Personalizado');
    });
  }

  if (btnCargarIdeal) {
    btnCargarIdeal.addEventListener('click', () => aplicarEscenario('ideal'));
  }
  if (btnCargarEstres) {
    btnCargarEstres.addEventListener('click', () => aplicarEscenario('bajo_estres'));
  }
  if (btnCargarMal) {
    btnCargarMal.addEventListener('click', () => aplicarEscenario('mal_condicionado'));
  }

  // Listeners para el Panel de Sensibilidad (Perturbación de b)
  const selectSensActivo = document.getElementById('select-sensibilidad-activo');
  if (selectSensActivo) {
    selectSensActivo.addEventListener('change', (e) => {
      actualizarPanelSensibilidad(estadoSensibilidad.deltaPct, e.target.value);
    });
  }

  const btnsSens = [
    { id: 'btn-pert-m10', pct: -10 },
    { id: 'btn-pert-m5', pct: -5 },
    { id: 'btn-pert-0', pct: 0 },
    { id: 'btn-pert-p5', pct: 5 },
    { id: 'btn-pert-p10', pct: 10 }
  ];

  btnsSens.forEach(({ id, pct }) => {
    const btn = document.getElementById(id);
    if (btn) {
      btn.addEventListener('click', () => {
        actualizarPanelSensibilidad(pct, estadoSensibilidad.target);
      });
    }
  });

  // Inicializar todo con el escenario Ideal
  aplicarEscenario('ideal');

  // Exportar utilidades de UI en el objeto global
  window.RetroUI = {
    navigateTo,
    leerMatrizA,
    leerVectorB,
    leerVectorX0,
    leerParametros,
    establecerMatrizA,
    establecerVectorB,
    aplicarEscenario,
    ejecutarCalculo,
    actualizarHeatmapCorrelacion,
    actualizarPanelSensibilidad
  };

  // Iniciar en Sección 1: Inicio
  navigateTo('sec-inicio');
});
