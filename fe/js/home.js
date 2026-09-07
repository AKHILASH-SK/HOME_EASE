/**
 * ==============================================================================
 * HomeEase - Home / Customer Portal Logic (home.html)
 * ==============================================================================
 */

document.addEventListener('DOMContentLoaded', () => {
  // 1. Auth Gate: Must be logged in to view home.html
  const currentUser = getCurrentUser();
  if (!currentUser) {
    window.location.href = 'index.html?login=true';
    return;
  }

  // 2. Set dynamic personalized greeting & user badge
  const welcomeGreeting = document.getElementById('welcomeGreeting');
  const userNameBadge = document.getElementById('userNameBadge');

  if (userNameBadge) {
    userNameBadge.textContent = currentUser.name;
  }

  if (welcomeGreeting) {
    const hour = new Date().getHours();
    const prefix = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening';
    welcomeGreeting.textContent = `${prefix}, ${currentUser.name} 👋`;
  }

  // 3. Load active bookings count for the button badge
  loadCustomerBookingBadge(currentUser);

  // 4. Setup in-page ScrollSpy and smooth navigation
  setupHomeNavScrollSpy();
});

/**
 * Load Active Bookings Count for Logged-In Customer
 */
async function loadCustomerBookingBadge(currentUser) {
  const badgeCount = document.getElementById('userActiveBookingsCount');
  if (!badgeCount) return;

  try {
    const res = await fetch('/api/bookings');
    const data = await res.json();
    if (data.success) {
      const allBookings = data.data;
      const userBookings = allBookings.filter(b => 
        (b.customer && b.customer.phone === currentUser.phone) ||
        (b.customer && b.customer.email === currentUser.email)
      );
      const activeList = userBookings.filter(b => b.status === 'Confirmed' || b.status === 'In Progress');
      badgeCount.textContent = activeList.length;
    }
  } catch (e) {
    badgeCount.textContent = '0';
  }
}

/**
 * Setup Active Navigation Indicator & ScrollSpy for home.html
 */
function setupHomeNavScrollSpy() {
  const navLinks = document.querySelectorAll('.nav-menu .nav-link[data-nav-target]');
  if (!navLinks.length) return;

  const sections = [
    { id: 'portalDashboard', el: document.getElementById('portalDashboard') },
    { id: 'servicesCatalog', el: document.getElementById('servicesCatalog') },
    { id: 'pricingTableSection', el: document.getElementById('pricingTableSection') }
  ].filter(item => item.el !== null);

  if (!sections.length) return;

  let isManualClick = false;
  let manualTimeout = null;

  function setActive(targetId) {
    navLinks.forEach(link => {
      if (link.getAttribute('data-nav-target') === targetId) {
        link.classList.add('active');
      } else {
        link.classList.remove('active');
      }
    });
  }

  // Click on in-page nav anchors
  navLinks.forEach(link => {
    link.addEventListener('click', (e) => {
      const targetId = link.getAttribute('data-nav-target');
      const targetEl = document.getElementById(targetId);
      if (targetEl) {
        e.preventDefault();
        isManualClick = true;
        clearTimeout(manualTimeout);
        setActive(targetId);

        const headerOffset = 76;
        const targetPos = targetEl.getBoundingClientRect().top + window.pageYOffset - headerOffset;
        window.scrollTo({
          top: targetPos,
          behavior: 'smooth'
        });

        if (history.replaceState) {
          history.replaceState(null, null, `#${targetId}`);
        }

        manualTimeout = setTimeout(() => {
          isManualClick = false;
        }, 850);
      }
    });
  });

  // ScrollSpy listener
  window.addEventListener('scroll', () => {
    if (isManualClick) return;

    if ((window.innerHeight + window.scrollY) >= (document.body.offsetHeight - 80)) {
      setActive('pricingTableSection');
      return;
    }

    const scrollY = window.scrollY;
    if (scrollY < 200) {
      setActive('portalDashboard');
      return;
    }

    const offset = 140;
    let currentId = 'portalDashboard';

    for (let i = 0; i < sections.length; i++) {
      const top = sections[i].el.getBoundingClientRect().top;
      if (top <= offset) {
        currentId = sections[i].id;
      }
    }
    setActive(currentId);
  }, { passive: true });

  // On load with hash
  if (window.location.hash) {
    const hash = window.location.hash.replace('#', '');
    if (sections.some(s => s.id === hash)) {
      setActive(hash);
    }
  }
}
