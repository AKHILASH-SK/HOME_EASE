/**
 * ==============================================================================
 * HomeEase Mini - Client Application Logic (Vanilla JavaScript)
 * ==============================================================================
 * Course / Evaluation: Student Web Application Project
 * Features:
 * - Dynamic Service Catalog loading & category filtering
 * - Interactive Booking submission with live price calculation
 * - Appointment tracking, ID lookup & status cancellation
 * - Student-friendly authentication & session storage
 * ==============================================================================
 */

// Application State
const state = {
  services: [],
  bookings: [],
  currentUser: null,
  activeCategory: "All",
  pendingServiceId: null,
  pendingTarget: null,
  isManagerMode: false,
};

// ------------------------------------------------------------------------------
// DOM Elements
// ------------------------------------------------------------------------------
const elements = {
  // Navigation & Auth
  navAuth: document.getElementById("navAuth"),
  openAuthModalBtn: document.getElementById("openAuthModalBtn"),
  authModal: document.getElementById("authModal"),
  closeAuthModalBtn: document.getElementById("closeAuthModalBtn"),
  cancelAuthModalBtn: document.getElementById("cancelAuthModalBtn"),
  authForm: document.getElementById("authForm"),
  authName: document.getElementById("authName"),
  authPhone: document.getElementById("authPhone"),
  authEmail: document.getElementById("authEmail"),

  // Services
  categoryFilters: document.getElementById("categoryFilters"),
  servicesGrid: document.getElementById("servicesGrid"),
  serviceSelect: document.getElementById("serviceSelect"),

  // Booking Form & Summary
  bookingForm: document.getElementById("appointmentBookingForm"),
  custName: document.getElementById("custName"),
  custPhone: document.getElementById("custPhone"),
  custEmail: document.getElementById("custEmail"),
  aptDate: document.getElementById("aptDate"),
  aptSlot: document.getElementById("aptSlot"),
  custAddress: document.getElementById("custAddress"),
  custNotes: document.getElementById("custNotes"),
  submitBookingBtn: document.getElementById("submitBookingBtn"),

  // Error Containers
  custNameError: document.getElementById("custNameError"),
  custPhoneError: document.getElementById("custPhoneError"),
  custEmailError: document.getElementById("custEmailError"),
  custAddressError: document.getElementById("custAddressError"),
  authNameError: document.getElementById("authNameError"),
  authPhoneError: document.getElementById("authPhoneError"),
  authEmailError: document.getElementById("authEmailError"),

  // Summary Elements
  summaryCategoryBadge: document.getElementById("summaryCategoryBadge"),
  summaryServiceIcon: document.getElementById("summaryServiceIcon"),
  summaryServiceName: document.getElementById("summaryServiceName"),
  summaryServiceDuration: document.getElementById("summaryServiceDuration"),
  summaryBasePrice: document.getElementById("summaryBasePrice"),
  summaryTotalPrice: document.getElementById("summaryTotalPrice"),

  // Bookings / Tracking
  bookingsList: document.getElementById("bookingsList"),
  bookingSearchInput: document.getElementById("bookingSearchInput"),
  searchBookingBtn: document.getElementById("searchBookingBtn"),
  clearSearchBtn: document.getElementById("clearSearchBtn"),

  // Toast Container
  toastContainer: document.getElementById("toastContainer"),
};

// ------------------------------------------------------------------------------
// INITIALIZATION
// ------------------------------------------------------------------------------
document.addEventListener("DOMContentLoaded", () => {
  initDateInput();
  loadUserFromStorage();
  fetchServices();
  fetchBookings();
  bindEvents();
});

/**
 * Sets minimum booking date to today so users cannot book in the past
 */
function initDateInput() {
  const today = new Date().toISOString().split("T")[0];
  elements.aptDate.min = today;
  elements.aptDate.value = today;
}

