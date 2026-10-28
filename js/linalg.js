/**
 * linalg.js - Biblioteca de Álgebra Lineal pura (sin dependencias)
 * DAT-242 Métodos Numéricos (UMSA)
 * 
 * Funciones numéricas para vectores y matrices:
 * - dot(u, v): Producto punto
 * - norm2(v): Norma euclídea (L2)
 * - matVec(A, x): Multiplicación matriz-vector
 * - matMul(A, B): Multiplicación matriz-matriz
 * - transpose(A): Transpuesta de una matriz
 * - isSymmetric(A, tol): Comprobación de simetría
 * - cholesky(A): Factorización de Cholesky A = L·Lᵀ
 * - solveCholesky(A, b): Solución directa de Ax = b mediante Cholesky
 * - determinant(M): Determinante de una matriz cuadrada
 * - principalMinors(A): Menores principales de Sylvester (Δ₁ ... Δₙ)
 * - eigenSymmetric(A): Autovalores mediante el método de Jacobi cíclico
 * - condNumber(A): Número de condición espectral κ(A) = λmax / λmin
 */

/**
 * Calcula el producto punto (escalar) entre dos vectores u y v.
 * @param {number[]} u - Vector u
 * @param {number[]} v - Vector v
 * @returns {number} ⟨u, v⟩
 */
function dot(u, v) {
  if (!Array.isArray(u) || !Array.isArray(v)) {
    throw new TypeError("Los argumentos de dot deben ser arreglos numéricos.");
  }
  if (u.length !== v.length) {
    throw new Error(`Dimensiones incompatibles en dot: longitud ${u.length} vs ${v.length}.`);
  }
  let sum = 0;
  for (let i = 0; i < u.length; i++) {
    sum += u[i] * v[i];
  }
  return sum;
}

/**
 * Calcula la norma euclídea (L2) de un vector v.
 * @param {number[]} v - Vector numérico
 * @returns {number} ‖v‖₂ = √(∑ vᵢ²)
 */
function norm2(v) {
  if (!Array.isArray(v)) {
    throw new TypeError("El argumento de norm2 debe ser un arreglo numérico.");
  }
  return Math.sqrt(dot(v, v));
}

/**
 * Multiplica una matriz A (m x n) por un vector x (n x 1).
 * @param {number[][]} A - Matriz m x n
 * @param {number[]} x - Vector n x 1
 * @returns {number[]} Vector resultante y = A·x
 */
function matVec(A, x) {
  if (!Array.isArray(A) || !Array.isArray(x)) {
    throw new TypeError("Los argumentos de matVec deben ser una matriz (arreglo 2D) y un vector.");
  }
  const m = A.length;
  if (m === 0) return [];
  const n = A[0].length;
  if (x.length !== n) {
    throw new Error(`Dimensiones incompatibles en matVec: matriz con ${n} columnas y vector con longitud ${x.length}.`);
  }
  const y = new Array(m);
  for (let i = 0; i < m; i++) {
    let sum = 0;
    const row = A[i];
    for (let j = 0; j < n; j++) {
      sum += row[j] * x[j];
    }
    y[i] = sum;
  }
  return y;
}

/**
 * Multiplica dos matrices A (m x p) y B (p x n).
 * @param {number[][]} A - Matriz m x p
 * @param {number[][]} B - Matriz p x n
 * @returns {number[][]} Matriz resultante C = A·B
 */
function matMul(A, B) {
  if (!Array.isArray(A) || !Array.isArray(B) || A.length === 0 || B.length === 0) {
    throw new TypeError("Los argumentos de matMul deben ser matrices bidimensionales no vacías.");
  }
  const m = A.length;
  const p = A[0].length;
  const p2 = B.length;
  const n = B[0].length;

  if (p !== p2) {
    throw new Error(`Dimensiones incompatibles en matMul: A tiene ${p} columnas y B tiene ${p2} filas.`);
  }

  const C = Array.from({ length: m }, () => new Array(n).fill(0));
  for (let i = 0; i < m; i++) {
    for (let k = 0; k < p; k++) {
      const aik = A[i][k];
      for (let j = 0; j < n; j++) {
        C[i][j] += aik * B[k][j];
      }
    }
  }
  return C;
}

