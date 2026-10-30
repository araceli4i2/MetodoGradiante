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
      "descripcion": "Escenario de estrés financiero: descomposición A = D_σ·R·D_σ con volatilidades x1.5, contagio sistémico en correlaciones R_estrés = 0.6·R + 0.4·J (SPD garantizada) y reducción no uniforme de retornos esperados (-30% en AAPL/MSFT y -50% en GOOGL/AMZN).",
      "condicion_kappa": 26.4076,
      "A": [
        [0.113906, 0.100246, 0.108783, 0.120215],
        [0.100246, 0.127449, 0.117689, 0.13214],
        [0.108783, 0.117689, 0.166464, 0.148741],
        [0.120215, 0.13214, 0.148741, 0.216225]
      ],
      "b": [0.1715, 0.1547, 0.134, 0.1075]
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

// =========================================================================
// CATÁLOGO DE ACTIVOS FINANCIEROS (MARKOWITZ S&P 500)
// =========================================================================
const ACTIVOS = [
  {
    indice: 0,
    ticker: "AAPL",
    nombre: "Apple Inc.",
    logo: "assets/logos/appl.webp",
    alt: "Logo de Apple Inc."
  },
  {
    indice: 1,
    ticker: "MSFT",
    nombre: "Microsoft Corp.",
    logo: "assets/logos/msft.webp",
    alt: "Logo de Microsoft Corp."
  },
  {
    indice: 2,
    ticker: "GOOGL",
    nombre: "Alphabet Inc.",
    logo: "assets/logos/googl.webp",
    alt: "Logo de Alphabet Inc."
  },
  {
    indice: 3,
    ticker: "AMZN",
    nombre: "Amazon.com Inc.",
    logo: "assets/logos/amzn.webp",
    alt: "Logo de Amazon.com Inc."
  }
];

// Asignación de propiedades por ticker para acceso rápido
ACTIVOS.AAPL = ACTIVOS[0];
ACTIVOS.MSFT = ACTIVOS[1];
ACTIVOS.GOOGL = ACTIVOS[2];
ACTIVOS.AMZN = ACTIVOS[3];

// Retrocompatibilidad con ACTIVOS_INFO existente
const ACTIVOS_INFO = ACTIVOS.map(a => ({ ticker: a.ticker, empresa: a.nombre }));

/**
 * Función auxiliar que genera el HTML de la pieza "logo + ticker + nombre"
 * @param {number|string} idOrTicker Índice (0..3) o ticker ('AAPL', etc.)
 * @param {'grande'|'pequeno'} tamano 'grande' para tarjetas; 'pequeno' para tablas y matrices
 * @param {Object} opciones { mostrarNombre: boolean, claseExtra: string, formatoTabla: boolean }
 * @returns {string} Fragmento HTML con imagen, alt, dimensiones fijas y badge de respaldo
 */
function renderActivoWidget(idOrTicker, tamano = 'pequeno', opciones = {}) {
  let activo = null;
  if (typeof idOrTicker === 'number') {
    activo = ACTIVOS[idOrTicker] || null;
  } else if (typeof idOrTicker === 'string') {
    const t = idOrTicker.trim().toUpperCase();
    activo = ACTIVOS.find(a => a.ticker === t) || ACTIVOS[parseInt(t, 10)] || null;
  }
  if (!activo) return `<span>${idOrTicker}</span>`;

  const { mostrarNombre = true, claseExtra = '', formatoTabla = false } = opciones;

  if (tamano === 'grande') {
    return `
      <div class="inline-flex items-center gap-3 ${claseExtra}">
        <div class="w-10 h-10 rounded-lg bg-white/95 p-1 border border-cyan-400/50 shrink-0 flex items-center justify-center shadow-[0_0_8px_rgba(6,182,212,0.25)] relative overflow-hidden">
          <img src="${activo.logo}" alt="${activo.alt}" width="32" height="32" class="w-8 h-8 object-contain"
            onerror="this.style.display='none'; if(this.nextElementSibling) this.nextElementSibling.classList.remove('hidden');" />
          <span class="hidden absolute inset-0 flex items-center justify-center bg-cyan-950 text-cyan-300 font-mono text-[10px] font-bold">
            ${activo.ticker}
          </span>
        </div>
        <div class="flex flex-col min-w-0 text-left">
          <span class="font-mono font-bold text-sm text-cyan-200 tracking-wider">${activo.ticker}</span>
          ${mostrarNombre ? `<span class="text-xs text-gray-300 truncate font-sans">${activo.nombre}</span>` : ''}
        </div>
      </div>
    `.trim();
  }

  // tamano === 'pequeno' (para tablas, celdas y matrices)
  return `
    <div class="inline-flex items-center gap-2 ${claseExtra} align-middle">
      <div class="w-6 h-6 rounded bg-white/95 p-0.5 border border-cyan-500/40 shrink-0 flex items-center justify-center shadow-[0_0_4px_rgba(6,182,212,0.2)] relative overflow-hidden">
        <img src="${activo.logo}" alt="${activo.alt}" width="18" height="18" class="w-4 h-4 object-contain"
          onerror="this.style.display='none'; if(this.nextElementSibling) this.nextElementSibling.classList.remove('hidden');" />
        <span class="hidden absolute inset-0 flex items-center justify-center bg-cyan-950 text-cyan-300 font-mono text-[8px] font-bold leading-none">
          ${activo.ticker.slice(0, 3)}
        </span>
      </div>
      <span class="font-mono font-bold text-cyan-200 text-xs">${activo.ticker}</span>
      ${mostrarNombre ? `<span class="text-[11px] text-gray-400 font-sans font-normal hidden xl:inline">(${activo.nombre})</span>` : ''}
    </div>
  `.trim();
}

if (typeof window !== 'undefined') {
  window.ACTIVOS = ACTIVOS;
  window.ACTIVOS_INFO = ACTIVOS_INFO;
  window.renderActivoWidget = renderActivoWidget;
}

// =========================================================================
// URL OFICIAL DEL REPOSITORIO Y DESPLIEGUE (Fuente única: README.md)
// =========================================================================
const REPO_URL = "https://github.com/araceli4i2/MetodoGradiante";
const SITE_URL = "https://araceli4i2.github.io/MetodoGradiante/";
const DEPLOY_URL = SITE_URL; // alias de compatibilidad hacia atrás

// Exponer en window para verificación y acceso global
if (typeof window !== 'undefined') {
  window.REPO_URL = REPO_URL;
  window.SITE_URL = SITE_URL;
  window.DEPLOY_URL = DEPLOY_URL;
}