// ------------------------------------------------------------------------------
// AUTHENTICATION & SESSION MANAGEMENT
// ------------------------------------------------------------------------------
function loadUserFromStorage() {
  const stored = localStorage.getItem("homeease_user");
  if (stored) {
    try {
      state.currentUser = JSON.parse(stored);
    } catch (e) {
      state.currentUser = null;
    }
  }
  updateAuthUI();
}

function updateAuthUI() {
  if (state.currentUser) {
    document.body.classList.add("authenticated");

    // Pre-fill booking form fields
    if (elements.custName) elements.custName.value = state.currentUser.name || "";
    if (elements.custPhone) elements.custPhone.value = state.currentUser.phone || "";
    if (elements.custEmail) elements.custEmail.value = state.currentUser.email || "";

    elements.navAuth.innerHTML = `
      <div class="user-badge">
        <span>👤</span>
        <strong>${escapeHtml(state.currentUser.name)}</strong>
        <span class="logout-link" id="signOutBtn" title="Sign Out">✕</span>
      </div>
    `;

    document.getElementById("signOutBtn").addEventListener("click", handleSignOut);
  } else {
    document.body.classList.remove("authenticated");

    if (elements.custName) elements.custName.value = "";
    if (elements.custPhone) elements.custPhone.value = "";
    if (elements.custEmail) elements.custEmail.value = "";

    elements.navAuth.innerHTML = `
      <button type="button" class="btn btn-outline" id="openAuthModalBtn">
        <span>👤</span> Sign In
      </button>
    `;
    document.getElementById("openAuthModalBtn").addEventListener("click", () => openAuthModal());
  }
}

function openAuthModal(reason = null) {
  elements.authModal.classList.add("open");
  if (reason) {
    showToast(reason, "info");
  }
  if (state.currentUser) {
    elements.authName.value = state.currentUser.name || "";
    elements.authPhone.value = state.currentUser.phone || "";
    elements.authEmail.value = state.currentUser.email || "";
  } else {
    setTimeout(() => {
      if (elements.authName) elements.authName.focus();
    }, 150);
  }
}

function closeAuthModal() {
  elements.authModal.classList.remove("open");
}

// ------------------------------------------------------------------------------
// FORM VALIDATION HELPERS
// ------------------------------------------------------------------------------
function isValidPhone(phone) {
  return /^[0-9]{10}$/.test(String(phone).trim());
}

function isValidEmail(email) {
  if (!email || !String(email).trim()) return true; // Optional field, but if provided must be valid
  return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(String(email).trim());
}

function showInputError(inputEl, errorEl, message) {
  if (!inputEl) return;
  if (message) {
    inputEl.classList.add("input-invalid");
    inputEl.setCustomValidity(message);
    if (errorEl) {
      errorEl.innerHTML = `⚠️ ${escapeHtml(message)}`;
      errorEl.classList.add("visible");
    }
    // Triggers the browser's native popup bubble right at that input box!
    inputEl.reportValidity();
  } else {
    inputEl.classList.remove("input-invalid");
    inputEl.setCustomValidity("");
    if (errorEl) {
      errorEl.textContent = "";
      errorEl.classList.remove("visible");
    }
  }
}

