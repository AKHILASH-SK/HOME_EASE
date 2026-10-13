/**
 * ==============================================================================
 * HomeEase - Appointments Dashboard & Management Engine
 * ==============================================================================
 */

let allBookings = [];
let currentFilter = 'All';
let isManagerMode = false;

document.addEventListener('DOMContentLoaded', () => {
  loadBookings();
  setupFilterButtons();
  setupSearch();
  setupManagerToggle();
});

/**
 * Fetch bookings from server
 */
async function loadBookings() {
  const tableBody = document.getElementById('appointmentsTableBody');
  if (!tableBody) return;

  tableBody.innerHTML = `
    <tr>
      <td colspan="8" style="text-align: center; padding: 2rem;">
        <span style="color: var(--text-muted);">Loading appointment records...</span>
      </td>
    </tr>
  `;

  try {
    const res = await fetch('/api/bookings');
    const data = await res.json();

    if (data.success) {
      allBookings = data.data;
      updateStats(allBookings);
      renderTable(applyFilters());
    } else {
      tableBody.innerHTML = `<tr><td colspan="8" style="text-align: center; color: var(--danger);">Failed to load bookings.</td></tr>`;
    }
  } catch (err) {
    tableBody.innerHTML = `<tr><td colspan="8" style="text-align: center; color: var(--danger);">Network error retrieving appointments.</td></tr>`;
  }
}

/**
 * Update Dashboard Stat Cards
 */
function updateStats(bookings) {
  const total = bookings.length;
  const confirmed = bookings.filter(b => b.status === 'Confirmed').length;
  const inProgress = bookings.filter(b => b.status === 'In Progress').length;
  const completed = bookings.filter(b => b.status === 'Completed').length;

  const elTotal = document.getElementById('statTotal');
  const elConfirmed = document.getElementById('statConfirmed');
  const elProgress = document.getElementById('statProgress');
  const elCompleted = document.getElementById('statCompleted');

  if (elTotal) elTotal.textContent = total;
  if (elConfirmed) elConfirmed.textContent = confirmed;
  if (elProgress) elProgress.textContent = inProgress;
  if (elCompleted) elCompleted.textContent = completed;
}

/**
 * Filter bookings based on status and search query
 */
function applyFilters() {
  const searchInput = document.getElementById('appointmentSearch');
  const query = searchInput ? searchInput.value.trim().toLowerCase() : '';

  return allBookings.filter(b => {
    // Status Filter
    const matchesStatus = (currentFilter === 'All') || (b.status.toLowerCase() === currentFilter.toLowerCase());

    // Search Query Filter
    const matchesQuery = !query || 
      b.id.toLowerCase().includes(query) ||
      (b.customer && b.customer.name.toLowerCase().includes(query)) ||
      (b.customer && b.customer.phone.includes(query)) ||
      (b.service && b.service.name.toLowerCase().includes(query)) ||
      (b.technician && b.technician.name.toLowerCase().includes(query));

    return matchesStatus && matchesQuery;
  });
}

/**
 * Render filtered bookings into the HTML Table
 */
