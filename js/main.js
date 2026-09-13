// ============================================
// MAIN APPLICATION
// ============================================
// Each route (index.html, about.html, services.html, destinations.html,
// packages.html, contact.html, blog.html) is now its own real, complete
// HTML document -- not a fragment fetched into a shared shell -- so each
// one is independently crawlable and carries its own title/description/
// canonical URL. This file only handles in-page interactivity now; it no
// longer loads page content or rewrites <head> tags at runtime.

// ============================================
// PAGE NAVIGATION (compatibility layer)
// Existing markup across the site calls these as onclick handlers
// (onclick="showPage('contact')", onclick="goToService('visa')", etc).
// Rather than rewrite every one of those call sites, these functions
// still exist -- they just perform a real navigation to the matching
// static page instead of an in-page fetch.
// ============================================
window.showPage = function (page) {
  window.location.href = page === 'home' ? 'index.html' : page + '.html';
};

// Kept for backward compatibility with any lingering onclick="navTo(...)"
// call sites; closes the mobile menu, then navigates for real.
window.navTo = function (page) {
  closeMobileMenu();
  setTimeout(() => showPage(page), 200);
};

window.goToService = function (serviceId) {
  window.location.href = 'services.html#' + serviceId;
};

window.goToDestination = function (destinationId) {
  window.location.href = 'destinations.html#' + destinationId;
};

window.goToPackage = function (packageId) {
  window.location.href = 'packages.html#' + packageId;
};

window.goToReviewForm = function () {
  window.location.href = 'about.html#leaveReview';
};

window.goToTransferForm = function () {
  window.location.href = 'contact.html#transfer';
};

// Mobile submenu links close the mobile menu, then run the same
// goTo* navigation the desktop dropdown uses.
window.mobileGoTo = function (fn, ...args) {
  closeMobileMenu();
  setTimeout(() => window[fn](...args), 200);
};

// ============================================
// HASH-TARGET HANDLING
// Real links like services.html#visa or destinations.html#bwindi now
// point straight at a specific page. This runs on load (arriving from
// another page) and on hashchange (clicking a dropdown link while
// already on that page, which only changes the hash) to open/scroll to
// the right service card, destination detail, or package panel --
// mirroring what goToService/goToDestination/goToPackage used to do
// inline when they drove the whole page load themselves.
// ============================================
function handleHashTarget() {
  const hash = decodeURIComponent(window.location.hash.replace('#', ''));
  if (!hash) return;

  // Services page: scroll to and highlight the matching service card
  const serviceMap = {
    visa: 0, documentation: 1, hotel: 2, transfers: 3, flights: 4,
    insurance: 5, uganda: 6, international: 7, advisory: 8, events: 9,
    restaurants: 10
  };
  if (Object.prototype.hasOwnProperty.call(serviceMap, hash)) {
    const cards = document.querySelectorAll('.service-card.clickable');
    const card = cards[serviceMap[hash]];
    if (card) {
      card.scrollIntoView({ behavior: 'smooth', block: 'center' });
      card.style.border = '2px solid var(--gold)';
      card.style.transition = 'border 0.3s, background 0.3s';
      card.style.background = 'var(--dark-3)';
      setTimeout(() => {
        card.style.border = '1px solid rgba(201,168,76,0.12)';
        card.style.background = '';
      }, 3000);
      return;
    }
  }

  // Destinations page: open the matching destination detail view
  if (document.getElementById('destinationDetail') && document.getElementById(`detail-${hash}`)) {
    showDestinationDetail(hash);
    return;
  }

  // Packages page: expand the matching accordion panel
  const pkgPanel = document.getElementById(`pkg-${hash}`);
  if (pkgPanel) {
    const toggle = pkgPanel.querySelector('.pkg-accordion-toggle');
    if (toggle && !pkgPanel.classList.contains('pkg-open')) {
      togglePkgAccordion(toggle);
    } else {
      pkgPanel.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
    return;
  }

  // Contact page: open the Airport Transfer tab
  if (hash === 'transfer' && document.getElementById('tabTransfer')) {
    document.querySelector('.form-tabs')?.classList.add('visible');
    switchContactTab('transfer');
    document.querySelector('.form-card')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    return;
  }

  // Anything else (e.g. #leaveReview on the About page) is a plain
  // element id -- the browser already jumps to it on load for free.
}

document.addEventListener('DOMContentLoaded', handleHashTarget);
window.addEventListener('hashchange', handleHashTarget);

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
  // must match the inline <head> script in every page, or the two can
  // disagree and flash/fight each other.
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