/**
 * Calcula la transpuesta de una matriz A.
 * @param {number[][]} A - Matriz m x n
 * @returns {number[][]} Matriz transpuesta Aᵀ
 */
function transpose(A) {
  if (!Array.isArray(A) || A.length === 0) {
    throw new TypeError("El argumento de transpose debe ser una matriz bidimensional.");
  }
  const m = A.length;
  const n = A[0].length;
  const AT = Array.from({ length: n }, () => new Array(m));
  for (let i = 0; i < m; i++) {
    for (let j = 0; j < n; j++) {
      AT[j][i] = A[i][j];
    }
  }
  return AT;
}

/**
 * Comprueba si una matriz A es cuadrada y simétrica (A = Aᵀ) dentro de una tolerancia.
 * @param {number[][]} A - Matriz cuadrada
 * @param {number} [tol=1e-8] - Tolerancia de error absoluto
 * @returns {boolean} true si es simétrica, false en caso contrario
 */
function isSymmetric(A, tol = 1e-8) {
  if (!Array.isArray(A) || A.length === 0) return false;
  const n = A.length;
  for (let i = 0; i < n; i++) {
    if (!Array.isArray(A[i]) || A[i].length !== n) {
      return false;
    }
  }
  for (let i = 0; i < n; i++) {
    for (let j = i + 1; j < n; j++) {
      if (Math.abs(A[i][j] - A[j][i]) > tol) {
        return false;
      }
    }
  }
  return true;
}

/**
 * Factorización de Cholesky de una matriz simétrica y definida positiva (SPD).
 * A = L·Lᵀ, con L triangular inferior con diagonal positiva.
 * @param {number[][]} A - Matriz SPD n x n
 * @param {number} [tol=1e-8] - Tolerancia para comprobación de simetría
 * @returns {number[][]} Matriz triangular inferior L
 */
function cholesky(A, tol = 1e-8) {
  if (!isSymmetric(A, tol)) {
    throw new Error("Error en Cholesky: La matriz A no es simétrica (A ≠ Aᵀ).");
  }

  const n = A.length;
  const L = Array.from({ length: n }, () => new Array(n).fill(0));

  for (let j = 0; j < n; j++) {
    let sumDiag = 0;
    for (let k = 0; k < j; k++) {
      sumDiag += L[j][k] * L[j][k];
    }
    const valDiag = A[j][j] - sumDiag;

    if (valDiag <= 0) {
      throw new Error(
        `Error en Cholesky: La matriz no es definida positiva (SPD). ` +
        `El pivote diagonal en la posición [${j + 1}, ${j + 1}] es menor o igual a cero (${valDiag.toFixed(8)} ≤ 0).`
      );
    }

    L[j][j] = Math.sqrt(valDiag);
    const invLjj = 1.0 / L[j][j];

    for (let i = j + 1; i < n; i++) {
      let sumElem = 0;
      for (let k = 0; k < j; k++) {
        sumElem += L[i][k] * L[j][k];
      }
      L[i][j] = (A[i][j] - sumElem) * invLjj;
    }
  }

  return L;
}

/**
 * Resuelve el sistema lineal Ax = b utilizando la factorización de Cholesky (A = L·Lᵀ).
 * @param {number[][]} A - Matriz SPD n x n
 * @param {number[]} b - Vector n x 1
 * @param {number} [tol=1e-8] - Tolerancia de simetría
 * @returns {number[]} Vector solución x
 */
function solveCholesky(A, b, tol = 1e-8) {
  if (!Array.isArray(A) || !Array.isArray(b)) {
    throw new TypeError("Los argumentos de solveCholesky deben ser una matriz A y un vector b.");
  }
  const n = A.length;
  if (n === 0 || b.length !== n) {
    throw new Error(`Dimensiones incompatibles en solveCholesky: matriz de orden ${n} y vector de longitud ${b.length}.`);
  }

  const L = cholesky(A, tol);

  // Sustitución hacia adelante: L·y = b
  const y = new Array(n);
  for (let i = 0; i < n; i++) {
    let sum = 0;
    for (let j = 0; j < i; j++) {
      sum += L[i][j] * y[j];
    }
    y[i] = (b[i] - sum) / L[i][i];
  }

  // Sustitución hacia atrás: Lᵀ·x = y
  const x = new Array(n);
  for (let i = n - 1; i >= 0; i--) {
    let sum = 0;
    for (let j = i + 1; j < n; j++) {
      sum += L[j][i] * x[j];
    }
    x[i] = (y[i] - sum) / L[i][i];
  }

  return x;
}

