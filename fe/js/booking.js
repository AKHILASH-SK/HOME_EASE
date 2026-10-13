/**
 * ==============================================================================
 * HomeEase - Booking Wizard & Client-side Form Validation Engine
 * ==============================================================================
 */

// Global State for current booking calculation
let currentServices = [];
let currentTechnicians = [];
let selectedService = null;

document.addEventListener('DOMContentLoaded', async () => {
  setupDatePickerConstraints();
  await loadServicesAndInit();
  setupValidationListeners();
  setupFormSubmit();
  prefillCustomerIfLoggedIn();
});

/**
 * Restrict date picker so users cannot select past dates or beyond 30 days
 */
function setupDatePickerConstraints() {
  const dateInput = document.getElementById('bookDate');
  if (!dateInput) return;

  const today = new Date();
  const yyyy = today.getFullYear();
  const mm = String(today.getMonth() + 1).padStart(2, '0');
  const dd = String(today.getDate()).padStart(2, '0');

  const minDate = `${yyyy}-${mm}-${dd}`;
  dateInput.min = minDate;

  // Max 30 days in advance
  const maxFuture = new Date();
  maxFuture.setDate(today.getDate() + 30);
  const max_yyyy = maxFuture.getFullYear();
  const max_mm = String(maxFuture.getMonth() + 1).padStart(2, '0');
  const max_dd = String(maxFuture.getDate()).padStart(2, '0');
  dateInput.max = `${max_yyyy}-${max_mm}-${max_dd}`;
}

/**
 * Prefill customer fields if logged in
 */
function prefillCustomerIfLoggedIn() {
  const user = getCurrentUser();
  if (user) {
    const nameInput = document.getElementById('custName');
    const phoneInput = document.getElementById('custPhone');
    const emailInput = document.getElementById('custEmail');
    const cityInput = document.getElementById('custCity');

    if (nameInput && !nameInput.value) nameInput.value = user.name || '';
    if (phoneInput && !phoneInput.value) phoneInput.value = user.phone || '';
    if (emailInput && !emailInput.value) emailInput.value = user.email || '';
    if (cityInput && user.city) cityInput.value = user.city;
  }
}

/**
 * Fetch services from server and initialize form
 */
async function loadServicesAndInit() {
  try {
    const res = await fetch('/api/services');
    const data = await res.json();

    if (data.success) {
      currentServices = data.data;
      populateServiceDropdown(currentServices);

      // Check URL query parameters for pre-selected service
      const urlParams = new URLSearchParams(window.location.search);
      const preSelectedId = urlParams.get('service');

      if (preSelectedId && currentServices.some(s => s.id === preSelectedId)) {
        document.getElementById('serviceCategory').value = preSelectedId;
        onServiceChanged(preSelectedId);
      } else if (currentServices.length > 0) {
        document.getElementById('serviceCategory').value = currentServices[0].id;
        onServiceChanged(currentServices[0].id);
      }
    }
  } catch (err) {
    showToast('Failed to load service list from server.', 'error');
  }
}

/**
 * Populate Service Category Select Dropdown
 */
function populateServiceDropdown(services) {
  const select = document.getElementById('serviceCategory');
  if (!select) return;

  select.innerHTML = '<option value="">-- Choose a Home Service --</option>';
  services.forEach(srv => {
    const opt = document.createElement('option');
    opt.value = srv.id;
    opt.textContent = `${srv.icon} ${srv.name} (from ₹${srv.basePrice})`;
    select.appendChild(opt);
  });

  select.addEventListener('change', (e) => {
    onServiceChanged(e.target.value);
  });
}

/**
 * Triggered when service selection changes
 */
async function onServiceChanged(serviceId) {
  selectedService = currentServices.find(s => s.id === serviceId);
  if (!selectedService) return;

  // 1. Render Sub-Services
  renderSubServices(selectedService.subServices);

  // 2. Render Add-ons
  renderAddOns(selectedService.addOns);

  // 3. Load & Render Technicians for this category
  await loadTechniciansForCategory(selectedService.category);

  // 4. Update Live Bill Summary
  recalculateBill();
}

