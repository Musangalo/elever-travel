// ============================================
// MAIN APPLICATION - LOADS PAGES DYNAMICALLY
// ============================================

// Cache for loaded pages
const pageCache = {};

// Function to load a page
async function loadPage(pageName) {
  const container = document.getElementById('pageContainer');

  // Check if page is cached
  if (pageCache[pageName]) {
    container.innerHTML = pageCache[pageName];
    return;
  }

  try {
    const response = await fetch(`pages/${pageName}.html`);
    if (!response.ok) throw new Error('Page not found');
    const html = await response.text();
    pageCache[pageName] = html;
    container.innerHTML = html;
  } catch (error) {
    console.error('Error loading page:', error);
    container.innerHTML = `
      <div style="padding: 8rem 2rem; text-align: center; color: var(--text-muted);">
        <p style="font-size: 1.2rem; margin-bottom: 1rem;">⚠️ Error loading page</p>
        <p style="font-size: 0.9rem;">Please make sure the <strong>pages/</strong> folder exists and contains ${pageName}.html</p>
        <p style="font-size: 0.85rem; margin-top: 0.5rem; color: var(--gold);">Tip: Try running with Live Server</p>
      </div>
    `;
  }
}

// Show page function
window.showPage = async function (page) {
  // Update active state on nav links using data-page, not link text
  // (matching link text broke for the "Plan My Trip" contact CTA)
  document.querySelectorAll('.nav-links a[data-page]').forEach(link => {
    link.classList.toggle('active', link.dataset.page === page);
  });

  await loadPage(page);
  window.scrollTo({ top: 0, behavior: 'smooth' });
  window.location.hash = page;
};

// Navigation helper
window.navTo = function (page) {
  closeMobileMenu();
  setTimeout(() => showPage(page), 200);
};

// Mobile menu functions
function closeMobileMenu() {
  const mobileMenu = document.getElementById('mobileMenu');
  const hamburger = document.getElementById('hamburger');
  mobileMenu.classList.remove('open');
  hamburger.classList.remove('open');
  hamburger.setAttribute('aria-expanded', 'false');
  document.body.style.overflow = '';
}

// Setup mobile menu
document.addEventListener('DOMContentLoaded', function () {
  const hamburger = document.getElementById('hamburger');
  const mobileMenu = document.getElementById('mobileMenu');

  hamburger.addEventListener('click', function () {
    const isOpen = mobileMenu.classList.contains('open');
    mobileMenu.classList.toggle('open');
    hamburger.classList.toggle('open');
    hamburger.setAttribute('aria-expanded', !isOpen);
    document.body.style.overflow = isOpen ? '' : 'hidden';
  });

  // Close on escape key
  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape' && mobileMenu.classList.contains('open')) {
      closeMobileMenu();
    }
  });

  // Keep hamburger/menu state in sync if the viewport crosses the
  // desktop breakpoint while the menu is open (e.g. device rotation,
  // window resize) -- CSS also force-hides the menu above 900px as a
  // second line of defense, but this keeps the hamburger icon and
  // aria-expanded state consistent too.
  window.addEventListener('resize', function () {
    if (window.innerWidth > 900 && mobileMenu.classList.contains('open')) {
      closeMobileMenu();
    }
  });
});

// Scroll effects
window.addEventListener('scroll', function () {
  const nav = document.getElementById('mainNav');
  const planFloat = document.getElementById('planFloat');
  const backToTop = document.getElementById('backToTop');
  const scrollY = window.scrollY;

  nav.classList.toggle('scrolled', scrollY > 80);

  if (planFloat) {
    planFloat.classList.toggle('visible', scrollY > 80);
  }

  if (backToTop) {
    backToTop.classList.toggle('visible', scrollY > 400);
  }
});