document.addEventListener('DOMContentLoaded', () => {
  // =========================================================================
  // 0. VINCULACIÓN CENTRALIZADA DE ENLACES EXTERNOS (GITHUB Y DESPLIEGUE)
  // =========================================================================
  function inicializarEnlacesProyecto() {
    // 1. Enlaces en Cabecera (Repositorio y Web Pública)
    const headerRepoLink = document.getElementById('header-repo-link');
    if (headerRepoLink) {
      headerRepoLink.href = REPO_URL;
      headerRepoLink.target = '_blank';
      headerRepoLink.rel = 'noopener noreferrer';
      headerRepoLink.setAttribute('aria-label', 'Abrir el repositorio de GitHub en una pestaña nueva');
    }

    const headerSiteLink = document.getElementById('header-site-link');
    if (headerSiteLink) {
      headerSiteLink.href = SITE_URL;
      headerSiteLink.target = '_blank';
      headerSiteLink.rel = 'noopener noreferrer';
      headerSiteLink.setAttribute('aria-label', 'Abrir la web pública en una pestaña nueva');
    }

    // 2. Enlaces e información en Sección 1 (Inicio)
    const inicioRepoLink = document.getElementById('inicio-repo-link');
    if (inicioRepoLink) {
      inicioRepoLink.href = REPO_URL;
      inicioRepoLink.target = '_blank';
      inicioRepoLink.rel = 'noopener noreferrer';
      inicioRepoLink.setAttribute('aria-label', 'Abrir el repositorio de GitHub en una pestaña nueva');
    }
    const inicioRepoUrlText = document.getElementById('inicio-repo-url-text');
    if (inicioRepoUrlText) {
      inicioRepoUrlText.textContent = REPO_URL;
    }

    const inicioSiteLink = document.getElementById('inicio-site-link');
    if (inicioSiteLink) {
      inicioSiteLink.href = SITE_URL;
      inicioSiteLink.target = '_blank';
      inicioSiteLink.rel = 'noopener noreferrer';
      inicioSiteLink.setAttribute('aria-label', 'Abrir el sitio web publicado en una pestaña nueva');
    }
    const inicioSiteUrlText = document.getElementById('inicio-site-url-text');
    if (inicioSiteUrlText) {
      inicioSiteUrlText.textContent = SITE_URL;
    }

    // Botón Copiar enlace del sitio web con navigator.clipboard y fallback
    const btnCopiarSiteUrl = document.getElementById('btn-copiar-site-url');
    if (btnCopiarSiteUrl) {
      btnCopiarSiteUrl.addEventListener('click', async () => {
        try {
          if (navigator.clipboard && window.isSecureContext) {
            await navigator.clipboard.writeText(SITE_URL);
          } else {
            const textArea = document.createElement('textarea');
            textArea.value = SITE_URL;
            textArea.style.position = 'fixed';
            textArea.style.left = '-999999px';
            textArea.style.top = '-999999px';
            document.body.appendChild(textArea);
            textArea.focus();
            textArea.select();
            document.execCommand('copy');
            document.body.removeChild(textArea);
          }
          mostrarToast('¡Enlace del sitio web copiado al portapapeles!', 'success', 2500);
        } catch (err) {
          mostrarToast('No se pudo copiar automáticamente. URL: ' + SITE_URL, 'warning', 4000);
        }
      });
    }

    // 3. Enlaces y textos en Sección 10 (Conclusiones y Referencias - Recursos)
    const sec10RepoLink = document.getElementById('sec10-repo-link');
    if (sec10RepoLink) {
      sec10RepoLink.href = REPO_URL;
      sec10RepoLink.target = '_blank';
      sec10RepoLink.rel = 'noopener noreferrer';
      sec10RepoLink.setAttribute('aria-label', 'Abrir el repositorio de GitHub en una pestaña nueva');
    }
    const sec10RepoUrlText = document.getElementById('sec10-repo-url-text');
    if (sec10RepoUrlText) {
      sec10RepoUrlText.textContent = REPO_URL;
    }

    const sec10DeployLink = document.getElementById('sec10-deploy-link');
    if (sec10DeployLink) {
      sec10DeployLink.href = SITE_URL;
      sec10DeployLink.target = '_blank';
      sec10DeployLink.rel = 'noopener noreferrer';
      sec10DeployLink.setAttribute('aria-label', 'Abrir el sitio web desplegado en GitHub Pages en una pestaña nueva');
    }
    const sec10DeployUrlText = document.getElementById('sec10-deploy-url-text');
    if (sec10DeployUrlText) {
      sec10DeployUrlText.textContent = SITE_URL;
    }
  }

  // Ejecutar vinculación de URLs
  inicializarEnlacesProyecto();

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
        window.location.hash = target;
        navigateTo(target);
      }
    });
  });

  window.addEventListener('hashchange', () => {
    const hash = (window.location.hash || '').replace('#', '');
    if (hash && document.getElementById(hash)) {
      navigateTo(hash);
    }
  });

  if (mobileMenuBtn && mobileNav) {
    mobileMenuBtn.addEventListener('click', () => {
      mobileNav.classList.toggle('hidden');
    });
  }

  // =========================================================================
  // SISTEMA DE NOTIFICACIONES RETRO (TOASTS EN EL DOM - NUNCA ALERT())
  // =========================================================================
  let toastContainer = null;
  let ultimoToastInfo = { mensaje: '', tipo: '', timestamp: 0 };

  function escapeHtml(str) {
    if (typeof str !== 'string') return '';
    return str
      .replace(/&/g, '\x26amp;')
      .replace(/</g, '\x26lt;')
      .replace(/>/g, '\x26gt;')
      .replace(/"/g, '\x26quot;')
      .replace(/'/g, '\x26#039;');
  }

  function obtenerToastContainer() {
    if (!toastContainer || !document.body.contains(toastContainer)) {
      toastContainer = document.getElementById('retro-toast-container');
      if (!toastContainer) {
        toastContainer = document.createElement('div');
        toastContainer.id = 'retro-toast-container';
        toastContainer.className = 'fixed top-4 right-4 z-50 flex flex-col gap-2.5 max-w-sm sm:max-w-md w-full pointer-events-none px-4';
        document.body.appendChild(toastContainer);
      }
    }
    return toastContainer;
  }

  /**
   * Muestra una notificación retro tipo toast en el DOM.
   * Cumple con la regla estricta: nunca invoca la función alert() nativa.
   * @param {string} mensaje - Mensaje descriptivo del toast
   * @param {'error'|'warning'|'success'|'info'} [tipo='error'] - Severidad
   * @param {number} [duracion=5000] - Tiempo en ms antes de auto-desaparecer (0 para persistente)
   * @param {string} [tituloPersonalizado=null] - Encabezado personalizado
   */
  function mostrarToast(mensaje, tipo = 'error', duracion = 5000, tituloPersonalizado = null) {
    const ahora = Date.now();
    // Prevenir duplicados inmediatos en menos de 1.2 segundos
    if (ultimoToastInfo.mensaje === mensaje && ultimoToastInfo.tipo === tipo && (ahora - ultimoToastInfo.timestamp < 1200)) {
      return;
    }
    ultimoToastInfo = { mensaje, tipo, timestamp: ahora };

    const container = obtenerToastContainer();
    const toast = document.createElement('div');

    let borderColor, textColor, bgGlow, headerText, iconSymbol;
    switch (tipo) {
      case 'warning':
        borderColor = 'border-amber-500';
        textColor = 'text-amber-200';
        bgGlow = 'shadow-[0_0_18px_rgba(245,158,11,0.45)]';
        headerText = tituloPersonalizado || 'ADVERTENCIA // SISTEMA';
        iconSymbol = '◆';
        break;
      case 'success':
        borderColor = 'border-emerald-500';
        textColor = 'text-emerald-200';
        bgGlow = 'shadow-[0_0_18px_rgba(16,185,129,0.45)]';
        headerText = tituloPersonalizado || 'ÉXITO // OPERACIÓN COMPLETADA';
        iconSymbol = '●';
        break;
      case 'info':
        borderColor = 'border-cyan-500';
        textColor = 'text-cyan-200';
        bgGlow = 'shadow-[0_0_18px_rgba(0,240,255,0.45)]';
        headerText = tituloPersonalizado || 'NOTIFICACIÓN // TERMINAL';
        iconSymbol = '>';
        break;
      case 'error':
      default:
        borderColor = 'border-rose-500';
        textColor = 'text-rose-200';
        bgGlow = 'shadow-[0_0_18px_rgba(244,63,94,0.5)]';
        headerText = tituloPersonalizado || 'ERROR // DATOS INVÁLIDOS';
        iconSymbol = '▲';
        break;
    }

    toast.className = `retro-toast pointer-events-auto flex items-start justify-between gap-3 p-3.5 rounded-lg border bg-black/95 ${borderColor} ${textColor} ${bgGlow} font-mono text-xs backdrop-blur-md`;

    toast.innerHTML = `
      <div class="flex items-start gap-2.5">
        <span class="text-base font-bold leading-none select-none">${iconSymbol}</span>
        <div>
          <div class="text-[11px] font-bold uppercase tracking-wider leading-none mb-1 opacity-90">${headerText}</div>
          <div class="text-xs text-gray-200 leading-snug break-words">${escapeHtml(mensaje)}</div>
        </div>
      </div>
      <button type="button" class="toast-close ml-2 text-gray-400 hover:text-white transition-colors cursor-pointer text-base leading-none select-none" title="Cerrar">×</button>
    `;

    function cerrarToast() {
      if (toast.classList.contains('toast-fade-out')) return;
      toast.classList.add('toast-fade-out');
      setTimeout(() => {
        if (toast.parentElement) {
          toast.remove();
        }
      }, 250);
    }

    const btnCerrar = toast.querySelector('.toast-close');
    if (btnCerrar) {
      btnCerrar.addEventListener('click', cerrarToast);
    }

    container.appendChild(toast);

    if (duracion > 0) {
      setTimeout(cerrarToast, duracion);
    }
  }

  function limpiarToasts() {
    const container = obtenerToastContainer();
    if (container) {
      container.innerHTML = '';
    }
  }

  // =========================================================================
  // GESTIÓN DE RESALTADO DE CELDAS PROBLEMÁTICAS
  // =========================================================================
  function resaltarCelda(elementId, mensaje = '') {
    const input = document.getElementById(elementId);
    if (!input) return;

    input.classList.add('cell-error-highlight');
    if (mensaje) {
      input.title = mensaje;
    }

    const onInputHandler = () => {
      input.classList.remove('cell-error-highlight');
      input.title = '';
      input.removeEventListener('input', onInputHandler);
    };
    input.addEventListener('input', onInputHandler);
  }

  function limpiarTodosLosResaltados() {
    const elementos = document.querySelectorAll('.cell-error-highlight');
    elementos.forEach(el => {
      el.classList.remove('cell-error-highlight');
      el.title = '';
    });
  }

  // =========================================================================
  // GESTIÓN DE RESULTADOS OBSOLETOS ANTE ENTRADAS INVÁLIDAS
  // =========================================================================
  function asegurarBannerObsoleto(secId, bannerId, titulo, errorMsg) {
    const sec = document.getElementById(secId);
    if (!sec) return;

    let banner = document.getElementById(bannerId);
    if (!banner) {
      banner = document.createElement('div');
      banner.id = bannerId;
      banner.className = 'banner-obsoleto bg-rose-950/90 border border-rose-500 text-rose-200 p-3 rounded-lg mb-4 flex flex-col sm:flex-row sm:items-center justify-between gap-2 font-mono text-xs shadow-[0_0_15px_rgba(244,63,94,0.4)]';
      const retroPanel = sec.querySelector('.retro-panel');
      if (retroPanel) {
        const subtitle = retroPanel.querySelector('p');
        if (subtitle && subtitle.parentElement) {
          subtitle.parentElement.insertAdjacentElement('afterend', banner);
        } else {
          retroPanel.prepend(banner);
        }
      }
    }
    banner.classList.remove('hidden');
    banner.innerHTML = `
      <div class="flex items-start sm:items-center gap-2.5">
        <span class="text-rose-400 font-bold text-lg leading-none">▲</span>
        <div>
          <span class="font-bold text-rose-300 uppercase tracking-wider">${titulo}</span>
          <p class="text-gray-300 text-[11px] mt-0.5 leading-snug">
            Los datos de entrada actuales contienen errores (<span class="text-rose-200 font-bold">${escapeHtml(errorMsg)}</span>). Los valores y gráficos mostrados a continuación corresponden al último cálculo válido y están <strong>OBSOLETOS</strong>.
          </p>
        </div>
      </div>
      <span class="px-2.5 py-1 bg-rose-900 border border-rose-500 text-rose-100 rounded text-[10px] font-bold uppercase tracking-wider self-start sm:self-center shadow-[0_0_8px_rgba(244,63,94,0.5)] shrink-0">OBSOLETO</span>
    `;
  }

  function marcarResultadosObsoletos(errorMsg) {
    // 1. Mostrar banners en secciones dependientes de resultados
    asegurarBannerObsoleto('sec-solucion-referencia', 'banner-obsoleto-sec6', 'Solución de Referencia Obsoleta', errorMsg);
    asegurarBannerObsoleto('sec-gcp-vs-gc', 'banner-obsoleto-sec7', 'Resultados Iterativos Obsoletos', errorMsg);
    asegurarBannerObsoleto('sec-analisis-errores', 'banner-obsoleto-sec8', 'Análisis de Errores y Sensibilidad Obsoletos', errorMsg);

    // 2. Aplicar estilo visual atenuado a tablas y gráficos obsoletos
    const targets = [
      document.getElementById('tbody-referencia')?.parentElement,
      document.getElementById('chart-residuos')?.parentElement,
      document.getElementById('tbody-errores-variable')?.parentElement,
      document.getElementById('tbody-comparativa-escenarios')?.parentElement,
      document.getElementById('tbody-sensibilidad')?.parentElement,
      document.getElementById('table-heatmap-correlacion')
    ];
    targets.forEach(el => {
      if (el) el.classList.add('resultado-obsoleto');
    });

    // 3. Actualizar badges a estado obsoleto
    const refResNorma = document.getElementById('ref-residuo-norma');
    if (refResNorma) {
      refResNorma.innerHTML = '<span class="text-rose-400 font-bold">▲ OBSOLETO (Entrada Inválida)</span>';
    }

    const badgeResumen = document.getElementById('badge-comparativa-resumen');
    if (badgeResumen) {
      badgeResumen.innerHTML = '<span class="text-rose-400 font-bold">▲ RESULTADOS OBSOLETOS</span>';
    }

    const gcBadge = document.getElementById('gc-badge-convergio');
    if (gcBadge) {
      gcBadge.className = 'text-[10px] px-2 py-0.5 rounded font-mono font-bold bg-rose-950 border border-rose-500 text-rose-300';
      gcBadge.textContent = '▲ OBSOLETO';
    }

    const gcpBadge = document.getElementById('gcp-badge-convergio');
    if (gcpBadge) {
      gcpBadge.className = 'text-[10px] px-2 py-0.5 rounded font-mono font-bold bg-rose-950 border border-rose-500 text-rose-300';
      gcpBadge.textContent = '▲ OBSOLETO';
    }

    const badgeResGlobal = document.getElementById('err-residuo-global-gcp');
    if (badgeResGlobal) {
      badgeResGlobal.innerHTML = '<span class="text-rose-400 font-bold">▲ OBSOLETO</span>';
    }

    const badgeSens = document.getElementById('badge-sensibilidad-actual');
    if (badgeSens) {
      badgeSens.className = 'px-2 py-0.5 text-xs font-mono font-bold rounded bg-rose-950 border border-rose-500 text-rose-300';
      badgeSens.textContent = '▲ OBSOLETO';
    }

    // 4. Mensaje en consola de sección 4
    if (calcStatusMsg) {
      calcStatusMsg.innerHTML = `<span class="text-rose-400 font-bold">▲ ENTRADA INVÁLIDA:</span> ${escapeHtml(errorMsg)} — <span class="text-amber-300 font-mono font-bold">[RESULTADOS MARCADOS COMO OBSOLETOS]</span>`;
    }
  }

  function restaurarResultadosValidos() {
    document.querySelectorAll('.banner-obsoleto').forEach(b => b.classList.add('hidden'));
    document.querySelectorAll('.resultado-obsoleto').forEach(el => el.classList.remove('resultado-obsoleto'));
  }

  function resetearDiagnosticoInvalido() {
    if (diagEscenarioBadge) diagEscenarioBadge.textContent = 'DATOS INVÁLIDOS';
    if (diagSimetriaStatus) {
      diagSimetriaStatus.className = 'text-sm font-bold text-rose-400 flex items-center gap-1.5 font-mono';
      diagSimetriaStatus.innerHTML = '<span>▲</span> <span>DATOS INVÁLIDOS</span>';
    }
    if (diagSimetriaDesc) diagSimetriaDesc.textContent = 'Corrija los campos vacíos o no numéricos.';
    if (diagSylvesterStatus) {
      diagSylvesterStatus.className = 'text-sm font-bold text-rose-400 flex items-center gap-1.5 font-mono';
      diagSylvesterStatus.innerHTML = '<span>▲</span> <span>NO EVALUABLE</span>';
    }
    if (diagMenoresVals) diagMenoresVals.innerHTML = '<div class="text-rose-400">Δₖ = N/D</div>';
    if (diagAutovaloresStatus) {
      diagAutovaloresStatus.className = 'text-sm font-bold text-rose-400 flex items-center gap-1.5 font-mono';
      diagAutovaloresStatus.innerHTML = '<span>▲</span> <span>NO EVALUABLE</span>';
    }
    if (diagAutovaloresVals) diagAutovaloresVals.innerHTML = '<div class="text-rose-400">λᵢ = N/D</div>';
    if (diagKappaVal) diagKappaVal.textContent = 'κ(A) = N/D';
    if (diagKappaDesc) {
      diagKappaDesc.className = 'text-[11px] text-rose-400 font-mono mt-2 pt-2 border-t border-cyan-950';
      diagKappaDesc.textContent = 'Esperando matriz válida...';
    }
  }

  // =========================================================================
  // VALIDACIONES DE ENTRADA (CAMPOS VACÍOS, NO NUMÉRICOS, SIMETRÍA, SPD)
  // =========================================================================
  function validarEntradas() {
    // 1. Validar cuadrícula 4x4 de la Matriz A (campos vacíos y no numéricos)
    for (let i = 0; i < 4; i++) {
      for (let j = 0; j < 4; j++) {
        const id = `mat-a-${i}-${j}`;
        const input = document.getElementById(id);
        if (!input) continue;

        const raw = input.value.trim();
        if (raw === '') {
          return {
            valido: false,
            error: `La celda A[${i + 1}, ${j + 1}] (${ACTIVOS_INFO[i].ticker} - ${ACTIVOS_INFO[j].ticker}) está vacía. Ingrese un valor numérico.`,
            celdas: [id]
          };
        }

        const num = Number(raw);
        if (isNaN(num) || !isFinite(num)) {
          return {
            valido: false,
            error: `La celda A[${i + 1}, ${j + 1}] (${ACTIVOS_INFO[i].ticker} - ${ACTIVOS_INFO[j].ticker}) contiene un valor no numérico ("${raw}").`,
            celdas: [id]
          };
        }
      }
    }

    // 2. Validar vector b de retornos esperados (campos vacíos y no numéricos)
    for (let i = 0; i < 4; i++) {
      const id = `vec-b-${i}`;
      const input = document.getElementById(id);
      if (!input) continue;

      const raw = input.value.trim();
      if (raw === '') {
        return {
          valido: false,
          error: `El campo del retorno esperado b[${i + 1}] (${ACTIVOS_INFO[i].ticker}) está vacío. Ingrese un valor numérico.`,
          celdas: [id]
        };
      }

      const num = Number(raw);
      if (isNaN(num) || !isFinite(num)) {
        return {
          valido: false,
          error: `El retorno esperado b[${i + 1}] (${ACTIVOS_INFO[i].ticker}) contiene un valor no numérico ("${raw}").`,
          celdas: [id]
        };
      }
    }

    // 3. Validar Parámetros de Solver (Tolerancia y Nmáx)
    const inputTol = document.getElementById('input-tol');
    if (inputTol) {
      const rawTol = inputTol.value.trim();
      const numTol = Number(rawTol);
      if (rawTol === '' || isNaN(numTol) || numTol <= 0) {
        return {
          valido: false,
          error: 'La tolerancia de convergencia debe ser un número estrictamente positivo (ej. 1e-6).',
          celdas: ['input-tol']
        };
      }
    }

    const inputMaxIter = document.getElementById('input-max-iter');
    if (inputMaxIter) {
      const rawMax = inputMaxIter.value.trim();
      const numMax = Number(rawMax);
      if (rawMax === '' || isNaN(numMax) || numMax <= 0 || !Number.isInteger(numMax)) {
        return {
          valido: false,
          error: 'El número máximo de iteraciones (Nmáx) debe ser un número entero positivo (ej. 100).',
          celdas: ['input-max-iter']
        };
      }
    }

    // 4. Validar vector inicial x0 personalizado si está activo
    if (selectX0 && selectX0.value === 'custom') {
      for (let i = 0; i < 4; i++) {
        const id = `x0-custom-${i}`;
        const input = document.getElementById(id);
        if (input) {
          const raw = input.value.trim();
          const num = Number(raw);
          if (raw === '' || isNaN(num) || !isFinite(num)) {
            return {
              valido: false,
              error: `El vector inicial x₀[${i + 1}] para ${ACTIVOS_INFO[i].ticker} debe ser un número válido.`,
              celdas: [id]
            };
          }
        }
      }
    }

    // 5. Construir matrices numéricas
    const A = leerMatrizA();
    const b = leerVectorB();
    const x0 = leerVectorX0();
    const params = leerParametros();

    // 6. Validar Simetría (A = Aᵀ con tolerancia 1e-8)
    for (let i = 0; i < 4; i++) {
      for (let j = i + 1; j < 4; j++) {
        const diff = Math.abs(A[i][j] - A[j][i]);
        if (diff > 1e-8) {
          return {
            valido: false,
            error: `Matriz no simétrica: A[${i + 1}, ${j + 1}] (${A[i][j]}) ≠ A[${j + 1}, ${i + 1}] (${A[j][i]}) con discrepancia |aᵢⱼ - aⱼᵢ| = ${diff.toExponential(2)}. La matriz de covarianzas debe ser estrictamente simétrica.`,
            celdas: [`mat-a-${i}-${j}`, `mat-a-${j}-${i}`],
            A,
            b,
            x0,
            params
          };
        }
      }
    }

    // 7. Validar Definición Positiva: Varianzas diagonales A[i][i] > 0
    for (let i = 0; i < 4; i++) {
      if (A[i][i] <= 0) {
        return {
          valido: false,
          error: `Matriz no definida positiva: La varianza anualizada del activo ${ACTIVOS_INFO[i].ticker} en la diagonal A[${i + 1}, ${i + 1}] es ${A[i][i]} ≤ 0. Las varianzas deben ser estrictamente positivas.`,
          celdas: [`mat-a-${i}-${i}`],
          A,
          b,
          x0,
          params
        };
      }
    }

    // 8. Validar Criterio de Sylvester (Todos los menores principales Δₖ > 0)
    if (window.LinAlg && typeof window.LinAlg.principalMinors === 'function') {
      try {
        const menores = window.LinAlg.principalMinors(A);
        for (let k = 0; k < menores.length; k++) {
          if (menores[k] <= 0) {
            return {
              valido: false,
              error: `Criterio de Sylvester violado: El menor principal Δ${k + 1} = ${menores[k].toFixed(6)} es menor o igual a cero. La matriz no es definida positiva (SPD).`,
              celdas: [`mat-a-${k}-${k}`],
              A,
              b,
              x0,
              params
            };
          }
        }
      } catch (errSylvester) {
        console.warn("Error al calcular menores de Sylvester:", errSylvester);
      }
    }

    return { valido: true, A, b, x0, params };
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
  let escenarioSeleccionadoId = 'ideal';
  let datosEditadosManualmente = false;

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
    limpiarTodosLosResaltados();
    restaurarResultadosValidos();

    escenarioSeleccionadoId = idEscenario;
    datosEditadosManualmente = false;

    const { datos, origen } = await obtenerEscenariosData();
    const lista = Array.isArray(datos.escenarios) 
      ? datos.escenarios 
      : Object.values(datos.escenarios);
    cacheEscenariosData = lista;
    actualizarTarjetasEscenarios(lista);
    actualizarTablaComparativaSeccion3(lista);
    actualizarTablaResumenSeccion10(lista);

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

    // Notificación toast informativa
    mostrarToast(`Escenario "${escenario.nombre}" cargado correctamente.`, 'info', 2500);

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
  // 4b. TABLA COMPARATIVA SIMULTÁNEA DE LOS 3 ESCENARIOS EN SECCIÓN 3 Y TARJETAS SECCIÓN 5
  // =========================================================================
  let cacheEscenariosData = null;

  /**
   * Actualiza en vivo la tabla comparativa de los TRES escenarios simultáneamente en la Sección 3,
   * calculando con LinAlg.js desde los datos de cada escenario (independiente del escenario activo):
   * ‖A − Aᵀ‖, menores principales Δ₁…Δ₄ (Sylvester), autovalores λ₁…λ₄, λmin y conclusión SPD.
   */
  /**
   * Actualiza en vivo el Cuadro Resumen Comparativo de Escenarios (Tabla 10.3 en Sección 10)
   * calculando con LinAlg y Solvers: κ(A), κ(M⁻¹A), iteraciones (GC / GCP) y residuo relativo final de GCP.
   */
  function actualizarTablaResumenSeccion10(escenarios) {
    const tbody = document.getElementById('tbody-resumen-sec10');
    if (!tbody || !escenarios || !window.LinAlg || !window.Solvers) return;

    const lista = Array.isArray(escenarios) ? escenarios : Object.values(escenarios);
    if (lista.length < 3) return;

    const metaFilas = [
      {
        color: 'text-cyan-300',
        efecto: 'Régimen normal: alta ponderación en AAPL y GOOGL, AMZN en cobertura.',
        diagClase: 'text-emerald-400 font-bold',
        diagTexto: 'Bien condicionada (SPD)'
      },
      {
        color: 'text-amber-300',
        efecto: 'Contracción de retornos asimétrica (-30% AAPL/MSFT, -50% GOOGL/AMZN) y contagio en correlación.',
        diagClase: 'text-amber-400 font-bold',
        diagTexto: 'SPD bajo estrés'
      },
      {
        color: 'text-rose-300',
        efecto: 'Desbalance de escala en GOOGL. Jacobi recupera precisión de máquina (182x mejora).',
        diagClase: 'text-emerald-400 font-bold',
        diagTexto: 'Mejor precisión final con GCP (iteraciones empatadas con tol 1e-6)'
      }
    ];

    const filasHtml = lista.map((esc, idx) => {
      const A = esc.A;
      const b = esc.b;
      const condA = window.LinAlg.condNumber(A);
      const condMA = window.Solvers.condPrecond(A);
      const resGC = window.Solvers.solveGC(A, b, [0, 0, 0, 0], 1e-6, 100);
      const resGCP = window.Solvers.solveGCP(A, b, [0, 0, 0, 0], 1e-6, 100);
      const meta = metaFilas[idx] || metaFilas[0];
      const condAClase = idx === 2 ? 'text-rose-400 font-bold' : '';

      return `
              <tr class="hover:bg-cyan-950/20">
                <td class="p-2.5 font-bold ${meta.color}">${idx + 1}. ${esc.nombre}</td>
                <td class="p-2.5 text-center ${condAClase}">${condA.toFixed(2)}</td>
                <td class="p-2.5 text-center text-emerald-400">${condMA.toFixed(2)}</td>
                <td class="p-2.5 text-center">${resGC.iteraciones} / ${resGCP.iteraciones}</td>
                <td class="p-2.5 text-center font-mono text-cyan-200">${resGCP.residuoRelativo.toExponential(2)}</td>
                <td class="p-2.5 text-gray-300">${meta.efecto}</td>
                <td class="p-2.5 text-center ${meta.diagClase}">${meta.diagTexto}</td>
              </tr>`;
    }).join('');

    tbody.innerHTML = filasHtml;
  }

  function actualizarTablaComparativaSeccion3(escenarios) {
    const tbody = document.getElementById('tbody-comparativa-sec3');
    if (!tbody || !escenarios || !window.LinAlg) return;

    const lista = Array.isArray(escenarios) ? escenarios : Object.values(escenarios);
    if (lista.length < 3) return;

    const metricas = lista.map(esc => {
      const A = esc.A;
      let diffMax = 0;
      for (let i = 0; i < A.length; i++) {
        for (let j = 0; j < A.length; j++) {
          diffMax = Math.max(diffMax, Math.abs(A[i][j] - A[j][i]));
        }
      }
      const esSimetrica = window.LinAlg.isSymmetric(A, 1e-8);
      const minors = window.LinAlg.principalMinors(A);
      const { eigenvalues } = window.LinAlg.eigenSymmetric(A);
      const lambdaMin = eigenvalues[0];
      const lambdaMax = eigenvalues[eigenvalues.length - 1];
      const todosMinorsPos = minors.every(m => m > 0);
      const todosEigsPos = lambdaMin > 0;
      const esSPD = esSimetrica && todosMinorsPos && todosEigsPos;
      const kappaA = lambdaMax / lambdaMin;
      const kappaM = window.Solvers && typeof window.Solvers.condPrecond === 'function'
        ? window.Solvers.condPrecond(A)
        : null;

      return {
        id: esc.id,
        nombre: esc.nombre,
        diffMax,
        esSimetrica,
        minors,
        eigenvalues,
        lambdaMin,
        lambdaMax,
        esSPD,
        kappaA,
        kappaM
      };
    });

    const formatMinor = (m) => {
      const ok = m > 0;
      const valStr = Math.abs(m) < 1e-3 ? m.toExponential(4) : m.toFixed(6);
      return `<span class="${ok ? 'text-emerald-400 font-bold' : 'text-rose-400 font-bold'}">${valStr}</span> <span class="text-gray-400 text-[10px]">(${ok ? '> 0' : '≤ 0'})</span>`;
    };

    const formatEig = (ev) => {
      return `<span class="text-cyan-200">${ev.toFixed(6)}</span>`;
    };

    const filas = [
      {
        param: 'Asimetría ‖A − Aᵀ‖ (max |aᵢⱼ − aⱼᵢ|)',
        desc: 'Simetría exacta requerida para Cholesky y GC/GCP',
        vals: metricas.map(m => m.diffMax === 0 ? '<span class="text-emerald-400 font-bold">0.00e+00 (Exacta)</span>' : `<span class="text-cyan-300 font-bold">${m.diffMax.toExponential(2)}</span>`)
      },
      {
        param: 'Menor principal Sylvester Δ₁ = det(A[1:1])',
        desc: 'Varianza activo AAPL (a₁₁ > 0)',
        vals: metricas.map(m => formatMinor(m.minors[0]))
      },
      {
        param: 'Menor principal Sylvester Δ₂ = det(A[1:2, 1:2])',
        desc: 'Determinante submatriz 2×2 (> 0)',
        vals: metricas.map(m => formatMinor(m.minors[1]))
      },
      {
        param: 'Menor principal Sylvester Δ₃ = det(A[1:3, 1:3])',
        desc: 'Determinante submatriz 3×3 (> 0)',
        vals: metricas.map(m => formatMinor(m.minors[2]))
      },
      {
        param: 'Menor principal Sylvester Δ₄ = det(A)',
        desc: 'Determinante total de la matriz de covarianzas (> 0)',
        vals: metricas.map(m => formatMinor(m.minors[3]))
      },
      {
        param: 'Autovalor λ₁ (λₘᵢₙ)',
        desc: 'Autovalor mínimo calculado con Jacobi cíclico',
        vals: metricas.map(m => `<span class="text-emerald-400 font-bold">${m.lambdaMin.toFixed(6)}</span> <span class="text-gray-400 text-[10px]">(> 0)</span>`)
      },
      {
        param: 'Autovalor λ₂',
        desc: 'Segundo autovalor espectral',
        vals: metricas.map(m => formatEig(m.eigenvalues[1]))
      },
      {
        param: 'Autovalor λ₃',
        desc: 'Tercer autovalor espectral',
        vals: metricas.map(m => formatEig(m.eigenvalues[2]))
      },
      {
        param: 'Autovalor λ₄ (λₘₐₓ)',
        desc: 'Autovalor máximo espectral',
        vals: metricas.map(m => formatEig(m.eigenvalues[3]))
      },
      {
        param: 'Autovalor mínimo λₘᵢₙ',
        desc: 'Criterio espectral SPD: λₘᵢₙ > 0',
        vals: metricas.map(m => `<span class="text-emerald-400 font-bold">${m.lambdaMin.toFixed(6)}</span> <span class="text-gray-400 text-[10px]">(> 0)</span>`)
      },
      {
        param: 'Número de condición espectral κ(A)',
        desc: 'λₘₐₓ / λₘᵢₙ (Sensibilidad y dispersión)',
        vals: metricas.map(m => `<span class="text-white font-bold">${m.kappaA.toFixed(2)}</span>`)
      },
      {
        param: 'Número de condición Jacobi κ(M⁻¹A)',
        desc: 'Sistema precondicionado con M = diag(A)',
        vals: metricas.map(m => m.kappaM !== null ? `<span class="text-emerald-400 font-bold">${m.kappaM.toFixed(2)}</span>` : '--')
      },
      {
        param: '¿Simétrica y definida positiva (SPD)?',
        desc: 'Condición necesaria y suficiente para Cholesky y CG',
        vals: metricas.map(m => m.esSPD
          ? '<span class="px-2 py-0.5 rounded text-[10px] bg-emerald-950 text-emerald-300 border border-emerald-500 font-bold">✓ SÍ (SPD)</span>'
          : '<span class="px-2 py-0.5 rounded text-[10px] bg-rose-950 text-rose-300 border border-rose-500 font-bold">✗ NO</span>'
        )
      }
    ];

    tbody.innerHTML = filas.map((fila, idx) => `
      <tr class="hover:bg-cyan-950/20 transition-colors ${idx % 2 === 1 ? 'bg-black/30' : ''}">
        <td class="p-2.5">
          <div class="font-bold text-gray-200">${fila.param}</div>
          <div class="text-[10px] text-gray-400 font-sans">${fila.desc}</div>
        </td>
        <td class="p-2.5 text-center font-mono">${fila.vals[0]}</td>
        <td class="p-2.5 text-center font-mono border-l border-cyan-900/60">${fila.vals[1]}</td>
        <td class="p-2.5 text-center font-mono border-l border-cyan-900/60">${fila.vals[2]}</td>
      </tr>
    `).join('');
  }

  /**
   * Actualiza dinámicamente los números de condición e información de las tarjetas en Sección 5
   * a partir de los datos reales de los escenarios (sin números fijos escritos a mano).
   */
  function actualizarTarjetasEscenarios(escenarios) {
    if (!escenarios || !window.LinAlg) return;
    const lista = Array.isArray(escenarios) ? escenarios : Object.values(escenarios);

    const badgeIdeal = document.getElementById('card-ideal-kappa-badge');
    const badgeEstres = document.getElementById('card-estres-kappa-badge');
    const badgeMal = document.getElementById('card-mal-kappa-badge');
    const condIdeal = document.getElementById('card-ideal-condicion');
    const condEstres = document.getElementById('card-estres-condicion');
    const condMal = document.getElementById('card-mal-condicion');

    const escIdeal = lista.find(e => e.id === 'ideal') || lista[0];
    const escEstres = lista.find(e => e.id === 'bajo_estres') || lista[1];
    const escMal = lista.find(e => e.id === 'mal_condicionado') || lista[2];

    if (escIdeal) {
      const kappaA = window.LinAlg.condNumber(escIdeal.A);
      const kappaM = window.Solvers && typeof window.Solvers.condPrecond === 'function'
        ? window.Solvers.condPrecond(escIdeal.A)
        : null;
      if (badgeIdeal) badgeIdeal.textContent = `κ(A) ≈ ${kappaA.toFixed(2)}`;
      if (condIdeal && kappaM !== null) {
        condIdeal.textContent = `• Condición: κ(A) ≈ ${kappaA.toFixed(2)} | κ(M⁻¹A) ≈ ${kappaM.toFixed(2)}`;
      }
    }

    if (escEstres) {
      const kappaA = window.LinAlg.condNumber(escEstres.A);
      const kappaM = window.Solvers && typeof window.Solvers.condPrecond === 'function'
        ? window.Solvers.condPrecond(escEstres.A)
        : null;
      if (badgeEstres) badgeEstres.textContent = `κ(A) ≈ ${kappaA.toFixed(2)}`;
      if (condEstres && kappaM !== null) {
        condEstres.textContent = `• Condición: κ(A) ≈ ${kappaA.toFixed(2)} | κ(M⁻¹A) ≈ ${kappaM.toFixed(2)}`;
      }
    }

    if (escMal) {
      const kappaA = window.LinAlg.condNumber(escMal.A);
      const kappaM = window.Solvers && typeof window.Solvers.condPrecond === 'function'
        ? window.Solvers.condPrecond(escMal.A)
        : null;
      if (badgeMal) badgeMal.textContent = `κ(A) ≈ ${kappaA.toFixed(2)}`;
      if (condMal && kappaM !== null) {
        condMal.textContent = `• Condición: κ(A) ≈ ${kappaA.toFixed(2)} | κ(M⁻¹A) ≈ ${kappaM.toFixed(2)}`;
      }
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

  /**
   * Actualiza la tabla de Residuo Relativo por Iteración (Sección 7)
   * Columnas: k, ‖rₖ‖/‖b‖ (GC Estándar), ‖rₖ‖/‖b‖ (GCP Jacobi), Ventaja de Precisión GCP
   */
  function actualizarTablaResiduosPorIteracion(historialGC, historialGCP) {
    const tbody = document.getElementById('tbody-residuos-iteracion');
    if (!tbody || !historialGC || !historialGCP) return;

    const maxK = Math.max(historialGC.length, historialGCP.length);
    let html = '';

    for (let k = 0; k < maxK; k++) {
      const valGC = historialGC[k];
      const valGCP = historialGCP[k];

      const strGC = valGC !== undefined ? valGC.toExponential(4) : '-';
      const strGCP = valGCP !== undefined ? valGCP.toExponential(4) : '-';

      let ventajaStr = '-';
      if (valGC !== undefined && valGCP !== undefined && valGCP > 0) {
        const razon = valGC / valGCP;
        if (razon >= 1) {
          ventajaStr = `<span class="text-emerald-400 font-bold">${razon >= 100 ? razon.toExponential(2) : razon.toFixed(2)}x más preciso</span>`;
        } else {
          ventajaStr = `<span class="text-cyan-300">${razon.toFixed(2)}x</span>`;
        }
      }

      const etiquetaK = k === 0 ? 'k = 0 (x₀)' : `k = ${k}`;
      const highlightRow = (k === maxK - 1)
        ? 'bg-cyan-950/40 font-bold border-t border-cyan-800'
        : 'hover:bg-cyan-950/20';

      html += `
        <tr class="${highlightRow} transition-colors">
          <td class="p-2.5 text-center text-cyan-300 font-mono">${etiquetaK}</td>
          <td class="p-2.5 text-right text-gray-300 font-mono">${strGC}</td>
          <td class="p-2.5 text-right text-emerald-300 font-mono">${strGCP}</td>
          <td class="p-2.5 text-center text-xs font-mono">${ventajaStr}</td>
        </tr>
      `;
    }

    tbody.innerHTML = html;
  }

  /**
   * Ejecuta la demostración opcional con tolerancia estricta (1e-6, 1e-10, 1e-12) en Sección 7.
   * La tolerancia oficial del desafío es 1e-6.
   */
  function actualizarDemostracionTolerancia(A_override, b_override, x0_override, maxIter_override) {
    const selectTol = document.getElementById('select-demo-tol');
    const demoGCIter = document.getElementById('demo-gc-iter');
    const demoGCRes = document.getElementById('demo-gc-res');
    const demoGCBadge = document.getElementById('demo-gc-badge');

    const demoGCPIter = document.getElementById('demo-gcp-iter');
    const demoGCPRes = document.getElementById('demo-gcp-res');
    const demoGCPBadge = document.getElementById('demo-gcp-badge');

    if (!selectTol) return;
    const tolDemo = parseFloat(selectTol.value) || 1e-6;

    let A = A_override;
    let b = b_override;
    let x0 = x0_override;
    let maxIter = maxIter_override || 100;

    if (!A || !b) {
      if (ultimoCalculo && ultimoCalculo.A && ultimoCalculo.b) {
        A = ultimoCalculo.A;
        b = ultimoCalculo.b;
      } else {
        A = leerMatrizA();
        b = leerVectorB();
        x0 = leerVectorX0();
        const p = leerParametros();
        maxIter = p.maxIter;
      }
    }

    if (!A || !b || !window.Solvers) return;

    try {
      const resGC = window.Solvers.solveGC(A, b, x0, tolDemo, maxIter);
      const resGCP = window.Solvers.solveGCP(A, b, x0, tolDemo, maxIter);

      if (demoGCIter) demoGCIter.textContent = `${resGC.iteraciones} it`;
      if (demoGCRes) demoGCRes.textContent = resGC.residuoRelativo.toExponential(4);
      if (demoGCBadge) {
        if (resGC.convergio) {
          demoGCBadge.className = 'text-[10px] px-1.5 py-0.5 rounded font-bold bg-emerald-950 border border-emerald-500 text-emerald-300';
          demoGCBadge.textContent = '✓ CONVERGIÓ';
        } else {
          demoGCBadge.className = 'text-[10px] px-1.5 py-0.5 rounded font-bold bg-rose-950 border border-rose-500 text-rose-300';
          demoGCBadge.textContent = '▲ NO CONVERGIÓ';
        }
      }

      if (demoGCPIter) demoGCPIter.textContent = `${resGCP.iteraciones} it`;
      if (demoGCPRes) demoGCPRes.textContent = resGCP.residuoRelativo.toExponential(4);
      if (demoGCPBadge) {
        if (resGCP.convergio) {
          demoGCPBadge.className = 'text-[10px] px-1.5 py-0.5 rounded font-bold bg-emerald-950 border border-emerald-500 text-emerald-300';
          demoGCPBadge.textContent = '✓ CONVERGIÓ';
        } else {
          demoGCPBadge.className = 'text-[10px] px-1.5 py-0.5 rounded font-bold bg-rose-950 border border-rose-500 text-rose-300';
          demoGCPBadge.textContent = '▲ NO CONVERGIÓ';
        }
      }
    } catch (e) {
      console.warn("Aviso en demo de tolerancia:", e);
    }
  }

  // Estado para el panel de sensibilidad
  let estadoSensibilidad = { deltaPct: 0, target: '0' };
  let ultimoCalculo = null;

  function ejecutarCalculo(nombreEscenario = 'Personalizado') {
    if (!window.LinAlg || !window.Solvers) return;

    // 0. Validar Entradas Exhaustivamente
    const val = validarEntradas();

    if (!val.valido) {
      limpiarTodosLosResaltados();
      if (val.celdas && val.celdas.length > 0) {
        val.celdas.forEach(id => resaltarCelda(id, val.error));
      }
      mostrarToast(val.error, 'error', 6500);
      marcarResultadosObsoletos(val.error);

      // Si tenemos A numérico parcial (ej. asimétrica o no SPD), actualizar diagnóstico para reflejarlo
      if (val.A) {
        actualizarDiagnosticoSeccion3(val.A, nombreEscenario + ' [INVÁLIDO]');
      } else {
        resetearDiagnosticoInvalido();
      }
      // Actualizar la tabla comparativa multiescenario para que aplique el bloque de respaldo y muestre el aviso
      actualizarComparativaTresEscenarios();
      return;
    }

    // Si es válido, limpiar resaltados y banderas de obsolescencia
    limpiarTodosLosResaltados();
    restaurarResultadosValidos();

    const A = val.A;
    const b = val.b;
    const x0 = val.x0;
    const params = val.params;

    // 1. Actualizar Diagnóstico de Sección 3
    actualizarDiagnosticoSeccion3(A, nombreEscenario);

    // 2. Ejecutar Cholesky (Solución exacta de referencia)
    let xRef, L, normResRef;
    try {
      xRef = window.LinAlg.solveCholesky(A, b);
      L = window.LinAlg.cholesky(A);

      // Cálculo del residuo de Cholesky ‖Ax - b‖₂
      const AxRef = window.LinAlg.matVec(A, xRef);
      const diffRef = [];
      for (let i = 0; i < b.length; i++) {
        diffRef.push(AxRef[i] - b[i]);
      }
      normResRef = window.LinAlg.norm2(diffRef);
    } catch (choleskyError) {
      console.warn("Fallo capturado en solveCholesky:", choleskyError);
      
      const match = choleskyError.message.match(/\[(\d+),\s*(\d+)\]/);
      if (match) {
        const row = parseInt(match[1], 10) - 1;
        const col = parseInt(match[2], 10) - 1;
        if (row >= 0 && row < 4 && col >= 0 && col < 4) {
          resaltarCelda(`mat-a-${row}-${col}`, choleskyError.message);
        }
      }

      mostrarToast(`Error en Cholesky: ${choleskyError.message}`, 'error', 6500);
      marcarResultadosObsoletos(choleskyError.message);
      return;
    }

    try {
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
              <td class="p-2.5">${renderActivoWidget(idx, 'pequeno', { mostrarNombre: false })}</td>
              <td class="p-2.5 text-gray-300 font-sans">${ACTIVOS[idx].nombre}</td>
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

      // 5.1. Actualizar Sección 7: Tabla de Residuo Relativo por Iteración
      actualizarTablaResiduosPorIteracion(resGC.historial, resGCP.historial);

      // 5.2. Actualizar Sección 7: Demostración con Tolerancia Estricta
      actualizarDemostracionTolerancia(A, b, params.x0, params.maxIter);

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
      mostrarToast(`Aviso en cálculo numérico: ${error.message}`, 'error', 6500);
      marcarResultadosObsoletos(error.message);
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
          <td class="p-2.5">${renderActivoWidget(idx, 'pequeno', { mostrarNombre: false })}</td>
          <td class="p-2.5 text-gray-300 font-sans">${ACTIVOS[idx].nombre}</td>
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
        const esEditado = datosEditadosManualmente && (esc.id === escenarioSeleccionadoId);
        let A = esc.A;
        let b = esc.b;
        if (esEditado) {
          try {
            const A_edit = leerMatrizA();
            const b_edit = leerVectorB();
            if (A_edit && A_edit.length === 4 && b_edit && b_edit.length === 4) {
              A = A_edit;
              b = b_edit;
            }
          } catch (e) {
            console.warn("No se pudo leer matriz editada:", e);
          }
        }
        let xRef, resGC, resGCP, kappaA, kappaM, normEa, Ep, wPct;
        let usoRespaldo = false;
        try {
          xRef = window.LinAlg.solveCholesky(A, b);
          resGC = window.Solvers.solveGC(A, b, [0, 0, 0, 0], 1e-6, 100);
          resGCP = window.Solvers.solveGCP(A, b, [0, 0, 0, 0], 1e-6, 100);

          const EaVec = xRef.map((v, i) => Math.abs(v - resGCP.x[i]));
          normEa = window.LinAlg.norm2(EaVec);
          const normXRef = window.LinAlg.norm2(xRef);
          Ep = normXRef > 0 ? (normEa / normXRef) * 100 : 0;

          kappaA = window.LinAlg.condNumber(A);
          kappaM = window.Solvers.condPrecond(A);

          const sumX = xRef.reduce((acc, v) => acc + v, 0);
          wPct = xRef.map(v => (sumX !== 0 ? (v / sumX) * 100 : 0));
        } catch (err) {
          console.warn('Error resolviendo escenario en comparativa:', esc.id, err);
          usoRespaldo = true;
          const A_orig = esc.A;
          const b_orig = esc.b;
          xRef = window.LinAlg.solveCholesky(A_orig, b_orig);
          resGC = window.Solvers.solveGC(A_orig, b_orig, [0, 0, 0, 0], 1e-6, 100);
          resGCP = window.Solvers.solveGCP(A_orig, b_orig, [0, 0, 0, 0], 1e-6, 100);
          const EaVec = xRef.map((v, i) => Math.abs(v - resGCP.x[i]));
          normEa = window.LinAlg.norm2(EaVec);
          const normXRef = window.LinAlg.norm2(xRef);
          Ep = normXRef > 0 ? (normEa / normXRef) * 100 : 0;
          kappaA = window.LinAlg.condNumber(A_orig);
          kappaM = window.Solvers.condPrecond(A_orig);
          const sumX = xRef.reduce((acc, v) => acc + v, 0);
          wPct = xRef.map(v => (sumX !== 0 ? (v / sumX) * 100 : 0));
        }

        function clasificarAsignacion(pct) {
          if (pct < 0) return `posición corta (${pct.toFixed(1)}%)`;
          if (pct > 50) return `alta asignación (${pct.toFixed(1)}%)`;
          if (pct >= 20) return `asignación moderada (${pct.toFixed(1)}%)`;
          return `posición larga (${pct.toFixed(1)}%)`;
        }

        const tickers = ['AAPL', 'MSFT', 'GOOGL', 'AMZN'];
        const pesosDescs = wPct.map((p, i) => `${tickers[i]}: ${clasificarAsignacion(p)}`).join(', ');

        let interpretacion = "";
        if (index === 0) {
          interpretacion = `Cartera óptima en mercado normal (κ(A) = ${kappaA.toFixed(2)}, κ(M⁻¹A) = ${kappaM.toFixed(2)}): ambos solvers convergen en ${resGCP.iteraciones} iteraciones con residuo final de ${resGC.residuoRelativo.toExponential(2)} (GC) y ${resGCP.residuoRelativo.toExponential(2)} (GCP). Distribución de pesos: ${pesosDescs}.`;
        } else if (index === 1) {
          interpretacion = `Shock de contagio y contracción asimétrica (κ(A) = ${kappaA.toFixed(2)}, κ(M⁻¹A) = ${kappaM.toFixed(2)}): ambos solvers convergen en ${resGCP.iteraciones} iteraciones con residuo final de ${resGC.residuoRelativo.toExponential(2)} (GC) y ${resGCP.residuoRelativo.toExponential(2)} (GCP). Distribución de pesos: ${pesosDescs}. En este escenario, el modelo concentra la cartera en los activos con menor recorte de retorno esperado (AAPL y MSFT, -30%) y toma posiciones cortas en los de mayor recorte (GOOGL y AMZN, -50%); es consecuencia de los supuestos del escenario, no una predicción de mercado.`;
        } else {
          interpretacion = `Desbalance extremo de escala en el activo GOOGL. Con tol = 1e-6 ambos convergen en ${resGC.iteraciones} iteraciones (GC) y ${resGCP.iteraciones} iteraciones (GCP); el menor residuo de GCP (${resGCP.residuoRelativo.toExponential(2)} vs ${resGC.residuoRelativo.toExponential(2)}) es atribuible a que el redondeo se amplifica con κ(A) ≈ ${kappaA.toFixed(2)}, mientras que κ(M⁻¹A) ≈ ${kappaM.toFixed(2)}. Distribución de pesos: ${pesosDescs}.`;
        }

        if (usoRespaldo) {
          interpretacion += " (aviso: la matriz editada no es definida positiva; se muestran los valores de respaldo del escenario)";
        } else if (esEditado) {
          interpretacion += " (valores recalculados con los datos actuales)";
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
          interpretacion,
          usoRespaldo
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
            ${resultados[0].usoRespaldo ? '<span class="px-2 py-0.5 rounded text-[10px] bg-amber-950 text-amber-300 border border-amber-500 font-bold">▲ RESPALDO (NO SPD)</span>' : (resultados[0].resGCP.convergio ? '<span class="px-2 py-0.5 rounded text-[10px] bg-emerald-950 text-emerald-300 border border-emerald-500 font-bold">✓ SÍ</span>' : '<span class="px-2 py-0.5 rounded text-[10px] bg-rose-950 text-rose-300 border border-rose-500 font-bold">✗ NO</span>')}
          </td>
          <td class="p-2.5 text-center border-l border-cyan-900">
            ${resultados[1].usoRespaldo ? '<span class="px-2 py-0.5 rounded text-[10px] bg-amber-950 text-amber-300 border border-amber-500 font-bold">▲ RESPALDO (NO SPD)</span>' : (resultados[1].resGCP.convergio ? '<span class="px-2 py-0.5 rounded text-[10px] bg-emerald-950 text-emerald-300 border border-emerald-500 font-bold">✓ SÍ</span>' : '<span class="px-2 py-0.5 rounded text-[10px] bg-rose-950 text-rose-300 border border-rose-500 font-bold">✗ NO</span>')}
          </td>
          <td class="p-2.5 text-center border-l border-cyan-900">
            ${resultados[2].usoRespaldo ? '<span class="px-2 py-0.5 rounded text-[10px] bg-amber-950 text-amber-300 border border-amber-500 font-bold">▲ RESPALDO (NO SPD)</span>' : (resultados[2].resGCP.convergio ? '<span class="px-2 py-0.5 rounded text-[10px] bg-emerald-950 text-emerald-300 border border-emerald-500 font-bold">✓ SÍ</span>' : '<span class="px-2 py-0.5 rounded text-[10px] bg-rose-950 text-rose-300 border border-rose-500 font-bold">✗ NO</span>')}
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
          ${ACTIVOS.map((a, idx) => `<th class="p-2 border border-cyan-900/60 font-bold"><div class="flex justify-center">${renderActivoWidget(idx, 'pequeno', { mostrarNombre: false })}</div></th>`).join('')}
        </tr>
      </thead>
      <tbody>
    `;

    // Filas
    for (let i = 0; i < n; i++) {
      tableHtml += `
        <tr class="hover:bg-cyan-950/20">
          <td class="p-2 bg-cyan-950/30 border border-cyan-900/60 font-bold text-cyan-300">${renderActivoWidget(i, "pequeno", { mostrarNombre: false })}</td>
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
        Al ser todas las correlaciones estrictamente menores a 1.0 (<span class="text-cyan-200 font-mono">Rᵢⱼ < 1</span>), 
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
            ${renderActivoWidget(i, 'pequeno', { mostrarNombre: true })}
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
    datosEditadosManualmente = true;
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
      datosEditadosManualmente = true;
      ejecutarCalculo('Personalizado');
      if (calcStatusMsg) {
        calcStatusMsg.innerHTML = `<span class="text-emerald-400">✓ Cálculo completado:</span> Solución de referencia y comparativa actualizadas.`;
      }
    });
  }

  if (btnRecalcularDiag) {
    btnRecalcularDiag.addEventListener('click', () => {
      ejecutarCalculo('Personalizado');
      actualizarTablaComparativaSeccion3(cacheEscenariosData || DATOS_ESCENARIOS_RESPALDO.escenarios);
    actualizarTablaResumenSeccion10(cacheEscenariosData || DATOS_ESCENARIOS_RESPALDO.escenarios);
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

  // Listener para el selector de demostración con tolerancia estricta (Sección 7)
  const selectDemoTol = document.getElementById('select-demo-tol');
  if (selectDemoTol) {
    selectDemoTol.addEventListener('change', () => {
      actualizarDemostracionTolerancia();
    });
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

  // Inicializar tarjetas y tabla comparativa de Sección 3 con respaldo inmediato
  actualizarTarjetasEscenarios(DATOS_ESCENARIOS_RESPALDO.escenarios);
  actualizarTablaComparativaSeccion3(DATOS_ESCENARIOS_RESPALDO.escenarios);
    actualizarTablaResumenSeccion10(DATOS_ESCENARIOS_RESPALDO.escenarios);

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
    actualizarPanelSensibilidad,
    mostrarToast,
    limpiarToasts,
    validarEntradas,
    resaltarCelda,
    limpiarTodosLosResaltados,
    marcarResultadosObsoletos,
    restaurarResultadosValidos
  };

  // Iniciar en la sección solicitada por query param / hash o en Sección 1: Inicio
  const urlParams = new URLSearchParams(window.location.search);
  const targetInicial = urlParams.get('sec') || (window.location.hash || '').replace('#', '');
  if (targetInicial && document.getElementById(targetInicial)) {
    navigateTo(targetInicial);
  } else {
    navigateTo('sec-inicio');
  }
});
