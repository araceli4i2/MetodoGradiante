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

  if (btnCalcular) {
    btnCalcular.addEventListener('click', () => {
      const A = leerMatrizA();
      const b = leerVectorB();
      const x0 = leerVectorX0();
      const params = leerParametros();

      if (calcStatusMsg) {
        calcStatusMsg.innerHTML = `<span class="text-emerald-400">✓ Entradas registradas:</span> A(4×4), b(4×1), x₀=[${x0.join(', ')}], Tol=${params.tol}, Nmáx=${params.maxIter}. (Solvers pendientes de enlace).`;
      }
    });
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

  /**
   * Obtiene los escenarios desde data/escenarios.json o usa el respaldo embebido si fetch falla.
   * @returns {Promise<Object>} Datos de los escenarios
   */
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

  /**
   * Formatea una matriz para visualización en el pre retro.
   */
  function formatearMatrizPre(A, activos) {
    if (!A || !activos) return '';
    let out = '       ' + activos.map(a => a.padEnd(10)).join('') + '\n';
    out += '      ' + '-'.repeat(42) + '\n';
    for (let i = 0; i < A.length; i++) {
      out += activos[i].padEnd(6) + '| ' + A[i].map(val => val.toFixed(6).padEnd(10)).join('') + '\n';
    }
    return out;
  }

  /**
   * Formatea un vector para visualización en el pre retro.
   */
  function formatearVectorPre(b, activos) {
    if (!b || !activos) return '';
    let out = 'Activo    | Retorno Esperado (b_i)\n';
    out += '----------------------------------\n';
    for (let i = 0; i < b.length; i++) {
      out += activos[i].padEnd(10) + '| ' + b[i].toFixed(6) + '\n';
    }
    return out;
  }

  /**
   * Carga un escenario específico en la Sección 4 y actualiza el visor de la Sección 5.
   * @param {string} idEscenario - 'ideal' | 'bajo_estres' | 'mal_condicionado'
   */
  async function aplicarEscenario(idEscenario) {
    const { datos, origen } = await obtenerEscenariosData();
    const lista = Array.isArray(datos.escenarios) 
      ? datos.escenarios 
      : Object.values(datos.escenarios);

    const escenario = lista.find(e => e.id === idEscenario) || lista[0];
    if (!escenario) return;

    // 1. Cargar A y b en los inputs de la Sección 4
    establecerMatrizA(escenario.A);
    establecerVectorB(escenario.b);

    // 2. Actualizar etiquetas de estado en Sección 5
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

    // 3. Notificar en el panel de status de Sección 4
    if (calcStatusMsg) {
      calcStatusMsg.innerHTML = `<span class="text-cyan-400">✓ Escenario cargado:</span> [${escenario.nombre}] cargado en matriz A y vector b.`;
    }

    // 4. Actualizar diagnóstico numérico en Sección 3
    actualizarDiagnosticoSeccion3(escenario.A, escenario.nombre);
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

  /**
   * Actualiza en tiempo real el panel de diagnóstico de la Sección 3 para la matriz A.
   * @param {number[][]} A - Matriz 4x4
   * @param {string} nombreEscenario - Nombre del escenario a rotular
   */
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
      console.warn("Error en cálculo de menores de Sylvester:", e);
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

  if (btnRecalcularDiag) {
    btnRecalcularDiag.addEventListener('click', () => {
      actualizarDiagnosticoSeccion3(leerMatrizA(), 'Entrada actual');
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

  // Inicializar visor con el escenario Ideal
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
    aplicarEscenario
  };

  // Iniciar en Sección 1: Inicio
  navigateTo('sec-inicio');
});