/**
 * Calcula el determinante de una matriz cuadrada mediante eliminación Gaussiana con pivoteo parcial.
 * @param {number[][]} M - Matriz cuadrada
 * @returns {number} det(M)
 */
function determinant(M) {
  const n = M.length;
  if (n === 1) return M[0][0];
  if (n === 2) return M[0][0] * M[1][1] - M[0][1] * M[1][0];

  const A = M.map(row => [...row]);
  let det = 1;

  for (let i = 0; i < n; i++) {
    let pivot = i;
    for (let j = i + 1; j < n; j++) {
      if (Math.abs(A[j][i]) > Math.abs(A[pivot][i])) {
        pivot = j;
      }
    }

    if (Math.abs(A[pivot][i]) < 1e-15) {
      return 0;
    }

    if (pivot !== i) {
      const temp = A[i];
      A[i] = A[pivot];
      A[pivot] = temp;
      det = -det;
    }

    det *= A[i][i];
    const pivotVal = A[i][i];

    for (let j = i + 1; j < n; j++) {
      const factor = A[j][i] / pivotVal;
      for (let k = i + 1; k < n; k++) {
        A[j][k] -= factor * A[i][k];
      }
    }
  }

  return det;
}

/**
 * Calcula los menores principales de una matriz cuadrada A (Criterio de Sylvester).
 * Δₖ = det(A[1:k, 1:k]) para k = 1, ..., n.
 * Una matriz simétrica es SPD si y solo si todos sus menores principales son estrictamente positivos (Δₖ > 0).
 * 
 * @param {number[][]} A - Matriz cuadrada n x n
 * @returns {number[]} Arreglo de los n menores principales [Δ₁, Δ₂, ..., Δₙ]
 */
function principalMinors(A) {
  if (!Array.isArray(A) || A.length === 0) {
    throw new TypeError("El argumento de principalMinors debe ser una matriz cuadrada.");
  }
  const n = A.length;
  const minors = [];

  for (let k = 1; k <= n; k++) {
    const submatrix = [];
    for (let i = 0; i < k; i++) {
      submatrix.push(A[i].slice(0, k));
    }
    minors.push(determinant(submatrix));
  }

  return minors;
}

/**
 * Calcula los autovalores y autovectores de una matriz simétrica real mediante el método de Jacobi cíclico.
 * Realiza rotaciones de Givens en el plano (p, q) para anular los elementos fuera de la diagonal.
 * 
 * @param {number[][]} A - Matriz cuadrada simétrica n x n
 * @param {number} [maxSweeps=50] - Número máximo de barridos cíclicos
 * @param {number} [tol=1e-12] - Tolerancia para los elementos fuera de la diagonal
 * @returns {{ eigenvalues: number[], eigenvectors: number[][] }} Autovalores ordenados ascendente y matriz de autovectores
 */