/**
 * Render Sub-Service Checkboxes
 */
function renderSubServices(subServices = []) {
  const container = document.getElementById('subServicesContainer');
  if (!container) return;

  if (subServices.length === 0) {
    container.innerHTML = '<p class="text-muted" style="font-size: 0.85rem;">Standard service diagnostic included.</p>';
    return;
  }

  let html = '';
  subServices.forEach((sub, idx) => {
    const isChecked = idx === 0 ? 'checked' : ''; // check the primary job by default
    html += `
      <label class="checkbox-custom">
        <div class="checkbox-left">
          <input type="checkbox" name="subServiceItem" value="${sub.name}" data-price="${sub.price}" ${isChecked} onchange="recalculateBill()">
          <span class="addon-title">${escapeHtml(sub.name)}</span>
        </div>
        <span class="addon-price">+₹${sub.price}</span>
      </label>
    `;
  });
  container.innerHTML = html;
}

/**
 * Render Add-ons Checkboxes
 */
function renderAddOns(addOns = []) {
  const container = document.getElementById('addOnsContainer');
  if (!container) return;

  if (addOns.length === 0) {
    container.innerHTML = '<p class="text-muted" style="font-size: 0.85rem;">No additional add-ons for this category.</p>';
    return;
  }

  let html = '';
  addOns.forEach((addon) => {
    html += `
      <label class="checkbox-custom">
        <div class="checkbox-left">
          <input type="checkbox" name="addonItem" value="${addon.id}" data-name="${addon.name}" data-price="${addon.price}" onchange="recalculateBill()">
          <span class="addon-title">${escapeHtml(addon.name)}</span>
        </div>
        <span class="addon-price">+₹${addon.price}</span>
      </label>
    `;
  });
  container.innerHTML = html;
}

/**
 * Fetch and Render Certified Technicians for Category
 */
async function loadTechniciansForCategory(category) {
  const container = document.getElementById('technicianPickerContainer');
  if (!container) return;

  try {
    const res = await fetch(`/api/technicians?category=${encodeURIComponent(category)}`);
    const data = await res.json();
    currentTechnicians = data.success ? data.data : [];

    let html = `
      <label class="tech-radio-card">
        <input type="radio" name="technicianOption" value="auto" checked onchange="recalculateBill()">
        <div class="tech-card-inner">
          <div style="font-size: 2.2rem; margin-bottom: 0.5rem;">⚡</div>
          <div class="tech-name">Auto-Assign Specialist</div>
          <div class="tech-role">Allocates highest rated available pro</div>
          <span class="tech-rating">Guaranteed Match</span>
        </div>
      </label>
    `;

    currentTechnicians.forEach(tech => {
      html += `
        <label class="tech-radio-card">
          <input type="radio" name="technicianOption" value="${tech.id}" onchange="recalculateBill()">
          <div class="tech-card-inner">
            <img src="${tech.avatar}" alt="${tech.name}" class="tech-avatar" onerror="this.src='https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150&auto=format&fit=crop&q=80'">
            <div class="tech-name">${escapeHtml(tech.name)}</div>
            <div class="tech-role">${escapeHtml(tech.role)} (${tech.experience})</div>
            <span class="tech-rating">★ ${tech.rating} (${tech.jobsCompleted} jobs)</span>
          </div>
        </label>
      `;
    });

    container.innerHTML = html;
  } catch (e) {
    container.innerHTML = '<p class="text-danger">Failed to load technicians.</p>';
  }
}

/**
 * Real-time Live Bill Recalculation Engine
 */
