/**
 * verify_js.js
 * DAT-242 Métodos Numéricos (UMSA)
 * Verificación cruzada: Módulos JavaScript (linalg.js y solvers.js) vs NumPy
 */

const fs = require('fs');
const path = require('path');

// 1. Cargar módulos de Álgebra Lineal y Solvers
const rootDir = path.resolve(__dirname, '..');
const linalgPath = path.join(rootDir, 'js', 'linalg.js');
const solversPath = path.join(rootDir, 'js', 'solvers.js');

const linalg = require(linalgPath);
// Inyectar en ámbito global para que solvers.js acceda si es requerido
global.LinAlg = linalg;
global.dot = linalg.dot;
global.norm2 = linalg.norm2;
global.matVec = linalg.matVec;
global.eigenSymmetric = linalg.eigenSymmetric;

const solvers = require(solversPath);

// 2. Leer datos de escenarios y referencia NumPy
const escenariosPath = path.join(rootDir, 'data', 'escenarios.json');
const referenciaPath = path.join(rootDir, 'tests', 'referencia_numpy.json');

if (!fs.existsSync(referenciaPath)) {
  console.error("ERROR: No se encontró tests/referencia_numpy.json. Ejecute primero python tests/verify_reference.py");
  process.exit(1);
}

const datosEscenarios = JSON.parse(fs.readFileSync(escenariosPath, 'utf8'));
const datosReferencia = JSON.parse(fs.readFileSync(referenciaPath, 'utf8'));

// Lista de comprobaciones para la tabla resumen
const comprobaciones = [];

function registrarResultado(categoria, descripcion, esperado, obtenido, paso, detalle = "") {
  comprobaciones.push({
    categoria,
    descripcion,
    esperado,
    obtenido,
    estado: paso ? "PASS" : "FAIL",
    detalle
  });
}

function maxDiff(vecA, vecB) {
  let max = 0;
  for (let i = 0; i < vecA.length; i++) {
    const diff = Math.abs(vecA[i] - vecB[i]);
    if (diff > max) max = diff;
  }
  return max;
}

function relErrorVec(vecA, vecRef) {
  const diff = vecA.map((v, i) => v - vecRef[i]);
  const normDiff = linalg.norm2(diff);
  const normRef = linalg.norm2(vecRef);
  return normRef > 0 ? normDiff / normRef : normDiff;
}

console.log("=".repeat(128));
console.log("DAT-242: VERIFICACIÓN CRUZADA DE SOLVERS JS vs NUMPY (tests/verify_js.js)");
console.log("=".repeat(128));

// 3. Evaluar cada uno de los 3 escenarios
const escenariosLista = datosEscenarios.escenarios;