function handleAuthSubmit(e) {
  e.preventDefault();
  const name = elements.authName.value.trim();
  const phone = elements.authPhone.value.trim();
  const email = elements.authEmail.value.trim();

  // Clear previous errors
  showInputError(elements.authName, elements.authNameError, "");
  showInputError(elements.authPhone, elements.authPhoneError, "");
  showInputError(elements.authEmail, elements.authEmailError, "");

  if (!name) {
    showInputError(elements.authName, elements.authNameError, "Please enter your name.");
    elements.authName.focus();
    return;
  }

  if (!phone) {
    showInputError(elements.authPhone, elements.authPhoneError, "Please enter your 10-digit mobile number.");
    elements.authPhone.focus();
    return;
  }

  if (!isValidPhone(phone)) {
    showInputError(elements.authPhone, elements.authPhoneError, "Phone number must consist of exactly 10 digits.");
    elements.authPhone.focus();
    showToast("Phone number must be exactly 10 digits.", "error");
    return;
  }

  if (email && !isValidEmail(email)) {
    showInputError(elements.authEmail, elements.authEmailError, "Please enter a valid email address (e.g. name@example.com).");
    elements.authEmail.focus();
    showToast("Please enter a valid email address.", "error");
    return;
  }

  state.currentUser = { name, phone, email };
  localStorage.setItem("homeease_user", JSON.stringify(state.currentUser));

  closeAuthModal();
  updateAuthUI();
  renderBookings();
  showToast(`Welcome, ${name}! Your session is active.`, "success");

  // If user clicked a service or section before signing in:
  if (state.pendingServiceId) {
    selectService(state.pendingServiceId);
    state.pendingServiceId = null;
    setTimeout(() => {
      const bookingSection = document.getElementById("booking-section");
      if (bookingSection) {
        bookingSection.scrollIntoView({ behavior: "smooth" });
      }
    }, 300);
  } else if (state.pendingTarget === "my-bookings") {
    state.pendingTarget = null;
    setTimeout(() => {
      const myBookingsSection = document.getElementById("my-bookings");
      if (myBookingsSection) {
        myBookingsSection.scrollIntoView({ behavior: "smooth" });
      }
    }, 300);
  } else {
    setTimeout(() => {
      const bookingSection = document.getElementById("booking-section");
      if (bookingSection) {
        bookingSection.scrollIntoView({ behavior: "smooth" });
      }
    }, 300);
  }
}

function handleSignOut() {
  state.currentUser = null;
  state.pendingServiceId = null;
  state.pendingTarget = null;
  localStorage.removeItem("homeease_user");
  updateAuthUI();
  showToast("You have signed out.", "success");
  window.scrollTo({ top: 0, behavior: "smooth" });
}

// ------------------------------------------------------------------------------
// SERVICES CATALOG
// ------------------------------------------------------------------------------
async function fetchServices() {
  try {
    const response = await fetch("/api/services");
    const data = await response.json();

    if (data.success && Array.isArray(data.services)) {
      state.services = data.services;
      populateServiceDropdown(state.services);
      renderServicesGrid(state.services);
      // Pre-select first service
      if (state.services.length > 0) {
        selectService(state.services[0].id);
      }
    } else {
      elements.servicesGrid.innerHTML = `<div class="empty-state"><p>No services found.</p></div>`;
    }
  } catch (error) {
    console.error("Failed to fetch services:", error);
    elements.servicesGrid.innerHTML = `
      <div class="empty-state">
        <p>⚠️ Unable to load services from backend server.</p>
      </div>
    `;
  }
}

function populateServiceDropdown(services) {
  elements.serviceSelect.innerHTML = services
    .map(
      (s) =>
        `<option value="${s.id}" data-price="${s.price}" data-name="${escapeHtml(s.title)}">
          ${s.icon} ${escapeHtml(s.title)} - ₹${s.price} (${s.duration})
        </option>`
    )
    .join("");
}

function renderServicesGrid(services) {
  let list = services;
  if (state.activeCategory !== "All") {
    list = services.filter((s) => s.category.toLowerCase() === state.activeCategory.toLowerCase());
  }

  if (list.length === 0) {
    elements.servicesGrid.innerHTML = `
      <div class="empty-state" style="grid-column: 1 / -1;">
        <div class="empty-state-icon">🔍</div>
        <h3>No services found in this category</h3>
        <p>Try clicking "All Services" to view all offerings.</p>
      </div>
    `;
    return;
  }

  elements.servicesGrid.innerHTML = list
    .map((s) => {
      const featuresHtml = (s.features || [])
        .map((f) => `<li>${escapeHtml(f)}</li>`)
        .join("");

      return `
        <div class="service-card" data-service-id="${s.id}">
          <div class="service-card-header">
            <div class="service-icon-box">${s.icon || "🛠️"}</div>
            <span class="service-badge">${escapeHtml(s.badge || s.category)}</span>
          </div>
          <h3 class="service-card-title">${escapeHtml(s.title)}</h3>
          <p class="service-card-desc">${escapeHtml(s.description)}</p>
          <ul class="service-features">
            ${featuresHtml}
          </ul>
          <div class="service-card-footer">
            <div class="service-price-block">
              <span class="service-price">₹${s.price}</span>
              <span class="service-duration">⏱️ ${escapeHtml(s.duration)}</span>
            </div>
            <button type="button" class="btn btn-primary btn-sm" onclick="selectServiceAndScroll('${s.id}')">
              <span>📅</span> Book Service
            </button>
          </div>
        </div>
      `;
    })
    .join("");
}

