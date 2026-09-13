// ============================================
// MAIN APPLICATION - LOADS PAGES DYNAMICALLY
// ============================================

// Cache for loaded pages
const pageCache = {};

// ============================================
// PER-PAGE SEO / SOCIAL METADATA
// Keeps the tab title, meta description, canonical
// link and Open Graph tags in sync with whichever
// page is currently shown, instead of every route
// serving the homepage's title/description. Note:
// this only helps real browsers and JS-executing
// crawlers -- bots that unfurl links for chat apps
// (WhatsApp, iMessage, etc.) read the raw HTML
// without running JS, so a shared "#services" link
// will still show the homepage's card. Fixing that
// fully would need each route served as its own
// static document rather than a client-side fetch.
// ============================================
const PAGE_META = {
  home: {
    title: 'Elever Travel Management Limited | Luxury Travel Agency — Kampala, Uganda',
    description: "Elever Travel Management Limited — Uganda's premier luxury travel agency. Bespoke safaris, honeymoons, business travel, visa guidance & worldwide tours. Based in Kampala."
  },
  about: {
    title: 'About Us | Elever Travel Management Limited',
    description: "The story behind Elever Travel Management Limited — a Kampala-based luxury travel agency crafting bespoke safaris, honeymoons and worldwide journeys with local expertise and personal care."
  },
  services: {
    title: 'Our Services | Elever Travel Management Limited',
    description: "Visa guidance, flight ticketing, hotel booking, airport transfers and more — explore the full range of travel services offered by Elever Travel Management Limited."
  },
  destinations: {
    title: 'Destinations | Elever Travel Management Limited',
    description: "From gorilla trekking in Bwindi to safaris across Uganda's national parks and worldwide getaways — explore the destinations curated by Elever Travel Management Limited."
  },
  packages: {
    title: 'Travel Packages | Elever Travel Management Limited',
    description: "Browse curated safari, honeymoon and holiday packages from Elever Travel Management Limited — Uganda's premier luxury travel agency."
  },
  contact: {
    title: 'Plan Your Trip | Elever Travel Management Limited',
    description: "Get in touch with Elever Travel Management Limited to start planning your journey. Our travel specialists respond within 24 hours with a tailored proposal."
  },
  blog: {
    title: 'Travel Advisories | Elever Travel Management Limited',
    description: "Entry requirements, health & safety notes, and seasonal travel tips from Elever Travel Management Limited."
  }
};

// Update the tab title, meta description, canonical link and
// Open Graph/Twitter tags to match the page being shown.
function updatePageMeta(page) {
  const meta = PAGE_META[page] || PAGE_META.home;
  const pageUrl = `https://elevertravel.com/${page === 'home' ? '' : '#' + page}`;

  document.title = meta.title;

  const descTag = document.getElementById('metaDescription');
  if (descTag) descTag.setAttribute('content', meta.description);

  const ogTitle = document.getElementById('ogTitle');
  if (ogTitle) ogTitle.setAttribute('content', meta.title);

  const ogDescription = document.getElementById('ogDescription');
  if (ogDescription) ogDescription.setAttribute('content', meta.description);

  const ogUrl = document.getElementById('ogUrl');
  if (ogUrl) ogUrl.setAttribute('content', pageUrl);

  const canonicalLink = document.getElementById('canonicalLink');
  if (canonicalLink) canonicalLink.setAttribute('href', pageUrl);
}

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
  updatePageMeta(page);
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
  const backToTop = document.getElementById('backToTop');
  const scrollY = window.scrollY;

  nav.classList.toggle('scrolled', scrollY > 80);

  if (backToTop) {
    backToTop.classList.toggle('visible', scrollY > 400);
  }
});

