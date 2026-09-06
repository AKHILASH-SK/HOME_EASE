/**
 * ==============================================================================
 * HomeEase - Global JavaScript (Authentication, Dual-State UX & Modals)
 * ==============================================================================
 */

// Global User Session Key in LocalStorage
const AUTH_KEY = 'homeease_user_session';

// Initialize UI on DOM Content Loaded
document.addEventListener('DOMContentLoaded', () => {
  setupAuthUI();
  setupAuthModal();
});

/**
 * Check logged-in user and update Header UI + Page State (Guest vs Authenticated)
 */
function setupAuthUI() {
  const currentUser = getCurrentUser();

  // 1. Header Navigation & Action Bar Controls
  const authNav = document.getElementById('authNav');
  const guestActions = document.getElementById('guestNavActions');
  const userActions = document.getElementById('userNavActions');
  const userNameBadge = document.getElementById('userNameBadge');

  if (currentUser) {
    // Show Authenticated Navigation
    if (authNav) authNav.style.display = 'flex';

    // Show User Profile & Logout
    if (userActions) userActions.style.display = 'flex';
    if (guestActions) guestActions.style.display = 'none';
    if (userNameBadge) userNameBadge.textContent = currentUser.name;
  } else {
    // Hide Authenticated Navigation (Guest does NOT see internal links)
    if (authNav) authNav.style.display = 'none';

    // Show Guest Sign In / Register Buttons
    if (userActions) userActions.style.display = 'none';
    if (guestActions) guestActions.style.display = 'flex';
  }

  // 2. Index Page View Switching (Guest View vs Customer Portal View)
  const guestView = document.getElementById('guestView');
  const authView = document.getElementById('authView');
  const welcomeGreeting = document.getElementById('welcomeGreeting');

  if (guestView && authView) {
    if (currentUser) {
      guestView.style.display = 'none';
      authView.style.display = 'block';
      if (welcomeGreeting) {
        welcomeGreeting.textContent = `Good day, ${currentUser.name} 👋`;
      }
      loadCustomerDashboardMetrics();
    } else {
      guestView.style.display = 'block';
      authView.style.display = 'none';
    }
  }

  // 3. Protected Page Gates for book.html and appointments.html
  const protectedContent = document.getElementById('protectedContent');
  const authGatePrompt = document.getElementById('authGatePrompt');

  if (protectedContent && authGatePrompt) {
    if (currentUser) {
      protectedContent.style.display = 'block';
      authGatePrompt.style.display = 'none';
    } else {
      protectedContent.style.display = 'none';
      authGatePrompt.style.display = 'block';
    }
  }
}

/**
 * Load Quick Overview Metrics & Spotlight Booking for Logged-In Customer on index.html
 */
async function loadCustomerDashboardMetrics() {
  const badgeCount = document.getElementById('userActiveBookingsCount');
  const dashActive = document.getElementById('dashActiveCount');
  const dashCompleted = document.getElementById('dashCompletedCount');
  const spotlightTitle = document.getElementById('spotlightTitle');
  const spotlightDesc = document.getElementById('spotlightDesc');
  const spotlightAction = document.getElementById('spotlightAction');

  const currentUser = getCurrentUser();
  if (!currentUser) return;

  try {
    const res = await fetch('/api/bookings');
    const data = await res.json();
    if (data.success) {
      const allBookings = data.data;
      
      // Filter for this customer
      const userBookings = allBookings.filter(b => 
        (b.customer && b.customer.phone === currentUser.phone) ||
        (b.customer && b.customer.email === currentUser.email)
      );

      const activeList = userBookings.filter(b => b.status === 'Confirmed' || b.status === 'In Progress');
      const completedList = userBookings.filter(b => b.status === 'Completed');

      if (badgeCount) badgeCount.textContent = activeList.length;
      if (dashActive) dashActive.textContent = activeList.length;
      if (dashCompleted) dashCompleted.textContent = completedList.length;

      // Update Spotlight widget
      if (spotlightTitle && spotlightDesc && spotlightAction) {
        if (activeList.length > 0) {
          const nextBooking = activeList[0];
          spotlightTitle.textContent = `Scheduled: ${nextBooking.service.name} (${nextBooking.id})`;
          spotlightDesc.textContent = `Arrival on ${nextBooking.schedule.date} at ${nextBooking.schedule.timeSlot} • Assigned Pro: ${nextBooking.technician.name} (${nextBooking.technician.role})`;
          spotlightAction.innerHTML = `
            <a href="appointments.html" class="btn btn-primary btn-sm">Manage Appointment ➜</a>
          `;
        } else {
          spotlightTitle.textContent = `All Set — No Pending Repairs`;
          spotlightDesc.textContent = `Need an electrician, plumber, or appliance diagnostic? Book a verified pro in under 60 seconds.`;
          spotlightAction.innerHTML = `
            <a href="book.html" class="btn btn-primary btn-sm">+ Schedule a Service</a>
          `;
        }
      }
    }
  } catch (e) {
    if (badgeCount) badgeCount.textContent = '0';
  }
}

/**
 * Retrieve active user session
 */
