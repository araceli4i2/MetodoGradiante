/**
 * solvers.js - Métodos de resolución iterativa para sistemas lineales Ax = b
 * DAT-242 Métodos Numéricos (UMSA)
 * 
 * Implementaciones:
 * - solveGC(A, b, x0, tol, maxIter): Gradientes Conjugados clásico
 * - solveGCP(A, b, x0, tol, maxIter, M): Gradientes Conjugados Precondicionado (Suñagua 2020)
 * - condPrecond(A, M): Número de condición espectral precondicionado κ(M⁻¹A)
 * 
 * Criterio de parada: ‖r‖₂ / ‖b‖₂ < tol
 */

// Resolución de dependencias de Álgebra Lineal (Node.js y Navegador)
let _linalg = null;
if (typeof window !== 'undefined' && window.LinAlg) {
  _linalg = window.LinAlg;
} else if (typeof require !== 'undefined') {
  try {
    _linalg = require('./linalg.js');
  } catch (e) {
    // Si linalg ya está disponible globalmente
  }
}

if (!_linalg && typeof dot === 'function' && typeof norm2 === 'function' && typeof matVec === 'function') {
  _linalg = { 
    dot, 
    norm2, 
    matVec, 
    eigenSymmetric: typeof eigenSymmetric === 'function' ? eigenSymmetric : null 
  };
}

/**
 * Resuelve el sistema lineal Ax = b mediante el método de Gradientes Conjugados (GC) clásico.
 * Diseñado para matrices simétricas y definidas positivas (SPD) según Suñagua (2020).
 * 
 * Criterio de convergencia estricto:
 *   ‖rₖ‖₂ / ‖b‖₂ < tol
 * 
 * @param {number[][]} A - Matriz del sistema n x n (simétrica y definida positiva)
 * @param {number[]} b - Vector del término independiente n x 1
 * @param {number[]} [x0] - Vector de estimación inicial n x 1 (por defecto vector cero)
 * @param {number} [tol=1e-6] - Tolerancia de parada para la norma residual relativa
 * @param {number} [maxIter=100] - Número máximo de iteraciones permitidas
 * @returns {{
 *   x: number[],
 *   iteraciones: number,
 *   residuoRelativo: number,
 *   convergio: boolean,
 *   historial: number[]
 * }} Resultado detallado de la ejecución
 */