// ============================================
// CONTACT PAGE TABS
// Trip enquiries and airport transfer requests are two
// separate forms (different fields, different Formspree
// subject) shown one at a time via tabs, rather than one
// form whose fields change depending on a dropdown value.
// ============================================
window.switchContactTab = function (tab) {
  const isTransfer = tab === 'transfer';
  document.getElementById('tripFormContent').style.display = isTransfer ? 'none' : '';
  document.getElementById('transferFormContent').style.display = isTransfer ? '' : 'none';
  document.getElementById('tabTrip').classList.toggle('active', !isTransfer);
  document.getElementById('tabTransfer').classList.toggle('active', isTransfer);
  document.getElementById('tabTrip').setAttribute('aria-selected', String(!isTransfer));
  document.getElementById('tabTransfer').setAttribute('aria-selected', String(isTransfer));
  // Submitting one form and going back never leaves the other stuck on
  // its success screen.
  document.getElementById('formSuccess').style.display = 'none';
};

// Navigate to the Contact page with the Airport Transfer tab already
// selected -- used by "Arrange Transfer" buttons elsewhere on the site,
// so people don't land on the general trip form and have to hunt for it.
// The tab switcher itself only appears here: a general enquiry (a Uganda
// trip, any other service) never needs to see it, since there's nothing
// to switch between -- it's the trip form only.
window.goToTransferForm = async function () {
  await showPage('contact');
  document.querySelector('.form-tabs')?.classList.add('visible');
  switchContactTab('transfer');
  document.querySelector('.form-card')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
};

// Trip enquiry form submission
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
    document.getElementById('tripFormContent').style.display = 'none';
    document.getElementById('formSuccess').style.display = 'block';
    return;
  }

  // Clear previous errors
  document.querySelectorAll('#tripFormContent .field-error').forEach(e => e.classList.remove('show'));
  document.querySelectorAll('#tripFormContent .form-group input, #tripFormContent .form-group select').forEach(el => el.classList.remove('error'));

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
    document.querySelector('#tripFormContent .error')?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    return;
  }

  const btn = document.getElementById('submitBtn');
  btn.textContent = 'Sending…';
  btn.disabled = true;

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
        document.getElementById('formSuccessTitle').textContent = 'Enquiry Received!';
        document.getElementById('formSuccessBody').innerHTML = `Thank you for reaching out to Elever Travel Management. Our travel specialists have received your enquiry and will respond to you at <strong id="confirmEmail">${email}</strong> within 24 hours with a personalised proposal.`;
        document.getElementById('tripFormContent').style.display = 'none';
        document.getElementById('formSuccess').style.display = 'block';
        document.getElementById('formSuccess').scrollIntoView({ behavior: 'smooth', block: 'start' });
      } else {
        btn.textContent = "Send Enquiry — We'll Respond Within 24 Hours";
        btn.disabled = false;
        alert('Something went wrong. Please try again or WhatsApp us directly at +256 740 748 155.');
      }
    })
    .catch(() => {
      btn.textContent = "Send Enquiry — We'll Respond Within 24 Hours";
      btn.disabled = false;
      alert('Network error. Please check your connection and try again.');
    });
};