function recalculateBill() {
  if (!selectedService) return;

  const basePrice = selectedService.basePrice || 299;
  document.getElementById('summaryServiceName').textContent = selectedService.name;
  document.getElementById('summaryBasePrice').textContent = `₹${basePrice}`;

  // Sub-services sum
  let subServicesTotal = 0;
  const selectedSubs = [];
  document.querySelectorAll('input[name="subServiceItem"]:checked').forEach(cb => {
    subServicesTotal += Number(cb.getAttribute('data-price')) || 0;
    selectedSubs.push(cb.value);
  });

  // Add-ons sum
  let addOnsTotal = 0;
  const selectedAddOns = [];
  document.querySelectorAll('input[name="addonItem"]:checked').forEach(cb => {
    const p = Number(cb.getAttribute('data-price')) || 0;
    addOnsTotal += p;
    selectedAddOns.push({ id: cb.value, name: cb.getAttribute('data-name'), price: p });
  });

  const subTotal = basePrice + subServicesTotal + addOnsTotal;
  const tax = Math.round(subTotal * 0.18);
  const finalTotal = subTotal + tax;

  // Update Summary DOM
  document.getElementById('summaryAddOnsTotal').textContent = `₹${subServicesTotal + addOnsTotal}`;
  document.getElementById('summaryTax').textContent = `₹${tax}`;
  document.getElementById('summaryFinalTotal').textContent = `₹${finalTotal}`;
}

/**
 * Setup Real-Time Validation Listeners on Form Inputs
 */
function setupValidationListeners() {
  const nameInput = document.getElementById('custName');
  const phoneInput = document.getElementById('custPhone');
  const emailInput = document.getElementById('custEmail');
  const dateInput = document.getElementById('bookDate');
  const slotSelect = document.getElementById('timeSlot');
  const addressInput = document.getElementById('custAddress');
  const pincodeInput = document.getElementById('custPincode');

  if (nameInput) {
    nameInput.addEventListener('input', () => validateField(nameInput, /^[a-zA-Z\s]{3,40}$/));
  }
  if (phoneInput) {
    phoneInput.addEventListener('input', () => validateField(phoneInput, /^[6-9]\d{9}$/));
  }
  if (emailInput) {
    emailInput.addEventListener('input', () => validateField(emailInput, /^[^\s@]+@[^\s@]+\.[^\s@]+$/));
  }
  if (dateInput) {
    dateInput.addEventListener('change', () => {
      const isValid = dateInput.value && dateInput.value >= dateInput.min;
      toggleValidationClass(dateInput, isValid);
    });
  }
  if (slotSelect) {
    slotSelect.addEventListener('change', () => {
      toggleValidationClass(slotSelect, slotSelect.value !== '');
    });
  }
  if (addressInput) {
    addressInput.addEventListener('input', () => {
      toggleValidationClass(addressInput, addressInput.value.trim().length >= 8);
    });
  }
  if (pincodeInput) {
    pincodeInput.addEventListener('input', () => validateField(pincodeInput, /^\d{6}$/));
  }
}

function validateField(inputElement, regex) {
  const isValid = regex.test(inputElement.value.trim());
  toggleValidationClass(inputElement, isValid);
  return isValid;
}

function toggleValidationClass(element, isValid) {
  if (isValid) {
    element.classList.remove('is-invalid');
    element.classList.add('is-valid');
  } else {
    element.classList.remove('is-valid');
    element.classList.add('is-invalid');
  }
}

/**
 * Form Submit Handler
 */