// Form submission function
window.submitForm = function () {
  // Get form values
  const fname = document.getElementById('fname').value.trim();
  const lname = document.getElementById('lname').value.trim();
  const email = document.getElementById('email').value.trim();
  const travelType = document.getElementById('travelType').value;

  // Honeypot - hidden field only bots fill in. If it has a value, silently
  // pretend to succeed instead of submitting.
  const honeypot = document.getElementById('company');
  if (honeypot && honeypot.value.trim() !== '') {
    document.getElementById('formContent').style.display = 'none';
    document.getElementById('formSuccess').style.display = 'block';
    return;
  }

  // Clear previous errors
  document.querySelectorAll('.field-error').forEach(e => e.classList.remove('show'));
  document.querySelectorAll('.form-group input, .form-group select').forEach(el => el.classList.remove('error'));

  let valid = true;

  if (!fname) {
    document.getElementById('fname').classList.add('error');
    document.getElementById('fname-error').classList.add('show');
    valid = false;
  }
  if (!lname) {
    document.getElementById('lname').classList.add('error');
    document.getElementById('lname-error').classList.add('show');
    valid = false;
  }
  if (!email || !email.includes('@') || !email.includes('.')) {
    document.getElementById('email').classList.add('error');
    document.getElementById('email-error').classList.add('show');
    valid = false;
  }
  if (!travelType) {
    document.getElementById('travelType').classList.add('error');
    document.getElementById('travelType-error').classList.add('show');
    valid = false;
  }

  if (!valid) {
    document.querySelector('.error')?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    return;
  }

  const btn = document.getElementById('submitBtn');
  btn.textContent = 'Sending…';
  btn.disabled = true;

  // Build form data
  const formData = {
    name: `${fname} ${lname}`,
    email: email,
    phone: document.getElementById('phone').value || 'Not provided',
    country: document.getElementById('country').value || 'Not provided',
    travel_type: travelType,
    destination: document.getElementById('destination').value || 'Not specified',
    travel_dates: `${document.getElementById('dateFrom').value || 'TBD'} to ${document.getElementById('dateTo').value || 'TBD'}`,
    travellers: document.getElementById('travellers').value || 'Not specified',
    message: document.getElementById('message').value || 'None provided',
    _subject: `New Travel Enquiry — ${fname} ${lname} (${travelType})`
  };

  // Send to Formspree
  fetch('https://formspree.io/f/mdajrpny', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
    body: JSON.stringify(formData)
  })
    .then(response => {
      if (response.ok) {
        document.getElementById('confirmEmail').textContent = email;
        document.getElementById('formContent').style.display = 'none';
        document.getElementById('formSuccess').style.display = 'block';
        document.getElementById('formSuccess').scrollIntoView({ behavior: 'smooth', block: 'start' });
      } else {
        btn.textContent = "Send Enquiry — We'll Respond Within 24 Hours";
        btn.disabled = false;
        alert('Something went wrong. Please try again or WhatsApp us directly at +256 200 924 856.');
      }
    })
    .catch(() => {
      btn.textContent = "Send Enquiry — We'll Respond Within 24 Hours";
      btn.disabled = false;
      alert('Network error. Please check your connection and try again.');
    });
};

// Load home page on startup
document.addEventListener('DOMContentLoaded', function () {
  // Check if there's a hash in the URL
  const hash = window.location.hash.replace('#', '');
  const page = hash && ['home', 'about', 'services', 'destinations', 'packages', 'contact'].includes(hash)
    ? hash
    : 'home';

  showPage(page);
});

// ============================================
// SERVICE DETAIL FUNCTIONS
// ============================================

// Show service detail view
window.showServiceDetail = function (serviceId) {
  const servicesGrid = document.querySelector('.services-grid');
  const serviceDetail = document.getElementById('serviceDetail');
  const detailContent = document.getElementById('serviceDetailContent');

  // Hide services grid
  if (servicesGrid) servicesGrid.style.display = 'none';

  // Get the detail template
  const template = document.getElementById(`detail-${serviceId}`);
  if (template) {
    detailContent.innerHTML = template.innerHTML;
    serviceDetail.style.display = 'block';

    // Scroll to detail view
    serviceDetail.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }
};

// Close service detail view
window.closeServiceDetail = function () {
  const servicesGrid = document.querySelector('.services-grid');
  const serviceDetail = document.getElementById('serviceDetail');

  // Show services grid
  if (servicesGrid) servicesGrid.style.display = 'grid';

  // Hide detail view
  serviceDetail.style.display = 'none';

  // Scroll back to top of services
  document.querySelector('.section-eyebrow')?.scrollIntoView({ behavior: 'smooth' });
};