// Airport transfer request form submission -- a fully separate form
// from the trip enquiry above: different fields (pickup/drop-off,
// flight info) and its own Formspree subject line.
window.submitTransferForm = function () {
  const fname = document.getElementById('tfname').value.trim();
  const lname = document.getElementById('tlname').value.trim();
  const email = document.getElementById('temail').value.trim();
  const pickup = document.getElementById('pickupLocation').value.trim();
  const dropoff = document.getElementById('dropoffLocation').value.trim();

  // Honeypot
  const honeypot = document.getElementById('companyTransfer');
  if (honeypot && honeypot.value.trim() !== '') {
    document.getElementById('transferFormContent').style.display = 'none';
    document.getElementById('formSuccess').style.display = 'block';
    return;
  }

  document.querySelectorAll('#transferFormContent .field-error').forEach(e => e.classList.remove('show'));
  document.querySelectorAll('#transferFormContent .form-group input, #transferFormContent .form-group select').forEach(el => el.classList.remove('error'));

  let valid = true;

  if (!fname) {
    document.getElementById('tfname').classList.add('error');
    document.getElementById('tfname-error').classList.add('show');
    valid = false;
  }
  if (!lname) {
    document.getElementById('tlname').classList.add('error');
    document.getElementById('tlname-error').classList.add('show');
    valid = false;
  }
  if (!email || !email.includes('@') || !email.includes('.')) {
    document.getElementById('temail').classList.add('error');
    document.getElementById('temail-error').classList.add('show');
    valid = false;
  }
  if (!pickup) {
    document.getElementById('pickupLocation').classList.add('error');
    document.getElementById('pickupLocation-error').classList.add('show');
    valid = false;
  }
  if (!dropoff) {
    document.getElementById('dropoffLocation').classList.add('error');
    document.getElementById('dropoffLocation-error').classList.add('show');
    valid = false;
  }

  if (!valid) {
    document.querySelector('#transferFormContent .error')?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    return;
  }

  const btn = document.getElementById('submitTransferBtn');
  btn.textContent = 'Sending…';
  btn.disabled = true;

  const formData = {
    name: `${fname} ${lname}`,
    email: email,
    phone: document.getElementById('tphone').value || 'Not provided',
    pickup_location: pickup,
    dropoff_location: dropoff,
    flight_number: document.getElementById('flightNumber').value || 'Not provided',
    flight_datetime: document.getElementById('flightDateTime').value || 'Not provided',
    passengers: document.getElementById('passengers').value || 'Not specified',
    luggage: document.getElementById('luggage').value || 'Not specified',
    message: document.getElementById('transferMessage').value || 'None provided',
    _subject: `New Airport Transfer Request — ${fname} ${lname}`
  };

  fetch('https://formspree.io/f/mdajrpny', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
    body: JSON.stringify(formData)
  })
    .then(response => {
      if (response.ok) {
        document.getElementById('formSuccessTitle').textContent = 'Transfer Request Received!';
        document.getElementById('formSuccessBody').innerHTML = `Thank you for your airport transfer request. Our team has received your details and will confirm your driver at <strong id="confirmEmail">${email}</strong> within 24 hours.`;
        document.getElementById('transferFormContent').style.display = 'none';
        document.getElementById('formSuccess').style.display = 'block';
        document.getElementById('formSuccess').scrollIntoView({ behavior: 'smooth', block: 'start' });
      } else {
        btn.textContent = "Request Transfer — We'll Confirm Within 24 Hours";
        btn.disabled = false;
        alert('Something went wrong. Please try again or WhatsApp us directly at +256 740 748 155.');
      }
    })
    .catch(() => {
      btn.textContent = "Request Transfer — We'll Confirm Within 24 Hours";
      btn.disabled = false;
      alert('Network error. Please check your connection and try again.');
    });
};