function setupFormSubmit() {
  const form = document.getElementById('bookingForm');
  if (!form) return;

  form.addEventListener('submit', async (e) => {
    e.preventDefault();

    // 1. Perform Complete Form Validation
    const name = document.getElementById('custName');
    const phone = document.getElementById('custPhone');
    const email = document.getElementById('custEmail');
    const date = document.getElementById('bookDate');
    const slot = document.getElementById('timeSlot');
    const address = document.getElementById('custAddress');
    const city = document.getElementById('custCity').value;
    const pincode = document.getElementById('custPincode');
    const notes = document.getElementById('custNotes').value;

    const isNameValid = validateField(name, /^[a-zA-Z\s]{3,40}$/);
    const isPhoneValid = validateField(phone, /^[6-9]\d{9}$/);
    const isEmailValid = validateField(email, /^[^\s@]+@[^\s@]+\.[^\s@]+$/);
    const isDateValid = date.value && date.value >= date.min;
    toggleValidationClass(date, isDateValid);
    const isSlotValid = slot.value !== '';
    toggleValidationClass(slot, isSlotValid);
    const isAddressValid = address.value.trim().length >= 8;
    toggleValidationClass(address, isAddressValid);
    const isPincodeValid = validateField(pincode, /^\d{6}$/);

    if (!isNameValid || !isPhoneValid || !isEmailValid || !isDateValid || !isSlotValid || !isAddressValid || !isPincodeValid) {
      showToast('Please fix the highlighted errors before booking.', 'error');
      // Scroll to first invalid element
      const firstInvalid = form.querySelector('.is-invalid');
      if (firstInvalid) firstInvalid.scrollIntoView({ behavior: 'smooth', block: 'center' });
      return;
    }

    // 2. Gather Selected Sub-Services & Add-ons
    const subServices = [];
    document.querySelectorAll('input[name="subServiceItem"]:checked').forEach(cb => {
      subServices.push(cb.value);
    });

    const addOns = [];
    document.querySelectorAll('input[name="addonItem"]:checked').forEach(cb => {
      addOns.push({
        id: cb.value,
        name: cb.getAttribute('data-name'),
        price: Number(cb.getAttribute('data-price')) || 0
      });
    });

    // 3. Technician Choice
    const techChoiceRadio = document.querySelector('input[name="technicianOption"]:checked');
    const technicianId = techChoiceRadio ? techChoiceRadio.value : 'auto';

    // 4. Payment Choice
    const paymentRadio = document.querySelector('input[name="paymentMethod"]:checked');
    const paymentMethod = paymentRadio ? paymentRadio.value : 'Cash on Delivery';

    // Construct Payload
    const payload = {
      customer: {
        name: name.value.trim(),
        phone: phone.value.trim(),
        email: email.value.trim(),
        address: address.value.trim(),
        city,
        pincode: pincode.value.trim()
      },
      serviceId: selectedService.id,
      subServices,
      technicianId,
      schedule: {
        date: date.value,
        timeSlot: slot.value
      },
      addOns,
      paymentMethod,
      specialNotes: notes.trim()
    };

    // Show Loading state on button
    const submitBtn = document.getElementById('submitBookingBtn');
    submitBtn.disabled = true;
    submitBtn.innerHTML = '<span>⏳ Confirming Slot...</span>';

    try {
      const response = await fetch('/api/bookings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      const result = await response.json();

      if (result.success) {
        showSuccessConfirmationModal(result.data);
      } else {
        showToast(result.message || 'Booking submission failed.', 'error');
        submitBtn.disabled = false;
        submitBtn.innerHTML = '<span>Book Appointment Now ➜</span>';
      }
    } catch (err) {
      showToast('Network communication error with server.', 'error');
      submitBtn.disabled = false;
      submitBtn.innerHTML = '<span>Book Appointment Now ➜</span>';
    }
  });
}

/**
 * Display Success Confirmation Modal with Booking ID and Assigned Pro
 */
function showSuccessConfirmationModal(booking) {
  const modal = document.getElementById('bookingSuccessModal');
  if (!modal) {
    window.location.href = '/appointments';
    return;
  }

  document.getElementById('confirmBookingId').textContent = booking.id;
  document.getElementById('confirmServiceName').textContent = booking.service.name;
  document.getElementById('confirmDateTime').textContent = `${booking.schedule.date} at ${booking.schedule.timeSlot}`;
  document.getElementById('confirmTechName').textContent = booking.technician.name;
  document.getElementById('confirmTechRole').textContent = `${booking.technician.role} (${booking.technician.phone})`;
  document.getElementById('confirmTotalAmount').textContent = `₹${booking.pricing.totalAmount}`;

  const confirmTasksRow = document.getElementById('confirmTasksRow');
  const confirmTasksList = document.getElementById('confirmTasksList');
  if (confirmTasksRow && confirmTasksList) {
    if (booking.subServices && booking.subServices.length > 0) {
      confirmTasksList.textContent = booking.subServices.map(s => typeof s === 'object' ? s.name : s).join(', ');
      confirmTasksRow.style.display = 'flex';
    } else {
      confirmTasksRow.style.display = 'none';
    }
  }

  modal.classList.add('active');
}
