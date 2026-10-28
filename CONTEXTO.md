# Contexto del Proyecto

## Información General
- **Proyecto:** Web estática para DAT-242 Métodos Numéricos (Universidad Mayor de San Andrés - UMSA).
- **Estudiante:** Raquel Serrano.
- **Mención:** Inteligencia Artificial y Ciencia de Datos.

## Caso de Estudio: Cartera de Markowitz
- **Activos:** AAPL, MSFT, GOOGL, AMZN.
- **Formulación matemática:** Se resuelve el sistema lineal:
  $$Ax = b$$
  - $A$: Matriz de covarianzas anualizadas.
  - $b$: Vector de retornos esperados anualizados.
  - $x$: Vector de pesos no normalizados de la cartera.

## Métodos Numéricos
- **Cholesky:** Método directo utilizado como referencia exacta.
- **Gradientes Conjugados (GC):** Método iterativo estándar según Suñagua (2020).
- **Gradientes Conjugados Precondicionado (GCP):** Precondicionador diagonal (Jacobi) según Suñagua (2020).
- **Criterio de parada:**
  $$\frac{\|r\|}{\|b\|} < 10^{-6}$$

## Escenarios
Tres escenarios de prueba sobre los mismos 4 activos con distintos valores de $A$ y $b$:
1. **Ideal**
2. **Bajo estrés**
3. **Mal condicionado**

## Stack Tecnológico y Diseño
- **Frontend:** HTML5 + Tailwind CSS (vía CDN) + JavaScript plano (Vanilla JS, sin frameworks).
- **Diseño visual:** Estilo retro/arcade cian.
- **Arquitectura:** Web 100% estática, sin backend.

## Estructura del Repositorio
- `index.html`
- `css/retro.css`
- `js/`
  - `linalg.js`
  - `solvers.js`
  - `ui.js`
  - `qa.js`
- `data/escenarios.json`
- `python/data_preparation.py`
- `README.md`
- `CONTEXTO.md`

## Reglas de Desarrollo
- Modificar únicamente los archivos especificados en cada tarea.
- No utilizar la función nativa `alert()`.
- Todo el texto de la interfaz web debe estar en español.