// Client review submission (about.html) -- posts to the same Formspree
// endpoint as the two forms above, tagged with its own subject line so
// review emails are easy to tell apart from trip/transfer enquiries.
// There's no visitor account and no live database: someone on our team
// reads each submission and manually adds approved ones to the
// testimonial sections, which is what keeps this simple on a static site.
window.submitReview = function () {
  const name = document.getElementById('revName').value.trim();
  const location = document.getElementById('revLocation').value.trim();
  const text = document.getElementById('revText').value.trim();
  const ratingInput = document.querySelector('input[name="rating"]:checked');
  const rating = ratingInput ? ratingInput.value : '';

  // Honeypot
  const honeypot = document.getElementById('companyReview');
  if (honeypot && honeypot.value.trim() !== '') {
    document.getElementById('reviewFormCard').style.display = 'none';
    document.getElementById('reviewFormSuccess').style.display = 'block';
    return;
  }

  document.querySelectorAll('#reviewFormCard .field-error').forEach(e => e.classList.remove('show'));
  document.querySelectorAll('#reviewFormCard .form-group input, #reviewFormCard .form-group textarea').forEach(el => el.classList.remove('error'));

  let valid = true;

  if (!name) {
    document.getElementById('revName').classList.add('error');
    document.getElementById('revName-error').classList.add('show');
    valid = false;
  }
  if (!location) {
    document.getElementById('revLocation').classList.add('error');
    document.getElementById('revLocation-error').classList.add('show');
    valid = false;
  }
  if (!rating) {
    document.getElementById('revRating-error').classList.add('show');
    valid = false;
  }
  if (!text) {
    document.getElementById('revText').classList.add('error');
    document.getElementById('revText-error').classList.add('show');
    valid = false;
  }

  if (!valid) {
    document.querySelector('#reviewFormCard .error, #reviewFormCard .field-error.show')?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    return;
  }

  const btn = document.getElementById('submitReviewBtn');
  btn.textContent = 'Sending…';
  btn.disabled = true;

  const formData = {
    name: name,
    location: location,
    rating: `${rating} out of 5 stars`,
    review: text,
    _subject: `New Review Submission — ${name} (${rating}★)`
  };

  fetch('https://formspree.io/f/mdajrpny', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
    body: JSON.stringify(formData)
  })
    .then(response => {
      if (response.ok) {
        document.getElementById('reviewFormCard').style.display = 'none';
        document.getElementById('reviewFormSuccess').style.display = 'block';
        document.getElementById('reviewFormSuccess').scrollIntoView({ behavior: 'smooth', block: 'start' });
      } else {
        btn.textContent = 'Submit Your Review';
        btn.disabled = false;
        alert('Something went wrong. Please try again or WhatsApp us directly at +256 740 748 155.');
      }
    })
    .catch(() => {
      btn.textContent = 'Submit Your Review';
      btn.disabled = false;
      alert('Network error. Please check your connection and try again.');
    });
};

// Jump straight to the review form on the About page -- used by the
// "Leave a Review" link on the home page testimonials section.
window.goToReviewForm = async function () {
  await showPage('about');
  setTimeout(() => {
    document.getElementById('leaveReview')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }, 50);
};

