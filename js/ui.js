/**
 * ui.js - Control de navegación y presentación de interfaz
 * DAT-242 Métodos Numéricos (UMSA)
 */

document.addEventListener('DOMContentLoaded', () => {
  const navButtons = document.querySelectorAll('.nav-btn');
  const sections = document.querySelectorAll('.content-section');
  const mobileMenuBtn = document.getElementById('mobile-menu-btn');
  const mobileNav = document.getElementById('mobile-nav');

  /**
   * Muestra la sección deseada y oculta las demás.
   * @param {string} targetId - ID de la sección objetivo.
   */
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

    // Cerrar menú móvil si está abierto
    if (mobileNav && !mobileNav.classList.contains('hidden')) {
      mobileNav.classList.add('hidden');
    }

    // Desplazar suavemente arriba
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  // Event listeners para los botones de navegación (desktop y mobile)
  navButtons.forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.preventDefault();
      const target = btn.getAttribute('data-target');
      if (target) {
        navigateTo(target);
      }
    });
  });

  // Toggle menú móvil
  if (mobileMenuBtn && mobileNav) {
    mobileMenuBtn.addEventListener('click', () => {
      mobileNav.classList.toggle('hidden');
    });
  }

  // Inicializar en la sección Inicio
  navigateTo('sec-inicio');
});