function renderTable(bookings) {
  const tableBody = document.getElementById('appointmentsTableBody');
  if (!tableBody) return;

  if (bookings.length === 0) {
    tableBody.innerHTML = `
      <tr>
        <td colspan="8" style="text-align: center; padding: 3rem;">
          <div style="font-size: 2.5rem; margin-bottom: 0.5rem;">📂</div>
          <h4 style="font-size: 1.1rem; color: var(--text-primary);">No appointments found</h4>
          <p style="color: var(--text-muted); font-size: 0.875rem;">Try changing your filter criteria or book a new appointment.</p>
        </td>
      </tr>
    `;
    return;
  }

  let html = '';
  bookings.forEach(b => {
    // Map status to badge class
    let badgeClass = 'badge-confirmed';
    if (b.status === 'In Progress') badgeClass = 'badge-progress';
    else if (b.status === 'Completed') badgeClass = 'badge-completed';
    else if (b.status === 'Cancelled') badgeClass = 'badge-cancelled';

    // Format Date nicely
    const dateFormatted = b.schedule ? b.schedule.date : 'N/A';
    const timeSlot = b.schedule ? b.schedule.timeSlot : 'N/A';

    html += `
      <tr>
        <td>
          <span style="font-weight: 700; color: var(--primary); font-family: monospace; font-size: 0.95rem;">${escapeHtml(b.id)}</span>
        </td>
        <td>
          <div style="font-weight: 700; color: var(--text-primary);">${escapeHtml(b.customer?.name || 'Customer')}</div>
          <div style="font-size: 0.8rem; color: var(--text-muted);">${escapeHtml(b.customer?.phone || '')}</div>
        </td>
        <td>
          <div style="font-weight: 600;">${escapeHtml(b.service?.name || 'Service')}</div>
          <div style="font-size: 0.775rem; color: var(--text-muted);">
            ${escapeHtml(b.service?.category || '')}
            ${b.subServices && b.subServices.length > 0 ? ` • ${b.subServices.length} task${b.subServices.length > 1 ? 's' : ''}` : ''}
          </div>
        </td>
        <td>
          <div style="font-weight: 600;">${escapeHtml(b.technician?.name || 'Assigned Specialist')}</div>
          <div style="font-size: 0.775rem; color: #B45309;">★ ${b.technician?.rating || '4.9'} Verified</div>
        </td>
        <td>
          <div style="font-weight: 600;">${dateFormatted}</div>
          <div style="font-size: 0.8rem; color: var(--text-muted);">${timeSlot}</div>
        </td>
        <td>
          <span style="font-weight: 800; color: var(--text-primary);">₹${b.pricing?.totalAmount || 0}</span>
        </td>
        <td>
          <span class="badge ${badgeClass}">
            <span class="badge-dot"></span>
            ${escapeHtml(b.status)}
          </span>
        </td>
        <td>
          <div style="display: flex; align-items: center; gap: 0.5rem;">
            <button class="btn btn-secondary btn-sm" onclick="viewReceipt('${b.id}')" title="View Booking Slip">
              🧾 Slip
            </button>
            ${
              b.status !== 'Cancelled' && b.status !== 'Completed' ? `
                <button class="btn btn-outline-danger btn-sm" onclick="cancelBooking('${b.id}')" title="Cancel Appointment">
                  ✕ Cancel
                </button>
              ` : ''
            }
            ${
              isManagerMode && b.status !== 'Completed' && b.status !== 'Cancelled' ? `
                <button class="btn btn-primary btn-sm" onclick="advanceStatus('${b.id}', '${b.status}')" title="Manager Advance">
                  ➜ Next Status
                </button>
              ` : ''
            }
          </div>
        </td>
      </tr>
    `;
  });

  tableBody.innerHTML = html;
}

/**
 * Filter buttons handler
 */
function setupFilterButtons() {
  const buttons = document.querySelectorAll('.filter-btn');
  buttons.forEach(btn => {
    btn.addEventListener('click', () => {
      buttons.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      currentFilter = btn.getAttribute('data-filter') || 'All';
      renderTable(applyFilters());
    });
  });
}

/**
 * Search input listener
 */
function setupSearch() {
  const searchInput = document.getElementById('appointmentSearch');
  if (!searchInput) return;

  searchInput.addEventListener('input', () => {
    renderTable(applyFilters());
  });
}

/**
 * Cancel an appointment via PATCH request
 */
async function cancelBooking(bookingId) {
  if (!confirm(`Are you sure you want to cancel appointment ${bookingId}?`)) {
    return;
  }

  try {
    const res = await fetch(`/api/bookings/${bookingId}/cancel`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' }
    });

    const data = await res.json();

    if (data.success) {
      showToast(`Appointment ${bookingId} has been cancelled.`, 'info');
      // Update local array
      const idx = allBookings.findIndex(b => b.id === bookingId);
      if (idx !== -1) {
        allBookings[idx].status = 'Cancelled';
        updateStats(allBookings);
        renderTable(applyFilters());
      }
    } else {
      showToast(data.message || 'Failed to cancel appointment.', 'error');
    }
  } catch (err) {
    showToast('Network error cancelling booking.', 'error');
  }
}