for (const esc of escenariosLista) {
  const id = esc.id;
  const nombre = esc.nombre;
  const A = esc.A;
  const b = esc.b;
  const ref = datosReferencia.escenarios[id];

  if (!ref) {
    console.error(`No hay datos de referencia para el escenario ${id}`);
    continue;
  }

  // a) Solución Cholesky JS vs NumPy (diferencia máxima < 1e-9)
  let xChol = null;
  try {
    xChol = linalg.solveCholesky(A, b);
    const diffMaxChol = maxDiff(xChol, ref.x_ref);
    const passChol = diffMaxChol < 1e-9;
    registrarResultado(
      nombre,
      "Solución Cholesky vs NumPy (max diff)",
      "< 1.00e-09",
      diffMaxChol.toExponential(4),
      passChol,
      `x_chol=[${xChol.map(v => v.toFixed(5)).join(', ')}]`
    );
  } catch (err) {
    registrarResultado(
      nombre,
      "Solución Cholesky vs NumPy (max diff)",
      "Ejecución exitosa",
      `Error: ${err.message}`,
      false
    );
  }

  // Ejecutar Solvers GC y GCP
  const x0 = [0, 0, 0, 0];
  const tol = 1e-6;
  const maxIter = 100;

  const resGC = solvers.solveGC(A, b, x0, tol, maxIter);
  const resGCP = solvers.solveGCP(A, b, x0, tol, maxIter);

  // b) Solución GCP JS vs NumPy (error relativo < 1e-5)
  const errRelGCP = relErrorVec(resGCP.x, ref.x_ref);
  const passGCP = errRelGCP < 1e-5;
  registrarResultado(
    nombre,
    "Solución GCP vs NumPy (error rel)",
    "< 1.00e-05",
    errRelGCP.toExponential(4),
    passGCP,
    `x_GCP=[${resGCP.x.map(v => v.toFixed(5)).join(', ')}]`
  );

  // c) κ(A) JS vs NumPy (diferencia relativa < 1e-6)
  const kappaA_JS = linalg.condNumber(A);
  const diffRelKappaA = Math.abs(kappaA_JS - ref.cond_A) / ref.cond_A;
  const passKappaA = diffRelKappaA < 1e-6;
  registrarResultado(
    nombre,
    "κ(A) JS vs NumPy (diff rel)",
    "< 1.00e-06",
    diffRelKappaA.toExponential(4),
    passKappaA,
    `JS: ${kappaA_JS.toFixed(6)} | NumPy: ${ref.cond_A.toFixed(6)}`
  );

  // κ(M⁻¹A) JS vs NumPy (diferencia relativa < 1e-6)
  const kappaM_JS = solvers.condPrecond(A);
  const diffRelKappaM = Math.abs(kappaM_JS - ref.cond_M_inv_A) / ref.cond_M_inv_A;
  const passKappaM = diffRelKappaM < 1e-6;
  registrarResultado(
    nombre,
    "κ(M⁻¹A) JS vs NumPy (diff rel)",
    "< 1.00e-06",
    diffRelKappaM.toExponential(4),
    passKappaM,
    `JS: ${kappaM_JS.toFixed(6)} | NumPy: ${ref.cond_M_inv_A.toFixed(6)}`
  );

  // d) Iteraciones de GC y GCP, residuo final y convergencia
  const passConvGC = resGC.convergio && resGC.residuoRelativo < tol;
  registrarResultado(
    nombre,
    "Convergencia GC (iter, res < 1e-6)",
    "convergio = true",
    `iter: ${resGC.iteraciones}, res: ${resGC.residuoRelativo.toExponential(2)}`,
    passConvGC
  );

  const passConvGCP = resGCP.convergio && resGCP.residuoRelativo < tol;
  registrarResultado(
    nombre,
    "Convergencia GCP (iter, res < 1e-6)",
    "convergio = true",
    `iter: ${resGCP.iteraciones}, res: ${resGCP.residuoRelativo.toExponential(2)}`,
    passConvGCP
  );

  // e) Residuo relativo reportado coincide con ‖b - Ax‖/‖b‖ recalculado
  const normB = linalg.norm2(b);

  // Para GC:
  const Ax_GC = linalg.matVec(A, resGC.x);
  const r_GC_recalc = b.map((bi, i) => bi - Ax_GC[i]);
  const resRelGC_recalc = linalg.norm2(r_GC_recalc) / normB;
  const diffResGC = Math.abs(resGC.residuoRelativo - resRelGC_recalc);
  const passResGC = diffResGC < 1e-12;
  registrarResultado(
    nombre,
    "Coherencia residuo GC (rep vs recalc)",
    "< 1.00e-12",
    diffResGC.toExponential(4),
    passResGC,
    `Rep: ${resGC.residuoRelativo.toExponential(4)} | Rec: ${resRelGC_recalc.toExponential(4)}`
  );

  // Para GCP:
  const Ax_GCP = linalg.matVec(A, resGCP.x);
  const r_GCP_recalc = b.map((bi, i) => bi - Ax_GCP[i]);
  const resRelGCP_recalc = linalg.norm2(r_GCP_recalc) / normB;
  const diffResGCP = Math.abs(resGCP.residuoRelativo - resRelGCP_recalc);
  const passResGCP = diffResGCP < 1e-12;
  registrarResultado(
    nombre,
    "Coherencia residuo GCP (rep vs recalc)",
    "< 1.00e-12",
    diffResGCP.toExponential(4),
    passResGCP,
    `Rep: ${resGCP.residuoRelativo.toExponential(4)} | Rec: ${resRelGCP_recalc.toExponential(4)}`
  );

  // f) Para escenario mal condicionado: residuo GCP en k = n (n = 4) es menor que en GC
  if (id === 'mal_condicionado') {
    const n = A.length;
    const resGC_n = resGC.historial[n] !== undefined ? resGC.historial[n] : resGC.residuoRelativo;
    const resGCP_n = resGCP.historial[n] !== undefined ? resGCP.historial[n] : resGCP.residuoRelativo;
    const passPrec = resGCP_n < resGC_n;
    registrarResultado(
      nombre,
      `Residuo GCP < GC en k = n (${n} it)`,
      `resGCP < resGC`,
      `GCP: ${resGCP_n.toExponential(2)} < GC: ${resGC_n.toExponential(2)}`,
      passPrec,
      `Factor mejora: ${(resGC_n / resGCP_n).toExponential(1)}x`
    );
  }
}