// ============================================
// GO TO SERVICE FUNCTION (For Footer Links)
// ============================================

// Go to a specific service on the Services page
window.goToService = async function (serviceId) {
  // First navigate to the services page
  await showPage('services');

  // Wait for the page to load and render
  setTimeout(() => {
    // Find all service cards
    const serviceCards = document.querySelectorAll('.service-card.clickable');

    // Map service IDs to their card indices
    const serviceMap = {
      'visa': 0,           // Visa Planning & Consultation
      'documentation': 1,   // Visa Documentation
      'hotel': 2,          // Hotel & Resort Booking
      'transfers': 3,      // Airport Transfers
      'flights': 4,        // Flight Ticketing
      'uganda': 5,         // Uganda Local Tours
      'international': 6,  // International Tours
      'events': 7,         // Event & Group Travel
      'restaurants': 8     // Restaurant Reservations
    };

    const index = serviceMap[serviceId];

    if (index !== undefined && serviceCards[index]) {
      // Scroll to the service card
      serviceCards[index].scrollIntoView({ behavior: 'smooth', block: 'center' });

      // Highlight the card with a gold border
      serviceCards[index].style.border = '2px solid var(--gold)';
      serviceCards[index].style.transition = 'border 0.3s, background 0.3s';
      serviceCards[index].style.background = 'var(--dark-3)';

      // Remove highlight after 3 seconds
      setTimeout(() => {
        serviceCards[index].style.border = '1px solid rgba(201,168,76,0.12)';
        serviceCards[index].style.background = '';
      }, 3000);
    } else {
      // If card not found, just scroll to top of services
      document.querySelector('.section-eyebrow')?.scrollIntoView({ behavior: 'smooth' });
    }
  }, 500); // Wait for page to load
};

// ============================================
// DESTINATION DETAIL FUNCTIONS
// ============================================

// Show destination detail view
window.showDestinationDetail = function (destinationId) {
  const destDetail = document.getElementById('destinationDetail');
  const detailContent = document.getElementById('destinationDetailContent');

  // Hide all destination grids
  document.querySelectorAll('.dest-grid').forEach(grid => {
    grid.style.display = 'none';
  });

  // Get the detail template
  const template = document.getElementById(`detail-${destinationId}`);
  if (template) {
    detailContent.innerHTML = template.innerHTML;
    destDetail.style.display = 'block';

    // Scroll to detail view
    destDetail.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }
};

// Close destination detail view
window.closeDestinationDetail = function () {
  const destDetail = document.getElementById('destinationDetail');

  // Show all destination grids
  document.querySelectorAll('.dest-grid').forEach(grid => {
    grid.style.display = 'grid';
  });

  // Hide detail view
  destDetail.style.display = 'none';

  // Scroll back to top of destinations
  document.querySelector('.dest-hero')?.scrollIntoView({ behavior: 'smooth' });
};

// ============================================
// THEME TOGGLE (dark default, light optional)
// ============================================
(function () {
  function applyTheme(theme) {
    if (theme === 'light') {
      document.documentElement.setAttribute('data-theme', 'light');
    } else {
      document.documentElement.setAttribute('data-theme', 'dark');
    }
    const label = document.getElementById('themeLabel');
    if (label) label.textContent = theme === 'light' ? 'Light' : 'Dark';
  }

  // Apply saved preference (or default to dark) as early as possible
  const saved = localStorage.getItem('elever-theme') || 'dark';
  applyTheme(saved);

  document.addEventListener('DOMContentLoaded', function () {
    const toggle = document.getElementById('themeToggle');
    if (!toggle) return;
    toggle.addEventListener('click', function () {
      const current = document.documentElement.getAttribute('data-theme') === 'light' ? 'light' : 'dark';
      const next = current === 'light' ? 'dark' : 'light';
      localStorage.setItem('elever-theme', next);
      applyTheme(next);
    });
  });
})();