// Load home page on startup
document.addEventListener('DOMContentLoaded', function () {
  // Check if there's a hash in the URL
  const hash = window.location.hash.replace('#', '');
  const page = hash && ['home', 'about', 'services', 'destinations', 'packages', 'contact', 'blog'].includes(hash)
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
      'visa': 0,            // Visa Planning & Consultation
      'documentation': 1,   // Visa Documentation
      'hotel': 2,           // Hotel & Resort Booking
      'transfers': 3,       // Airport Transfers
      'flights': 4,         // Flight Ticketing
      'insurance': 5,       // Travel Insurance
      'uganda': 6,          // Uganda Local Tours
      'international': 7,   // International Tours
      'advisory': 8,        // Travel Advisory
      'events': 9,          // Event & Group Travel
      'restaurants': 10     // Restaurant Reservations
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

// Go straight to a specific destination's detail view -- used by the nav
// dropdown so people don't have to open Destinations and scroll to find it.
window.goToDestination = async function (destinationId) {
  await showPage('destinations');
  setTimeout(() => showDestinationDetail(destinationId), 50);
};

// Go straight to a specific package, expanding its accordion panel --
// used by the nav dropdown, mirrors goToService/goToDestination above.
window.goToPackage = async function (packageId) {
  await showPage('packages');
  setTimeout(() => {
    const panel = document.getElementById(`pkg-${packageId}`);
    const toggle = panel?.querySelector('.pkg-accordion-toggle');
    if (panel && toggle && !panel.classList.contains('pkg-open')) {
      togglePkgAccordion(toggle);
    } else if (panel) {
      panel.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }, 50);
};

// Expand/collapse a submenu inside the mobile nav (Services, Destinations,
// Packages) -- tapping the chevron toggles it; tapping the label itself
// still navigates straight to the page, same as desktop.
window.toggleMobileSubmenu = function (btn) {
  const item = btn.closest('.mobile-menu-item');
  const submenu = item?.querySelector('.mobile-submenu');
  if (!submenu) return;
  const isOpen = submenu.classList.contains('open');

  // Close any other open submenu so only one is expanded at a time
  document.querySelectorAll('.mobile-submenu.open').forEach(el => {
    if (el !== submenu) {
      el.classList.remove('open');
      el.previousElementSibling?.querySelector('.mobile-submenu-toggle')?.classList.remove('open');
    }
  });

  submenu.classList.toggle('open', !isOpen);
  btn.classList.toggle('open', !isOpen);
  btn.setAttribute('aria-expanded', String(!isOpen));
};

// Mobile submenu links close the mobile menu, then run the same
// goTo* navigation the desktop dropdown uses.
window.mobileGoTo = function (fn, ...args) {
  closeMobileMenu();
  setTimeout(() => window[fn](...args), 200);
};

// ============================================
// THEME TOGGLE (light default, dark optional)
// ============================================
(function () {
  function applyTheme(theme) {
    if (theme === 'dark') {
      document.documentElement.setAttribute('data-theme', 'dark');
    } else {
      document.documentElement.setAttribute('data-theme', 'light');
    }
    const label = document.getElementById('themeLabel');
    if (label) label.textContent = theme === 'light' ? 'Light' : 'Dark';
  }

  // Apply saved preference (or default to light) as early as possible --
  // must match the inline <head> script in index.html that runs before
  // first paint, or the two can disagree and flash/fight each other.
  const saved = localStorage.getItem('elever-theme') || 'light';
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

// ============================================
// PHOTO GALLERY LIGHTBOX
// ============================================
(function () {
  let items = [];
  let currentIndex = 0;

  function refreshItems() {
    items = Array.from(document.querySelectorAll('.photo-gallery-item'));
  }

  function show(index) {
    if (!items.length) return;
    currentIndex = (index + items.length) % items.length;
    const el = items[currentIndex];
    const img = document.getElementById('lightboxImg');
    const caption = document.getElementById('lightboxCaption');
    if (!img || !caption) return;
    img.src = el.getAttribute('data-full');
    img.alt = el.getAttribute('data-caption') || '';
    caption.textContent = el.getAttribute('data-caption') || '';
  }

  window.openLightbox = function (el) {
    refreshItems();
    const index = items.indexOf(el);
    const lightbox = document.getElementById('lightbox');
    if (!lightbox) return;
    show(index === -1 ? 0 : index);
    lightbox.style.display = 'flex';
    document.body.style.overflow = 'hidden';
  };

  window.closeLightbox = function () {
    const lightbox = document.getElementById('lightbox');
    if (!lightbox) return;
    lightbox.style.display = 'none';
    document.body.style.overflow = '';
  };

  window.closeLightboxOnBackdrop = function (event) {
    if (event.target && event.target.id === 'lightbox') {
      window.closeLightbox();
    }
  };

  window.lightboxNav = function (direction) {
    show(currentIndex + direction);
  };

  document.addEventListener('keydown', function (e) {
    const lightbox = document.getElementById('lightbox');
    if (!lightbox || lightbox.style.display !== 'flex') return;
    if (e.key === 'Escape') window.closeLightbox();
    if (e.key === 'ArrowLeft') window.lightboxNav(-1);
    if (e.key === 'ArrowRight') window.lightboxNav(1);
  });
})();

// ============================================
// PACKAGES PAGE ACCORDION
// ============================================
// Only one package is expanded at a time -- clicking a header opens that
// package (scrolling its header into view since the page height changes)
// and closes whichever one was open before, instead of everyone having to
// scroll past every package to reach the ones further down the page.
window.togglePkgAccordion = function (btn) {
  const panel = btn.closest('.pkg-full');
  if (!panel) return;
  const wasOpen = panel.classList.contains('pkg-open');

  document.querySelectorAll('.pkg-full.pkg-accordion.pkg-open').forEach(function (el) {
    el.classList.remove('pkg-open');
    const toggle = el.querySelector('.pkg-accordion-toggle');
    if (toggle) toggle.setAttribute('aria-expanded', 'false');
  });

  if (!wasOpen) {
    panel.classList.add('pkg-open');
    btn.setAttribute('aria-expanded', 'true');
    panel.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }
};