/**
 * Service Manager Demo Toggle (Advance Status)
 */
function setupManagerToggle() {
  const toggle = document.getElementById('managerModeToggle');
  if (!toggle) return;

  toggle.addEventListener('change', (e) => {
    isManagerMode = e.target.checked;
    const badge = document.getElementById('managerModeBadge');
    if (badge) {
      badge.style.display = isManagerMode ? 'inline-block' : 'none';
    }
    showToast(isManagerMode ? 'Service Manager View Active: Status edit enabled.' : 'Customer View Active.', 'info');
    renderTable(applyFilters());
  });
}

async function advanceStatus(bookingId, currentStatus) {
  const nextStatus = currentStatus === 'Confirmed' ? 'In Progress' : 'Completed';

  try {
    const res = await fetch(`/api/bookings/${bookingId}/status`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: nextStatus })
    });

    const data = await res.json();
    if (data.success) {
      showToast(`Booking ${bookingId} updated to "${nextStatus}".`, 'success');
      const idx = allBookings.findIndex(b => b.id === bookingId);
      if (idx !== -1) {
        allBookings[idx].status = nextStatus;
        updateStats(allBookings);
        renderTable(applyFilters());
      }
    }
  } catch (e) {
    showToast('Failed to update status.', 'error');
  }
}

/**
 * View / Print Booking Receipt Modal
 */
function viewReceipt(bookingId) {
  const booking = allBookings.find(b => b.id === bookingId);
  if (!booking) return;

  const modal = document.getElementById('receiptModal');
  if (!modal) return;

  document.getElementById('receiptId').textContent = booking.id;
  document.getElementById('receiptStatus').textContent = booking.status;
  document.getElementById('receiptDate').textContent = `${booking.schedule.date} (${booking.schedule.timeSlot})`;
  document.getElementById('receiptCustomer').textContent = `${booking.customer.name} | ${booking.customer.phone}`;
  document.getElementById('receiptAddress').textContent = `${booking.customer.address}, ${booking.customer.city} - ${booking.customer.pincode}`;
  document.getElementById('receiptService').textContent = booking.service.name;
  document.getElementById('receiptTechnician').textContent = `${booking.technician.name} (${booking.technician.phone})`;
  document.getElementById('receiptPayment').textContent = booking.paymentMethod;

  // Included sub-services / tasks
  const subServicesContainer = document.getElementById('receiptSubServicesContainer');
  const subServicesList = document.getElementById('receiptSubServicesList');
  if (subServicesContainer && subServicesList) {
    if (booking.subServices && booking.subServices.length > 0) {
      subServicesList.innerHTML = booking.subServices
        .map(item => `<li>${escapeHtml(typeof item === 'object' ? item.name : item)}</li>`)
        .join('');
      subServicesContainer.style.display = 'block';
    } else {
      subServicesContainer.style.display = 'none';
    }
  }

  // Breakdown
  const repairsAndAddons = booking.pricing?.addOnsTotal !== undefined ?
    booking.pricing.addOnsTotal :
    ((booking.pricing?.subServicesTotal || 0) + (booking.pricing?.addOnsOnlyTotal || 0));

  document.getElementById('receiptBasePrice').textContent = `₹${booking.pricing?.basePrice || 0}`;
  document.getElementById('receiptAddons').textContent = `₹${repairsAndAddons}`;
  document.getElementById('receiptTax').textContent = `₹${booking.pricing?.tax || 0}`;
  document.getElementById('receiptTotal').textContent = `₹${booking.pricing?.totalAmount || 0}`;

  modal.classList.add('active');
}

function closeReceiptModal() {
  const modal = document.getElementById('receiptModal');
  if (modal) modal.classList.remove('active');
}