function eigenSymmetric(A, maxSweeps = 50, tol = 1e-12) {
  if (!Array.isArray(A) || A.length === 0) {
    throw new TypeError("El argumento de eigenSymmetric debe ser una matriz cuadrada simétrica.");
  }
  const n = A.length;
  // Copia de trabajo para la matriz diagonalizada
  const D = A.map(row => [...row]);
  // Matriz acumuladora de autovectores V (inicia como la matriz identidad)
  const V = Array.from({ length: n }, (_, i) => 
    Array.from({ length: n }, (_, j) => (i === j ? 1 : 0))
  );

  for (let sweep = 0; sweep < maxSweeps; sweep++) {
    let offDiagMax = 0;

    // Barrido cíclico sobre todos los pares (p, q) con p < q
    for (let p = 0; p < n - 1; p++) {
      for (let q = p + 1; q < n; q++) {
        const apq = D[p][q];
        offDiagMax = Math.max(offDiagMax, Math.abs(apq));

        if (Math.abs(apq) > tol) {
          const app = D[p][p];
          const aqq = D[q][q];
          const theta = (aqq - app) / (2.0 * apq);
          
          // t = sgn(theta) / (|theta| + sqrt(1 + theta^2))
          let t;
          if (Math.abs(theta) < 1e-15) {
            t = 1.0;
          } else {
            t = 1.0 / (Math.abs(theta) + Math.sqrt(1.0 + theta * theta));
            if (theta < 0) t = -t;
          }

          const c = 1.0 / Math.sqrt(1.0 + t * t);
          const s = t * c;
          const tau = s / (1.0 + c);

          // Actualizar elementos diagonales y anular D[p][q]
          D[p][p] = app - t * apq;
          D[q][q] = aqq + t * apq;
          D[p][q] = 0;
          D[q][p] = 0;

          // Actualizar el resto de filas y columnas
          for (let j = 0; j < p; j++) {
            const djp = D[j][p];
            const djq = D[j][q];
            D[j][p] = djp - s * (djq + tau * djp);
            D[j][q] = djq + s * (djp - tau * djq);
            D[p][j] = D[j][p];
            D[q][j] = D[j][q];
          }

          for (let j = p + 1; j < q; j++) {
            const dpj = D[p][j];
            const djq = D[j][q];
            D[p][j] = dpj - s * (djq + tau * dpj);
            D[j][q] = djq + s * (dpj - tau * djq);
            D[j][p] = D[p][j];
            D[q][j] = D[j][q];
          }

          for (let j = q + 1; j < n; j++) {
            const dpj = D[p][j];
            const dqj = D[q][j];
            D[p][j] = dpj - s * (dqj + tau * dpj);
            D[q][j] = dqj + s * (dpj - tau * dqj);
            D[j][p] = D[p][j];
            D[j][q] = D[q][j];
          }

          // Actualizar matriz de autovectores V
          for (let i = 0; i < n; i++) {
            const vip = V[i][p];
            const viq = V[i][q];
            V[i][p] = vip - s * (viq + tau * vip);
            V[i][q] = viq + s * (vip - tau * viq);
          }
        }
      }
    }

    if (offDiagMax < tol) {
      break;
    }
  }

  // Extraer y ordenar autovalores ascendentemente junto con sus vectores
  const pairs = [];
  for (let i = 0; i < n; i++) {
    pairs.push({
      val: D[i][i],
      vec: V.map(row => row[i])
    });
  }
  pairs.sort((a, b) => a.val - b.val);

  return {
    eigenvalues: pairs.map(p => p.val),
    eigenvectors: transpose(pairs.map(p => p.vec))
  };
}

/**
 * Calcula el número de condición espectral de una matriz simétrica:
 * κ(A) = λmax / λmin
 * Para matrices definidas positivas, mide la sensibilidad numérica del sistema lineal.
 * 
 * @param {number[][]} A - Matriz simétrica n x n
 * @returns {number} κ(A) = λmax / λmin (o Infinity si λmin <= 0)
 */
function condNumber(A) {
  const { eigenvalues } = eigenSymmetric(A);
  const lambdaMin = eigenvalues[0];
  const lambdaMax = eigenvalues[eigenvalues.length - 1];

  if (lambdaMin <= 0) {
    return Infinity;
  }
  return lambdaMax / lambdaMin;
}

// Compatibilidad dual para entornos Node.js y navegadores
if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    dot,
    norm2,
    matVec,
    matMul,
    transpose,
    isSymmetric,
    cholesky,
    solveCholesky,
    determinant,
    principalMinors,
    eigenSymmetric,
    condNumber
  };
}

if (typeof window !== 'undefined') {
  window.LinAlg = {
    dot,
    norm2,
    matVec,
    matMul,
    transpose,
    isSymmetric,
    cholesky,
    solveCholesky,
    determinant,
    principalMinors,
    eigenSymmetric,
    condNumber
  };
}
