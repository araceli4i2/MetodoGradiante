"""
verify_reference.py
DAT-242 Métodos Numéricos (UMSA)
Cálculo de valores numéricos de referencia con NumPy para los 3 escenarios.
"""

import sys
import json
from pathlib import Path
import numpy as np

# Asegurar codificación UTF-8 en consola Windows
if hasattr(sys.stdout, "reconfigure"):
    sys.stdout.reconfigure(encoding="utf-8")

def main():
    root_dir = Path(__file__).resolve().parent.parent
    escenarios_path = root_dir / "data" / "escenarios.json"
    output_path = root_dir / "tests" / "referencia_numpy.json"

    print("=" * 80)
    print("DAT-242: GENERACIÓN DE VALORES DE REFERENCIA CON NUMPY")
    print(f"Leyendo escenarios desde: {escenarios_path}")
    print("=" * 80)

    with open(escenarios_path, "r", encoding="utf-8") as f:
        data = json.load(f)

    escenarios = data.get("escenarios", [])
    resultados = {
        "fecha_extraccion": data.get("fecha_extraccion"),
        "activos": data.get("activos"),
        "escenarios": {}
    }

    for esc in escenarios:
        esc_id = esc["id"]
        nombre = esc["nombre"]
        A = np.array(esc["A"], dtype=np.float64)
        b = np.array(esc["b"], dtype=np.float64)

        # 1. Simetría: ||A - Aᵀ|| (norma Frobenius)
        diff_sym = A - A.T
        norm_sym = float(np.linalg.norm(diff_sym))

        # 2. Autovalores (eigvalsh para matrices hermíticas/simétricas)
        eigvals = np.linalg.eigvalsh(A)
        eigvals_list = [float(x) for x in eigvals]

        # 3. Número de condición espectral κ(A)
        cond_A = float(np.linalg.cond(A))

        # 4. Solución de referencia exacta x_ref mediante solve
        x_ref = np.linalg.solve(A, b)
        x_ref_list = [float(x) for x in x_ref]

        # 5. Precondicionador Jacobi M = diag(A) y κ(M⁻¹A)
        diag_A = np.diag(A)
        if np.any(diag_A <= 0):
            raise ValueError(f"Escenario {esc_id} contiene elementos diagonales <= 0")
        
        inv_sqrt_diag = 1.0 / np.sqrt(diag_A)
        D_inv_sqrt = np.diag(inv_sqrt_diag)
        A_tilde = D_inv_sqrt @ A @ D_inv_sqrt
        eigvals_tilde = np.linalg.eigvalsh(A_tilde)
        cond_M_inv_A = float(eigvals_tilde[-1] / eigvals_tilde[0])

        resultados["escenarios"][esc_id] = {
            "id": esc_id,
            "nombre": nombre,
            "simetria_norma": norm_sym,
            "es_simetrica": bool(norm_sym < 1e-12),
            "autovalores": eigvals_list,
            "lambda_min": float(eigvals[0]),
            "lambda_max": float(eigvals[-1]),
            "cond_A": cond_A,
            "x_ref": x_ref_list,
            "cond_M_inv_A": cond_M_inv_A,
            "autovalores_tilde": [float(x) for x in eigvals_tilde]
        }

        print(f"\n--- Escenario: {nombre} ({esc_id}) ---")
        print(f"* Simetria ||A - A^T||: {norm_sym:.2e} (Simetrica: {norm_sym < 1e-12})")
        print(f"* Autovalores lambda_i: [{', '.join(f'{v:.6f}' for v in eigvals_list)}]")
        print(f"* kappa(A): {cond_A:.6f}")
        print(f"* Solucion x_ref: [{', '.join(f'{v:.6f}' for v in x_ref_list)}]")
        print(f"* kappa(M^-1 A) con M=diag(A): {cond_M_inv_A:.6f}")
        print(f"  (Reduccion de condicion: {cond_A / cond_M_inv_A:.2f}x)")

    # Guardar archivo JSON
    output_path.parent.mkdir(parents=True, exist_ok=True)
    with open(output_path, "w", encoding="utf-8") as f:
        json.dump(resultados, f, indent=2, ensure_ascii=False)

    print("\n" + "=" * 80)
    print(f"Resultados guardados exitosamente en: {output_path}")
    print("=" * 80)

if __name__ == "__main__":
    main()
