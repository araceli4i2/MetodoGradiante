# Optimización de Cartera Markowitz: Gradientes Conjugados y GCP (Jacobi)

> **DAT-242 Métodos Numéricos**  
> **Carrera de Informática · Universidad Mayor de San Andrés (UMSA)**  
> **Estudiante:** Serrano Mamani Raquel Araceli  
> **Mención:** Inteligencia Artificial y Ciencia de Datos  
> **Demo en Vivo / Web Pública:** [https://araceli4i2.github.io/MetodoGradiante/](https://araceli4i2.github.io/MetodoGradiante/)  
> **Repositorio:** [https://github.com/araceli4i2/MetodoGradiante](https://github.com/araceli4i2/MetodoGradiante)

---

## 1. Descripción General del Proyecto

Este proyecto implementa una plataforma web interactiva y científica con estética **retro/arcade cian** para resolver el clásico problema de selección óptima de cartera de media-varianza de **Harry Markowitz (1952)** mediante la formulación matricial:

$$\Sigma x = \mu \quad \Longleftrightarrow \quad A x = b$$

donde:
- **$A = \Sigma \in \mathbb{R}^{4 \times 4}$:** Matriz de covarianzas anualizadas entre 4 activos tecnológicos líderes del S&P 500 (**AAPL, MSFT, GOOGL, AMZN**), estrictamente simétrica y definida positiva (SPD).
- **$b = \mu \in \mathbb{R}^{4}$:** Vector de retornos esperados anualizados proyectados para cada activo.
- **$x \in \mathbb{R}^{4}$:** Vector de asignación de capital no normalizado. Los pesos porcentuales de la cartera se normalizan como:
  $$w_i = \frac{x_i}{\sum_{j=1}^{4} x_j}, \quad \text{con } \sum_{i=1}^4 w_i = 100\%$$

### Algoritmos Numéricos Implementados
1. **Método Directo de Cholesky ($A = L L^T$):**  
   Factorización triangular inferior exacta seguida de sustitución hacia adelante ($L y = b$) y hacia atrás ($L^T x = y$). Provee la solución exacta de referencia (*ground truth*) sin errores de truncamiento iterativo.
2. **Gradientes Conjugados Clásico (GC):**  
   Método iterativo en subespacios de Krylov para matrices SPD sin matriz de precondicionamiento ($M = I$). Criterio de parada estricto:
   $$\frac{\|r_k\|_2}{\|b\|_2} < 10^{-6}$$
3. **Gradientes Conjugados Precondicionado (GCP):**  
   Implementación rigurosa del algoritmo publicado por **Suñagua S. (2020)** utilizando el **precondicionador diagonal de Jacobi** $M = \text{diag}(A)$. Resuelve trivialmente $M z_k = r_k$ con costo $\mathcal{O}(n)$, amortiguando el espectro de la matriz mediante el escalamiento implícito $\tilde{A} = M^{-1/2} A M^{-1/2}$.

---

## 2. Árbol de Carpetas del Repositorio

```text
MetGradiante/
├── index.html                   # Interfaz web interactiva (10 secciones retro arcade)
├── requirements.txt             # Dependencias de Python (yfinance, pandas, numpy)
├── CONTEXTO.md                  # Especificaciones académicas y reglas del proyecto
├── README.md                    # Documentación técnica, guía de instalación y despliegue
├── css/
│   └── retro.css                # Estilos visuales: tema arcade cian, glow, scanlines y animaciones
├── data/
│   └── escenarios.json          # Datos cuantitativos de los 3 escenarios (Ideal, Estrés, Mal cond.)
├── js/
│   ├── linalg.js                # Álgebra lineal pura en Vanilla JS (Cholesky, Sylvester, Jacobi)
│   ├── solvers.js               # Solvers iterativos GC y GCP (Suñagua 2020) y κ(M⁻¹A)
│   ├── ui.js                    # Lógica de interfaz, toasts en el DOM, sensibilidad y validaciones
│   └── qa.js                    # Módulo QA: suite de pruebas unitarias automatizadas en vivo
└── python/
    └── data_preparation.py      # Script extractor de cotizaciones reales y generador de escenarios
```

---

## 3. Instalación de Dependencias y Ejecución de `data_preparation.py`

El script `python/data_preparation.py` se encarga de descargar cotizaciones históricas de dos años bursátiles (252 ruedas/año) directamente de **Yahoo Finance** para Apple (`AAPL`), Microsoft (`MSFT`), Alphabet (`GOOGL`) y Amazon (`AMZN`), calculando los rendimientos diarios simples y anualizados para generar los tres escenarios de prueba validados mediante autovalores SPD.

### Paso 1: Clonar el repositorio y acceder a la carpeta
```bash
git clone https://github.com/araceli4i2/MetodoGradiante.git
cd MetodoGradiante
```

### Paso 2: Crear y activar un entorno virtual de Python
- **En Windows (PowerShell / CMD):**
  ```powershell
  python -m venv venv
  .\venv\Scripts\activate
  ```
- **En Linux / macOS (Bash):**
  ```bash
  python3 -m venv venv
  source venv/bin/activate
  ```

### Paso 3: Instalar las dependencias de Python
```bash
pip install -r requirements.txt
```
*(El archivo `requirements.txt` incluye `yfinance`, `pandas` y `numpy`)*.

### Paso 4: Ejecutar el script generador de escenarios
```bash
python python/data_preparation.py
```

### ¿Qué realiza `data_preparation.py`?
1. Descarga cotizaciones ajustadas vía `yfinance` para AAPL, MSFT, GOOGL y AMZN.
2. Calcula los retornos diarios simples porcentuales ($r_{i,t} = \frac{P_{i,t} - P_{i,t-1}}{P_{i,t-1}}$ vía `pct_change().dropna()`), la matriz de covarianzas anualizada muestral $A = \operatorname{Cov}(r) \times 252$ y el vector de retornos medios anualizados $b = \mathbb{E}[r] \times 252$.
3. Construye los tres escenarios:
   - **Escenario 1 (Ideal):** Datos reales directos de mercado ($\kappa(A) \approx 13.97$).
   - **Escenario 2 (Bajo estrés):** Descomposición estructural $A = D_\sigma \cdot R \cdot D_\sigma$ con volatilidades $\times 1.5$ ($\sigma_{\text{estrés}} = 1.5 \cdot \sigma_{\text{base}}$), contagio en correlaciones $R_{\text{estrés}} = 0.6 \cdot R + 0.4 \cdot J$ ($J = \mathbf{1}\mathbf{1}^T$, estrictamente SPD) y reducción no uniforme de retornos esperados ($-30\%$ en AAPL y MSFT, $-50\%$ en GOOGL y AMZN), con $\kappa(A) \approx 26.41$ y $\kappa(M^{-1}A) \approx 20.76$.
   - **Escenario 3 (Mal condicionado):** Congruencia espectral $D \cdot A \cdot D$ con $D = \text{diag}(1, 1, 20, 1)$ inflando la escala de GOOGL para forzar $\kappa(A) > 2000$ preservando simetría y carácter SPD.
4. Valida en cada caso la simetría $A = A^T$ y el carácter SPD mediante autovalores estrictamente positivos con `np.linalg.eigvalsh(A)`.
5. Exporta el archivo estandarizado `data/escenarios.json`.

---

## 4. Ejecución Local de la Aplicación Web

Dado que la plataforma utiliza `fetch()` para leer `data/escenarios.json`, se recomienda servir la carpeta raíz mediante un servidor estático local para evitar políticas de seguridad del navegador contra lecturas `file://`.

### Opción A: Servidor nativo de Python (Recomendada)
Dentro de la carpeta raíz del proyecto, ejecute:
```bash
python -m http.server 8000
```
Luego abra su navegador web en: **[http://localhost:8000](http://localhost:8000)**

### Opción B: Mediante Node.js / npx
```bash
npx serve .
# o también:
npx http-server -p 8000
```

### Opción C: Extensión Live Server en VS Code
Abra el proyecto en Visual Studio Code, haga clic derecho sobre `index.html` y seleccione **"Open with Live Server"**.

> **Respaldo de Contingencia Integrado:**  
> Los archivos `js/ui.js` y `js/qa.js` cuentan con un respaldo JSON local embebido. Si por alguna razón se abre `index.html` haciendo doble clic directamente en el explorador de archivos (`file:///...`), la aplicación detecta el bloqueo de CORS y activa automáticamente el respaldo embebido sin romperse ni degradar funcionalidad.

---

## 5. Enlace a la Web Desplegada

La plataforma web se encuentra desplegada de forma pública y gratuita a través de **GitHub Pages**:

* **URL del Despliegue en Vivo:**  
  👉 **[https://araceli4i2.github.io/MetodoGradiante/](https://araceli4i2.github.io/MetodoGradiante/)**

---

## 6. Resumen de los Tres Escenarios Financieros

| Métrica / Característica | 1. Escenario Ideal | 2. Escenario Bajo Estrés | 3. Escenario Mal Condicionado |
|:---|:---:|:---:|:---:|
| **Condición Espectral $\kappa(A)$** | $\approx 13.97$ (Bien condicionada) | $\approx 26.41$ (Moderada) | $\approx 2000.98$ (Mal condicionada) |
| **Condición Precondicionada $\kappa(M^{-1}A)$** | $\approx 10.97$ | $\approx 20.76$ | $\approx 10.97$ (Reducción de **$182\times$**) |
| **Iteraciones GC / GCP (tol = 1e-6)** | 4 it / 4 it (Empate) | 4 it / 4 it (Empate) | 4 it / 4 it (Empate) |
| **Residuo Relativo Final GCP** | $6.08 \times 10^{-14}$ | $7.81 \times 10^{-13}$ | $7.88 \times 10^{-14}$ |
| **Residuo Relativo Final GC** | $8.00 \times 10^{-14}$ | $7.70 \times 10^{-13}$ | $1.06 \times 10^{-8}$ |
| **Ponderaciones Óptimas ($w_i$)** | AAPL: 63.97%<br>MSFT: 13.81%<br>GOOGL: 35.03%<br>AMZN: -12.81% | AAPL: 120.66%<br>MSFT: 54.63%<br>GOOGL: -15.41%<br>AMZN: -59.87% | AAPL: 63.97%<br>MSFT: 13.81%<br>GOOGL: 1.75%<br>AMZN: -12.81% |
| **Efecto Macroeconómico y Financiero** | Cartera normal basada en 2 años de cotizaciones de Yahoo Finance. Fuerte inversión en AAPL y GOOGL; posición corta en AMZN como cobertura (*hedge*). | Shock asimétrico y contagio: rotación hacia activos defensivos (AAPL al 120.7%) con GOOGL (-15.4%) y AMZN (-59.9%) en corto. | Desbalance de escala mediante congruencia $D \cdot A \cdot D$ (activo GOOGL $\times 20$). El precondicionador diagonal reduce $\kappa$ a 11, alcanzando precisión de máquina ($7.88 \times 10^{-14}$ vs $1.06 \times 10^{-8}$). |

---

## 7. Módulo QA y Pruebas Automatizadas en Vivo

La **Sección 9** del aplicativo web incluye un módulo automatizado de Aseguramiento de Calidad Numérica (`js/qa.js`). Al presionar el botón **"⚡ EJECUTAR PRUEBAS"**, el sistema evalúa cinco pruebas en tiempo real, midiendo tiempos en milisegundos y actualizando dinámicamente la tabla de resultados:

1. **Prueba 1 (Carga de los 3 escenarios sin error):**  
   Verifica que los tres escenarios se carguen íntegros, con matrices simétricas $4 \times 4$, menores principales de Sylvester estrictamente positivos ($\Delta_k > 0$) y solución directa de Cholesky con residuo nulo ($\|Ax - b\|_2 < 10^{-10}$).
2. **Prueba 2 (Manejo de excepciones por asimetría y no-SPD):**  
   Induce perturbaciones críticas intencionales ($A_{12} = 0.999 \neq A_{21}$ y varianza diagonal negativa $A_{11} = -0.05 \le 0$). Comprueba que el sistema detecte preventivamente las anomalías, emita notificaciones toast retro y resalte celdas sin romper la ejecución.
3. **Prueba 3 (Reactividad y recálculo numérico ante edición de coeficientes):**  
   Altera en vivo el retorno esperado de AAPL en $+10\%$ ($0.2450 \to 0.2695$). Comprueba que se recalculen instantáneamente la referencia de Cholesky, la asignación de pesos ($\Delta w_0 = +17.11\text{ pp}$), y la convergencia de GCP con error absoluto $\|E_a\|_2 < 10^{-6}$ y relativo $E_r < 10^{-5}$.
4. **Prueba 4 (Comparativa en el escenario mal condicionado):**  
   Verifica que en el escenario con $\kappa(A) \approx 2000.98$, el precondicionador Jacobi reduzca el número de condición a $\kappa(M^{-1}A) \approx 10.97$, satisfaciendo estrictamente $\text{iter}_{\text{GCP}} \le \text{iter}_{\text{GC}}$ (empate en 4 iteraciones con la tolerancia oficial $10^{-6}$).
5. **Prueba 5 (Precisión residual en $k = n$):**  
   Verifica que en el escenario mal condicionado, el residuo relativo de GCP tras $k = n$ ($n = 4$) iteraciones sea significativamente menor que el de GC ($7.88 \times 10^{-14}$ vs $1.06 \times 10^{-8}$), atribuible a que el redondeo se amplifica con $\kappa(A) \approx 2001$, mientras que $\kappa(M^{-1}A) \approx 11$.

---

## 8. Pasos para Activar GitHub Pages desde la Rama `main`

Para publicar este proyecto de forma permanente en GitHub Pages, siga este procedimiento:

1. **Subir los cambios al repositorio remoto en GitHub:**
   Asegúrese de haber confirmado y enviado todos los archivos a la rama `main`:
   ```bash
   git add .
   git commit -m "feat: completar plataforma web DAT-242 Markowitz con modulos QA y conclusiones"
   git push -u origin main
   ```

2. **Acceder a la configuración del repositorio en GitHub:**
   - Ingrese a su repositorio en el navegador:  
     `https://github.com/araceli4i2/MetodoGradiante`
   - En la barra superior de pestañas del repositorio, haga clic en **Settings** (Configuración ⚙️).

3. **Navegar a la sección de GitHub Pages:**
   - En la barra lateral izquierda, localice la sección **Code and automation**.
   - Haga clic en **Pages**.

4. **Configurar el origen de despliegue (Build and deployment):**
   - En el menú desplegable **Source**, verifique que esté seleccionado **Deploy from a branch**.
   - En el apartado **Branch**:
     - Seleccione la rama **`main`** en el primer selector.
     - Seleccione la carpeta **`/ (root)`** en el segundo selector.
   - Haga clic en el botón **Save** (Guardar).

5. **Esperar el despliegue automático:**
   - GitHub Actions iniciará automáticamente un flujo de trabajo llamado `pages-build-deployment`.
   - Puede supervisar el progreso en la pestaña **Actions** de su repositorio.
   - Tras aproximadamente 1 a 2 minutos, regrese a **Settings $\to$ Pages**.
   - En la parte superior verá el mensaje:  
     *“Your site is live at https://araceli4i2.github.io/MetodoGradiante/”*.

---

## 9. Referencias Bibliográficas (Normas APA 7.ª edición)

- **Golub, G. H., & Van Loan, C. F.** (2013). *Matrix Computations* (4th ed.). Johns Hopkins University Press.
- **Markowitz, H.** (1952). Portfolio Selection. *The Journal of Finance*, *7*(1), 77–91. https://doi.org/10.2307/2975974
- **Saad, Y.** (2003). *Iterative Methods for Sparse Linear Systems* (2nd ed.). Society for Industrial and Applied Mathematics (SIAM). https://doi.org/10.1137/1.9780898718003
- **Suñagua S., P.** (2020). Resolución de sistemas de ecuaciones lineales mediante el método del gradiente conjugado precondicionado. *Revista Boliviana de Matemática – UMSA*, *04*, 2–7.
- **Yahoo Finance.** (2024). *Historical Market Quotations for AAPL, MSFT, GOOGL, and AMZN* [Conjunto de datos extraído vía yfinance]. Yahoo Finance API. https://finance.yahoo.com/