function solveGC(A, b, x0, tol = 1e-6, maxIter = 100) {
  const linalg = _linalg || (typeof window !== 'undefined' ? window.LinAlg : null);
  if (!linalg) {
    throw new ReferenceError("No se encontró el módulo 'LinAlg'. Asegúrese de cargar js/linalg.js antes de js/solvers.js.");
  }
  const { dot, norm2, matVec } = linalg;

  if (!Array.isArray(A) || !Array.isArray(b)) {
    throw new TypeError("Los parámetros A y b deben ser una matriz (arreglo 2D) y un vector respectivamente.");
  }

  const n = A.length;
  if (n === 0 || b.length !== n) {
    throw new Error(`Dimensiones incompatibles: A es de orden ${n} y b tiene longitud ${b.length}.`);
  }

  // 1. Vector inicial x (copia defensiva)
  let x = x0 && Array.isArray(x0) && x0.length === n 
    ? [...x0] 
    : new Array(n).fill(0);

  // Norma del término independiente ‖b‖₂
  const normB = norm2(b);
  const factorEscala = normB > 0 ? normB : 1.0;

  // 2. Residuo inicial r₀ = b - A·x₀
  const Ax0 = matVec(A, x);
  let r = new Array(n);
  for (let i = 0; i < n; i++) {
    r[i] = b[i] - Ax0[i];
  }

  let normR = norm2(r);
  let residuoRelativo = normR / factorEscala;
  const historial = [residuoRelativo];

  if (residuoRelativo < tol) {
    return {
      x,
      iteraciones: 0,
      residuoRelativo,
      convergio: true,
      historial
    };
  }

  // 3. Dirección inicial de búsqueda p₀ = r₀
  let p = [...r];
  let rho = dot(r, r); // ρ₀ = ⟨r₀, r₀⟩ = ‖r₀‖₂²

  let iter = 0;
  let convergio = false;

  // 4. Bucle principal de iteración de Gradientes Conjugados
  while (iter < maxIter) {
    iter++;

    // v = A · pₖ
    const v = matVec(A, p);

    // Curvatura: γₖ = ⟨pₖ, A·pₖ⟩
    const gamma = dot(p, v);
    if (gamma <= 0) {
      throw new Error(`Error en solveGC: curvatura no positiva detectada en la iteración ${iter} (⟨p, Ap⟩ = ${gamma} ≤ 0). La matriz no es SPD.`);
    }

    // Tamaño de paso óptimo: αₖ = ⟨rₖ, rₖ⟩ / ⟨pₖ, A·pₖ⟩
    const alpha = rho / gamma;

    // Actualización de la solución y residuo:
    // xₖ₊₁ = xₖ + αₖ·pₖ
    // rₖ₊₁ = rₖ - αₖ·(A·pₖ)
    for (let i = 0; i < n; i++) {
      x[i] += alpha * p[i];
      r[i] -= alpha * v[i];
    }

    // Cálculo del residuo relativo ‖rₖ₊₁‖₂ / ‖b‖₂
    normR = norm2(r);
    residuoRelativo = normR / factorEscala;
    historial.push(residuoRelativo);

    // Comprobación de parada
    if (residuoRelativo < tol) {
      convergio = true;
      break;
    }

    // Nuevo producto punto del residuo: ρₖ₊₁ = ⟨rₖ₊₁, rₖ₊₁⟩
    const rhoNext = dot(r, r);

    // Parámetro de ortogonalización (Fletcher-Reeves): βₖ = ⟨rₖ₊₁, rₖ₊₁⟩ / ⟨rₖ, rₖ⟩
    const beta = rhoNext / rho;

    // Actualización de la dirección de descenso conjugada: pₖ₊₁ = rₖ₊₁ + βₖ·pₖ
    for (let i = 0; i < n; i++) {
      p[i] = r[i] + beta * p[i];
    }

    rho = rhoNext;
  }

  return {
    x,
    iteraciones: iter,
    residuoRelativo,
    convergio,
    historial
  };
}

/**
 * Resuelve el sistema lineal Ax = b mediante el método de Gradientes Conjugados Precondicionado (GCP)
 * siguiendo rigurosamente el algoritmo de Suñagua (2020).
 * 
 * Por defecto, utiliza el precondicionador diagonal de Jacobi: M = diag(A).
 * 
 * Algoritmo (Suñagua 2020):
 * 1. r₀ = b - A·x₀
 * 2. Resolver M·z₀ = r₀ (para Jacobi: z₀,ᵢ = r₀,ᵢ / Mᵢᵢ)
 * 3. p₀ = z₀
 * 4. En cada paso k:
 *    - αₖ = (rₖᵀ·zₖ) / (pₖᵀ·A·pₖ)
 *    - xₖ₊₁ = xₖ + αₖ·pₖ
 *    - rₖ₊₁ = rₖ - αₖ·A·pₖ
 *    - Verificar parada: ‖rₖ₊₁‖₂ / ‖b‖₂ < tol
 *    - Resolver M·zₖ₊₁ = rₖ₊₁
 *    - βₖ = (rₖ₊₁ᵀ·zₖ₊₁) / (rₖᵀ·zₖ)
 *    - pₖ₊₁ = zₖ₊₁ + βₖ·pₖ
 * 
 * @param {number[][]} A - Matriz del sistema n x n (simétrica y definida positiva)
 * @param {number[]} b - Vector del término independiente n x 1
 * @param {number[]} [x0] - Estimación inicial n x 1 (por defecto vector cero)
 * @param {number} [tol=1e-6] - Tolerancia de convergencia relativa
 * @param {number} [maxIter=100] - Número máximo de iteraciones permitidas
 * @param {number[]|number[][]} [M=null] - Precondicionador M (por defecto Jacobi: diag(A))
 * @returns {{
 *   x: number[],
 *   iteraciones: number,
 *   residuoRelativo: number,
 *   convergio: boolean,
 *   historial: number[]
 * }} Resultado detallado de la ejecución
 */