// 4. Pruebas de robustez: Matriz asimétrica y no definida positiva en solveCholesky
// 4.1 Matriz Asimétrica
let errorAsimCapturado = false;
let mensajeErrorAsim = "";
try {
  const A_asim = [
    [1.0, 2.0],
    [0.0, 1.0]
  ];
  const b_test = [1.0, 1.0];
  linalg.solveCholesky(A_asim, b_test);
} catch (err) {
  errorAsimCapturado = true;
  mensajeErrorAsim = err.message;
}

registrarResultado(
  "Robustez",
  "solveCholesky matriz asimétrica",
  "Lanza Error",
  errorAsimCapturado ? "Error capturado OK" : "NO lanzó error",
  errorAsimCapturado,
  mensajeErrorAsim
);

// 4.2 Matriz no definida positiva
let errorNoSPDCapturado = false;
let mensajeErrorNoSPD = "";
try {
  const A_no_spd = [
    [1.0, 3.0],
    [3.0, 1.0]
  ];
  const b_test = [1.0, 1.0];
  linalg.solveCholesky(A_no_spd, b_test);
} catch (err) {
  errorNoSPDCapturado = true;
  mensajeErrorNoSPD = err.message;
}

registrarResultado(
  "Robustez",
  "solveCholesky matriz no SPD",
  "Lanza Error",
  errorNoSPDCapturado ? "Error capturado OK" : "NO lanzó error",
  errorNoSPDCapturado,
  mensajeErrorNoSPD
);

// 5. Imprimir tabla de resultados PASS / FAIL
console.log("\n" + "=".repeat(128));
console.log("TABLA DE COMPROBACIONES: JS vs NUMPY & CASOS BORDE");
console.log("=".repeat(128));

const formatearCol = (txt, ancho) => {
  const str = String(txt);
  return str.length > ancho ? str.substring(0, ancho - 3) + "..." : str.padEnd(ancho);
};

console.log(
  formatearCol("CATEGORÍA", 18) + " | " +
  formatearCol("COMPROBACIÓN", 40) + " | " +
  formatearCol("ESPERADO", 20) + " | " +
  formatearCol("OBTENIDO", 32) + " | " +
  "ESTADO"
);
console.log("-".repeat(128));

let totalPass = 0;
let totalFail = 0;
const fallos = [];

for (const c of comprobaciones) {
  const estadoPadded = c.estado === "PASS" ? "\x1b[32mPASS\x1b[0m" : "\x1b[31mFAIL\x1b[0m";
  console.log(
    formatearCol(c.categoria, 18) + " | " +
    formatearCol(c.descripcion, 40) + " | " +
    formatearCol(c.esperado, 20) + " | " +
    formatearCol(c.obtenido, 32) + " | " +
    estadoPadded
  );

  if (c.estado === "PASS") {
    totalPass++;
  } else {
    totalFail++;
    fallos.push(c);
  }
}

console.log("=".repeat(128));
console.log(`RESUMEN FINAL: Total pruebas: ${comprobaciones.length} | PASS: ${totalPass} | FAIL: ${totalFail}`);
console.log("=".repeat(128));

if (totalFail > 0) {
  console.log("\nDETALLE DE FALLOS:");
  for (const f of fallos) {
    console.log(`- [${f.categoria}] ${f.descripcion}`);
    console.log(`  Esperado: ${f.esperado}`);
    console.log(`  Obtenido: ${f.obtenido}`);
    console.log(`  Detalle:  ${f.detalle}`);
  }
}