function selectService(serviceId) {
  const service = state.services.find((s) => s.id === serviceId);
  if (!service) return;

  elements.serviceSelect.value = service.id;
  updateBookingSummary(service);
}

window.selectServiceAndScroll = function (serviceId) {
  if (!state.currentUser) {
    state.pendingServiceId = serviceId;
    openAuthModal("Please sign in to book this service.");
    return;
  }
  selectService(serviceId);
  const bookingSection = document.getElementById("booking-section");
  if (bookingSection) {
    bookingSection.scrollIntoView({ behavior: "smooth" });
  }
};

function updateBookingSummary(service) {
  if (!service) {
    const selectedOption = elements.serviceSelect.selectedOptions[0];
    if (selectedOption) {
      service = state.services.find((s) => s.id === selectedOption.value);
    }
  }

  if (!service) return;

  elements.summaryCategoryBadge.textContent = service.category;
  elements.summaryServiceIcon.textContent = service.icon || "🛠️";
  elements.summaryServiceName.textContent = service.title;
  elements.summaryServiceDuration.textContent = `Estimated Duration: ${service.duration}`;
  elements.summaryBasePrice.textContent = `₹${service.price}`;
  elements.summaryTotalPrice.textContent = `₹${service.price}`;
}

// ------------------------------------------------------------------------------
// BOOKING FORM SUBMISSION
// ------------------------------------------------------------------------------
async function handleBookingSubmit(e) {
  e.preventDefault();

  const serviceId = elements.serviceSelect.value;
  const service = state.services.find((s) => s.id === serviceId);

  const customerName = elements.custName.value.trim();
  const customerPhone = elements.custPhone.value.trim();
  const customerEmail = elements.custEmail.value.trim();
  const appointmentDate = elements.aptDate.value;
  const appointmentSlot = elements.aptSlot.value;
  const address = elements.custAddress.value.trim();
  const notes = elements.custNotes.value.trim();

  // Reset all previous error states
  showInputError(elements.custName, elements.custNameError, "");
  showInputError(elements.custPhone, elements.custPhoneError, "");
  showInputError(elements.custEmail, elements.custEmailError, "");
  showInputError(elements.custAddress, elements.custAddressError, "");

  // Validation
  if (!service) {
    showToast("Please choose a valid service.", "error");
    return;
  }

  if (!customerName) {
    showInputError(elements.custName, elements.custNameError, "Please enter your full name.");
    elements.custName.focus();
    return;
  }

  if (!customerPhone) {
    showInputError(elements.custPhone, elements.custPhoneError, "Please enter your 10-digit phone number.");
    elements.custPhone.focus();
    return;
  }

  if (!isValidPhone(customerPhone)) {
    showInputError(elements.custPhone, elements.custPhoneError, "Phone number must consist of exactly 10 digits.");
    elements.custPhone.focus();
    showToast("Phone number must be exactly 10 digits.", "error");
    return;
  }

  if (customerEmail && !isValidEmail(customerEmail)) {
    showInputError(elements.custEmail, elements.custEmailError, "Please enter a valid email address (e.g. name@example.com).");
    elements.custEmail.focus();
    showToast("Please enter a valid email address (e.g. name@example.com).", "error");
    return;
  }

  if (!appointmentDate) {
    showToast("Please select an appointment date.", "error");
    elements.aptDate.focus();
    return;
  }

  if (!address) {
    showInputError(elements.custAddress, elements.custAddressError, "Please provide your service address and landmark.");
    elements.custAddress.focus();
    return;
  }

  // Disable button to prevent double-submission
  elements.submitBookingBtn.disabled = true;
  elements.submitBookingBtn.innerHTML = `<span>⏳</span> Confirming Booking...`;

  const payload = {
    customerName,
    customerPhone,
    customerEmail,
    serviceId: service.id,
    serviceName: service.title,
    servicePrice: service.price,
    appointmentDate,
    appointmentSlot,
    address,
    notes,
  };

  try {
    const response = await fetch("/api/bookings", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    const result = await response.json();

    if (result.success && result.booking) {
      showToast(`🎉 Booked! Your Appointment ID is ${result.booking.id}`, "success");

      // Auto-save user session if not signed in yet
      if (!state.currentUser) {
        state.currentUser = { name: customerName, phone: customerPhone, email: customerEmail };
        localStorage.setItem("homeease_user", JSON.stringify(state.currentUser));
        updateAuthUI();
      }

      // Refresh bookings from server
      await fetchBookings();

      // Reset problem notes & address
      elements.custNotes.value = "";

      // Smooth scroll to "My Bookings" section to show instant verification
      setTimeout(() => {
        const bookingsSection = document.getElementById("my-bookings");
        if (bookingsSection) {
          bookingsSection.scrollIntoView({ behavior: "smooth" });
        }
      }, 500);
    } else {
      showToast(result.message || "Failed to book appointment.", "error");
    }
  } catch (error) {
    console.error("Booking error:", error);
    showToast("Network error: Could not reach the server.", "error");
  } finally {
    elements.submitBookingBtn.disabled = false;
    elements.submitBookingBtn.innerHTML = `<span>📅</span> Confirm &amp; Book Appointment`;
  }
}

// ------------------------------------------------------------------------------
// BOOKINGS MANAGEMENT & TRACKING
// ------------------------------------------------------------------------------
async function fetchBookings() {
  try {
    const response = await fetch("/api/bookings");
    const data = await response.json();
    if (data.success && Array.isArray(data.bookings)) {
      state.bookings = data.bookings;
      renderBookings();
    }
  } catch (error) {
    console.error("Failed to fetch bookings:", error);
    elements.bookingsList.innerHTML = `
      <div class="empty-state">
        <p>⚠️ Unable to load appointments from server.</p>
      </div>
    `;
  }
}

function renderBookings(overrideList = null) {
  let list = overrideList || state.bookings;

  if (list.length === 0) {
    elements.bookingsList.innerHTML = `
      <div class="empty-state">
        <div class="empty-state-icon">📭</div>
        <h3>No Appointments Found</h3>
        <p>No appointment records match your criteria. You can book a service above!</p>
      </div>
    `;
    return;
  }

  elements.bookingsList.innerHTML = list
    .map((b) => {
      let statusClass = "status-confirmed";
      if (b.status === "In Progress") statusClass = "status-progress";
      else if (b.status === "Completed") statusClass = "status-completed";
      else if (b.status === "Cancelled") statusClass = "status-cancelled";

      // Manager mode controls vs Customer mode controls
      let actionControlsHtml = "";
      if (state.isManagerMode) {
        actionControlsHtml = `
          <div class="manager-status-box">
            <label>Status:</label>
            <select class="status-select" onchange="handleUpdateStatus('${b.id}', this.value)">
              <option value="Confirmed" ${b.status === "Confirmed" ? "selected" : ""}>Confirmed</option>
              <option value="In Progress" ${b.status === "In Progress" ? "selected" : ""}>In Progress</option>
              <option value="Completed" ${b.status === "Completed" ? "selected" : ""}>Completed</option>
              <option value="Cancelled" ${b.status === "Cancelled" ? "selected" : ""}>Cancelled</option>
            </select>
            ${
              b.status !== "Completed" && b.status !== "Cancelled"
                ? `<button type="button" class="btn-advance-status" onclick="handleAdvanceStatus('${b.id}', '${b.status}')">
                    ➜ ${b.status === "Confirmed" ? "In Progress" : "Completed"}
                   </button>`
                : ""
            }
          </div>
        `;
      } else {
        if (b.status === "Confirmed" || b.status === "In Progress") {
          actionControlsHtml = `<button type="button" class="btn btn-danger btn-sm" onclick="handleCancelBooking('${b.id}')">Cancel Booking</button>`;
        } else if (b.status === "Completed") {
          actionControlsHtml = `<span style="font-size: 0.85rem; color: #10b981; font-weight: 700;">✓ Completed</span>`;
        } else {
          actionControlsHtml = `<span style="font-size: 0.85rem; color: #94a3b8; font-weight: 600;">Cancelled</span>`;
        }
      }

      return `
        <div class="booking-item-card" id="card-${b.id}">
          <div class="booking-card-top">
            <div class="booking-id-tag">
              <span>Appointment:</span>
              <span class="booking-id-pill">${escapeHtml(b.id)}</span>
            </div>
            <span class="status-badge ${statusClass}">${escapeHtml(b.status)}</span>
          </div>

          <div class="booking-card-body">
            <div>
              <h4 class="booking-service-title">${escapeHtml(b.serviceName)}</h4>
              <div class="booking-meta-line">
                <span>📅</span>
                <span>${escapeHtml(b.appointmentDate)} &bull; ${escapeHtml(b.appointmentSlot)}</span>
              </div>
              <div class="booking-meta-line">
                <span>📍</span>
                <span>${escapeHtml(b.address)}</span>
              </div>
              <div class="booking-meta-line">
                <span>👤</span>
                <span>${escapeHtml(b.customerName)} (${escapeHtml(b.customerPhone)})</span>
              </div>
              ${
                b.notes && b.notes !== "No special instructions provided."
                  ? `<div class="booking-meta-line" style="font-style: italic; color: #64748b;">
                      <span>📝</span>
                      <span>"${escapeHtml(b.notes)}"</span>
                    </div>`
                  : ""
              }
            </div>

            <div>
              <span style="font-size: 0.78rem; color: #64748b; display: block;">Total Cost</span>
              <span class="booking-price-tag">₹${b.servicePrice || 399}</span>
            </div>

            <div class="booking-card-actions">
              ${actionControlsHtml}
            </div>
          </div>
        </div>
      `;
    })
    .join("");
}

window.handleUpdateStatus = async function (bookingId, newStatus) {
  try {
    const response = await fetch(`/api/bookings/${bookingId}/status`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: newStatus }),
    });
    const result = await response.json();

    if (result.success) {
      showToast(`Appointment ${bookingId} status updated to "${newStatus}".`, "success");
      await fetchBookings();
    } else {
      showToast(result.message || "Failed to update status.", "error");
    }
  } catch (error) {
    console.error("Status update error:", error);
    showToast("Network error: Could not contact server.", "error");
  }
};