function solveGCP(A, b, x0, tol = 1e-6, maxIter = 100, M = null) {
  const linalg = _linalg || (typeof window !== 'undefined' ? window.LinAlg : null);
  if (!linalg) {
    throw new ReferenceError("No se encontró el módulo 'LinAlg'. Asegúrese de cargar js/linalg.js antes de js/solvers.js.");
  }
  const { dot, norm2, matVec } = linalg;

  if (!Array.isArray(A) || !Array.isArray(b)) {
    throw new TypeError("Los parámetros A y b deben ser una matriz (arreglo 2D) y un vector respectivamente.");
  }

  const n = A.length;
  if (n === 0 || b.length !== n) {
    throw new Error(`Dimensiones incompatibles: A es de orden ${n} y b tiene longitud ${b.length}.`);
  }

  // Extraer vector diagonal del precondicionador M (Jacobi por defecto: M_ii = A_ii)
  const diagM = new Array(n);
  if (!M) {
    for (let i = 0; i < n; i++) {
      if (A[i][i] <= 0) {
        throw new Error(`Error en solveGCP: pivote diagonal A[${i+1}, ${i+1}] = ${A[i][i]} ≤ 0. El precondicionador Jacobi requiere elementos diagonales positivos.`);
      }
      diagM[i] = A[i][i];
    }
  } else if (Array.isArray(M)) {
    if (typeof M[0] === 'number') {
      for (let i = 0; i < n; i++) diagM[i] = M[i];
    } else if (Array.isArray(M[0])) {
      for (let i = 0; i < n; i++) diagM[i] = M[i][i];
    }
  }

  // Función para resolver M·z = r (con M diagonal de Jacobi: z_i = r_i / M_ii)
  function resolverM(rVec) {
    const zVec = new Array(n);
    for (let i = 0; i < n; i++) {
      zVec[i] = rVec[i] / diagM[i];
    }
    return zVec;
  }

  // 1. Vector inicial x₀
  let x = x0 && Array.isArray(x0) && x0.length === n
    ? [...x0]
    : new Array(n).fill(0);

  const normB = norm2(b);
  const factorEscala = normB > 0 ? normB : 1.0;

  // 1. r₀ = b - A·x₀
  const Ax0 = matVec(A, x);
  let r = new Array(n);
  for (let i = 0; i < n; i++) {
    r[i] = b[i] - Ax0[i];
  }

  let normR = norm2(r);
  let residuoRelativo = normR / factorEscala;
  const historial = [residuoRelativo];

  if (residuoRelativo < tol) {
    return {
      x,
      iteraciones: 0,
      residuoRelativo,
      convergio: true,
      historial
    };
  }

  // 2. Resolver M·z₀ = r₀
  let z = resolverM(r);

  // 3. Dirección inicial: p₀ = z₀
  let p = [...z];

  // gamma = r₀ᵀ · z₀
  let gamma = dot(r, z);

  let iter = 0;
  let convergio = false;

  // 4. Bucle iterativo de Suñagua (2020)
  while (iter < maxIter) {
    iter++;

    // Apk = A · pₖ
    const Apk = matVec(A, p);

    // Curvatura: pₖᵀ · A · pₖ
    const denom = dot(p, Apk);
    if (denom <= 0) {
      throw new Error(`Error en solveGCP: curvatura no positiva detectada en la iteración ${iter} (pᵀ·A·p = ${denom} ≤ 0). La matriz no es SPD.`);
    }

    // αₖ = (rₖᵀ·zₖ) / (pₖᵀ·A·pₖ)
    const alpha = gamma / denom;

    // xₖ₊₁ = xₖ + αₖ·pₖ
    // rₖ₊₁ = rₖ - αₖ·A·pₖ
    for (let i = 0; i < n; i++) {
      x[i] += alpha * p[i];
      r[i] -= alpha * Apk[i];
    }

    // Comprobación de parada: ‖rₖ₊₁‖₂ / ‖b‖₂ < tol
    normR = norm2(r);
    residuoRelativo = normR / factorEscala;
    historial.push(residuoRelativo);

    if (residuoRelativo < tol) {
      convergio = true;
      break;
    }

    // Resolver M·zₖ₊₁ = rₖ₊₁
    const zNext = resolverM(r);

    // gammaNext = rₖ₊₁ᵀ · zₖ₊₁
    const gammaNext = dot(r, zNext);

    // βₖ = (rₖ₊₁ᵀ·zₖ₊₁) / (rₖᵀ·zₖ)
    const beta = gammaNext / gamma;

    // pₖ₊₁ = zₖ₊₁ + βₖ·pₖ
    for (let i = 0; i < n; i++) {
      p[i] = zNext[i] + beta * p[i];
    }

    z = zNext;
    gamma = gammaNext;
  }

  return {
    x,
    iteraciones: iter,
    residuoRelativo,
    convergio,
    historial
  };
}