function getCurrentUser() {
  try {
    const raw = localStorage.getItem(AUTH_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch (e) {
    return null;
  }
}

/**
 * Save user session
 */
function setCurrentUser(user) {
  localStorage.setItem(AUTH_KEY, JSON.stringify(user));
  setupAuthUI();
}

/**
 * Sign out active user
 */
function handleLogout() {
  localStorage.removeItem(AUTH_KEY);
  setupAuthUI();
  showToast('You have signed out successfully.', 'info');
  if (window.location.pathname.includes('book') || window.location.pathname.includes('appointments')) {
    window.location.href = 'index.html';
  }
}

/**
 * Setup Auth Modal Event Handlers
 */
function setupAuthModal() {
  const modal = document.getElementById('authModal');
  if (!modal) return;

  const tabLogin = document.getElementById('tabLogin');
  const tabRegister = document.getElementById('tabRegister');
  const formLogin = document.getElementById('formLogin');
  const formRegister = document.getElementById('formRegister');

  if (tabLogin && tabRegister) {
    tabLogin.addEventListener('click', () => {
      tabLogin.classList.add('active');
      tabRegister.classList.remove('active');
      formLogin.style.display = 'block';
      formRegister.style.display = 'none';
    });

    tabRegister.addEventListener('click', () => {
      tabRegister.classList.add('active');
      tabLogin.classList.remove('active');
      formLogin.style.display = 'none';
      formRegister.style.display = 'block';
    });
  }

  // Handle Login submission
  if (formLogin) {
    formLogin.addEventListener('submit', async (e) => {
      e.preventDefault();
      const email = document.getElementById('loginEmail').value.trim();
      const password = document.getElementById('loginPassword').value.trim();

      if (!email || !password) {
        showToast('Please enter both email and password.', 'error');
        return;
      }

      try {
        const res = await fetch('/api/auth/login', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email, password })
        });
        const data = await res.json();

        if (data.success) {
          setCurrentUser(data.data);
          closeAuthModal();
          showToast(`Welcome, ${data.data.name}!`, 'success');
        } else {
          showToast(data.message || 'Invalid credentials.', 'error');
        }
      } catch (err) {
        showToast('Server communication failed.', 'error');
      }
    });
  }

  // Handle Register submission
  if (formRegister) {
    formRegister.addEventListener('submit', async (e) => {
      e.preventDefault();
      const name = document.getElementById('regName').value.trim();
      const email = document.getElementById('regEmail').value.trim();
      const phone = document.getElementById('regPhone').value.trim();
      const password = document.getElementById('regPassword').value.trim();

      if (!name || name.length < 3) {
        showToast('Name must be at least 3 characters.', 'error');
        return;
      }
      if (!/^[6-9]\d{9}$/.test(phone)) {
        showToast('Please enter a valid 10-digit mobile number.', 'error');
        return;
      }
      if (!email || !email.includes('@')) {
        showToast('Please enter a valid email address.', 'error');
        return;
      }

      try {
        const res = await fetch('/api/auth/register', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ name, email, phone, password })
        });
        const data = await res.json();

        if (data.success) {
          setCurrentUser(data.data);
          closeAuthModal();
          showToast(`Account created! Welcome, ${data.data.name}.`, 'success');
        } else {
          showToast(data.message || 'Registration failed.', 'error');
        }
      } catch (err) {
        showToast('Server communication failed.', 'error');
      }
    });
  }
}

/**
 * Open Modal Dialog
 */
function openAuthModal(defaultTab = 'login') {
  const modal = document.getElementById('authModal');
  if (!modal) return;
  modal.classList.add('active');

  const tabLogin = document.getElementById('tabLogin');
  const tabRegister = document.getElementById('tabRegister');
  if (defaultTab === 'register' && tabRegister) {
    tabRegister.click();
  } else if (tabLogin) {
    tabLogin.click();
  }
}

/**
 * Close Modal Dialog
 */
function closeAuthModal() {
  const modal = document.getElementById('authModal');
  if (modal) modal.classList.remove('active');
}

/**
 * Toast Notification Dispatcher (Positioned Top-Right)
 */
function showToast(message, type = 'success') {
  let container = document.getElementById('toastContainer');
  if (!container) {
    container = document.createElement('div');
    container.id = 'toastContainer';
    container.className = 'toast-container';
    document.body.appendChild(container);
  }

  const toast = document.createElement('div');
  toast.className = `toast toast-${type}`;
  toast.innerHTML = `
    <span>${type === 'success' ? '✅' : type === 'error' ? '⚠️' : 'ℹ️'}</span>
    <span>${escapeHtml(message)}</span>
  `;

  container.appendChild(toast);

  setTimeout(() => {
    toast.style.opacity = '0';
    toast.style.transform = 'translateY(-10px)';
    toast.style.transition = 'all 0.25s ease';
    setTimeout(() => toast.remove(), 250);
  }, 3200);
}

/**
 * Escape HTML
 */
function escapeHtml(str) {
  if (!str) return '';
  return str.replace(/[&<>'"]/g, 
    tag => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' }[tag] || tag)
  );
}