window.handleAdvanceStatus = function (bookingId, currentStatus) {
  const next = currentStatus === "Confirmed" ? "In Progress" : "Completed";
  handleUpdateStatus(bookingId, next);
};

window.handleCancelBooking = async function (bookingId) {
  try {
    const response = await fetch(`/api/bookings/${bookingId}/cancel`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: "Cancelled" }),
    });
    const result = await response.json();

    if (result.success) {
      showToast(`Appointment ${bookingId} has been cancelled.`, "success");
      await fetchBookings();
    } else {
      showToast(result.message || "Failed to cancel appointment.", "error");
    }
  } catch (error) {
    console.error("Cancel booking error:", error);
    showToast("Network error: Could not contact server.", "error");
  }
};

function handleSearchBooking() {
  const query = elements.bookingSearchInput.value.trim().toLowerCase();
  if (!query) {
    renderBookings();
    return;
  }

  const matches = state.bookings.filter(
    (b) =>
      (b.id && b.id.toLowerCase().includes(query)) ||
      (b.customerName && b.customerName.toLowerCase().includes(query)) ||
      (b.serviceName && b.serviceName.toLowerCase().includes(query)) ||
      (b.customerPhone && b.customerPhone.includes(query))
  );

  renderBookings(matches);

  if (matches.length === 0) {
    showToast(`No appointments found matching "${query}"`, "error");
  } else {
    showToast(`Found ${matches.length} matching appointment(s)`, "success");
  }
}