/**
 * Calcula el número de condición espectral del sistema precondicionado:
 * κ(M⁻¹·A) = λmax / λmin
 * mediante la matriz simétrica semejante:
 * Ã = M^(-1/2) · A · M^(-1/2)
 * y el cálculo de autovalores eigenSymmetric.
 * 
 * Para el precondicionador Jacobi M = diag(A):
 * Ã_ij = A_ij / √(A_ii · A_jj)
 * 
 * @param {number[][]} A - Matriz simétrica y definida positiva n x n
 * @param {number[]|number[][]} [M=null] - Precondicionador M (por defecto Jacobi: diag(A))
 * @returns {number} κ(M⁻¹·A)
 */
function condPrecond(A, M = null) {
  const linalg = _linalg || (typeof window !== 'undefined' ? window.LinAlg : null);
  if (!linalg || typeof linalg.eigenSymmetric !== 'function') {
    throw new ReferenceError("No se encontró la función 'eigenSymmetric' en LinAlg.");
  }

  const n = A.length;
  const diagM = new Array(n);

  if (!M) {
    for (let i = 0; i < n; i++) {
      if (A[i][i] <= 0) return Infinity;
      diagM[i] = A[i][i];
    }
  } else if (Array.isArray(M)) {
    if (typeof M[0] === 'number') {
      for (let i = 0; i < n; i++) diagM[i] = M[i];
    } else if (Array.isArray(M[0])) {
      for (let i = 0; i < n; i++) diagM[i] = M[i][i];
    }
  }

  // Construir matriz simétrica congruente Ã = M^(-1/2) · A · M^(-1/2)
  const Atilde = Array.from({ length: n }, () => new Array(n));
  for (let i = 0; i < n; i++) {
    const invSqrtI = 1.0 / Math.sqrt(diagM[i]);
    for (let j = 0; j < n; j++) {
      const invSqrtJ = 1.0 / Math.sqrt(diagM[j]);
      Atilde[i][j] = A[i][j] * invSqrtI * invSqrtJ;
    }
  }

  // Autovalores de Ã
  const { eigenvalues } = linalg.eigenSymmetric(Atilde);
  const lambdaMin = eigenvalues[0];
  const lambdaMax = eigenvalues[eigenvalues.length - 1];

  if (lambdaMin <= 0) {
    return Infinity;
  }
  return lambdaMax / lambdaMin;
}

// Compatibilidad dual: Node.js (CommonJS) y Navegador Web (global)
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { solveGC, solveGCP, condPrecond };
}

if (typeof window !== 'undefined') {
  window.Solvers = window.Solvers || {};
  window.Solvers.solveGC = solveGC;
  window.Solvers.solveGCP = solveGCP;
  window.Solvers.condPrecond = condPrecond;
}