function handleClearSearch() {
  elements.bookingSearchInput.value = "";
  renderBookings();
}

// ------------------------------------------------------------------------------
// EVENT LISTENERS BINDING
// ------------------------------------------------------------------------------
function bindEvents() {
  // Service selection dropdown change
  elements.serviceSelect.addEventListener("change", (e) => {
    selectService(e.target.value);
  });

  // Category filter tabs
  elements.categoryFilters.addEventListener("click", (e) => {
    if (e.target.classList.contains("filter-btn")) {
      document
        .querySelectorAll(".category-filters .filter-btn")
        .forEach((btn) => btn.classList.remove("active"));
      e.target.classList.add("active");
      state.activeCategory = e.target.getAttribute("data-category");
      renderServicesGrid(state.services);
    }
  });

  // Real-time Input Validation & Numeric Masking
  elements.custPhone.addEventListener("input", (e) => {
    e.target.value = e.target.value.replace(/\D/g, "").slice(0, 10);
    if (e.target.value.length === 10) {
      showInputError(elements.custPhone, elements.custPhoneError, "");
    }
  });
  elements.custPhone.addEventListener("blur", (e) => {
    if (e.target.value && !isValidPhone(e.target.value)) {
      showInputError(elements.custPhone, elements.custPhoneError, "Phone number must consist of exactly 10 digits.");
    } else if (e.target.value) {
      showInputError(elements.custPhone, elements.custPhoneError, "");
    }
  });

  elements.custEmail.addEventListener("input", (e) => {
    if (!e.target.value.trim() || isValidEmail(e.target.value)) {
      showInputError(elements.custEmail, elements.custEmailError, "");
    }
  });
  elements.custEmail.addEventListener("blur", (e) => {
    if (e.target.value.trim() && !isValidEmail(e.target.value)) {
      showInputError(elements.custEmail, elements.custEmailError, "Please enter a valid email address (e.g. name@example.com).");
    } else {
      showInputError(elements.custEmail, elements.custEmailError, "");
    }
  });

  elements.custName.addEventListener("input", () => {
    if (elements.custName.value.trim()) {
      showInputError(elements.custName, elements.custNameError, "");
    }
  });

  elements.custAddress.addEventListener("input", () => {
    if (elements.custAddress.value.trim()) {
      showInputError(elements.custAddress, elements.custAddressError, "");
    }
  });

  // Auth Form Real-Time Validation
  elements.authPhone.addEventListener("input", (e) => {
    e.target.value = e.target.value.replace(/\D/g, "").slice(0, 10);
    if (e.target.value.length === 10) {
      showInputError(elements.authPhone, elements.authPhoneError, "");
    }
  });
  elements.authPhone.addEventListener("blur", (e) => {
    if (e.target.value && !isValidPhone(e.target.value)) {
      showInputError(elements.authPhone, elements.authPhoneError, "Phone number must consist of exactly 10 digits.");
    } else if (e.target.value) {
      showInputError(elements.authPhone, elements.authPhoneError, "");
    }
  });

  elements.authEmail.addEventListener("input", (e) => {
    if (!e.target.value.trim() || isValidEmail(e.target.value)) {
      showInputError(elements.authEmail, elements.authEmailError, "");
    }
  });
  elements.authEmail.addEventListener("blur", (e) => {
    if (e.target.value.trim() && !isValidEmail(e.target.value)) {
      showInputError(elements.authEmail, elements.authEmailError, "Please enter a valid email address (e.g. name@example.com).");
    } else {
      showInputError(elements.authEmail, elements.authEmailError, "");
    }
  });

  elements.authName.addEventListener("input", () => {
    if (elements.authName.value.trim()) {
      showInputError(elements.authName, elements.authNameError, "");
    }
  });

  // Booking Form Submission
  elements.bookingForm.addEventListener("submit", handleBookingSubmit);

  // Booking Search
  elements.searchBookingBtn.addEventListener("click", handleSearchBooking);
  elements.bookingSearchInput.addEventListener("keydown", (e) => {
    if (e.key === "Enter") {
      e.preventDefault();
      handleSearchBooking();
    }
  });

  elements.clearSearchBtn.addEventListener("click", handleClearSearch);
  // Auth Modal Controls
  if (elements.closeAuthModalBtn) {
    elements.closeAuthModalBtn.addEventListener("click", closeAuthModal);
  }
  if (elements.cancelAuthModalBtn) {
    elements.cancelAuthModalBtn.addEventListener("click", closeAuthModal);
  }
  if (elements.authForm) {
    elements.authForm.addEventListener("submit", handleAuthSubmit);
  }
  // Click backdrop to close
  elements.authModal.addEventListener("click", (e) => {
    if (e.target === elements.authModal) {
      closeAuthModal();
    }
  });

  // Action Buttons & Nav Links Login Protection
  const heroBookBtn = document.getElementById("heroBookBtn");
  if (heroBookBtn) {
    heroBookBtn.addEventListener("click", (e) => {
      if (!state.currentUser) {
        e.preventDefault();
        openAuthModal("Please sign in to schedule an appointment.");
      }
    });
  }

  const guestSignInBtn = document.getElementById("guestSignInBtn");
  if (guestSignInBtn) {
    guestSignInBtn.addEventListener("click", () => {
      openAuthModal("Please sign in to book an appointment.");
    });
  }

  const navBookLink = document.getElementById("navBookLink");
  if (navBookLink) {
    navBookLink.addEventListener("click", (e) => {
      if (!state.currentUser) {
        e.preventDefault();
        openAuthModal("Please sign in to book an appointment.");
      }
    });
  }

  const navMyBookingsLink = document.getElementById("navMyBookingsLink");
  if (navMyBookingsLink) {
    navMyBookingsLink.addEventListener("click", (e) => {
      if (!state.currentUser) {
        e.preventDefault();
        state.pendingTarget = "my-bookings";
        openAuthModal("Please sign in to view your appointments.");
      }
    });
  }

  // Manager Mode Toggle
  const managerModeToggle = document.getElementById("managerModeToggle");
  if (managerModeToggle) {
    managerModeToggle.addEventListener("change", (e) => {
      state.isManagerMode = e.target.checked;
      showToast(
        state.isManagerMode
          ? "🛠️ Service Manager Mode: Status edit enabled (Confirmed ➜ In Progress ➜ Completed)."
          : "Customer View Active.",
        "info"
      );
      renderBookings();
    });
  }
}

// ------------------------------------------------------------------------------
// TOAST NOTIFICATION UTILITY
// ------------------------------------------------------------------------------
function showToast(message, type = "success") {
  const toast = document.createElement("div");
  const toastTypeClass = type === "error" ? "toast-error" : type === "info" ? "toast-info" : "toast-success";
  toast.className = `toast ${toastTypeClass}`;

  const icon = type === "error" ? "⚠️" : type === "info" ? "ℹ️" : "✅";
  toast.innerHTML = `<span>${icon}</span><span>${escapeHtml(message)}</span>`;

  elements.toastContainer.appendChild(toast);

  setTimeout(() => {
    toast.style.transition = "opacity 0.3s ease, transform 0.3s ease";
    toast.style.opacity = "0";
    toast.style.transform = "translateY(10px)";
    setTimeout(() => {
      if (toast.parentNode) {
        toast.parentNode.removeChild(toast);
      }
    }, 300);
  }, 4000);
}

// HTML escape helper to prevent XSS
function escapeHtml(str) {
  if (!str) return "";
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}
