/**
 * ==============================================================================
 * HomeEase - Simple Appointment Booking Client Script
 * ==============================================================================
 */

// Handle Form Submission asynchronously (smooth experience)
document.addEventListener("DOMContentLoaded", () => {
  const form = document.getElementById("appointmentForm");
  const saveAlert = document.getElementById("saveAlert");

  if (form) {
    form.addEventListener("submit", async (e) => {
      e.preventDefault();

      const appointmentId = document.getElementById("appointmentId").value.trim();
      const customerName = document.getElementById("customerName").value.trim();
      const customerPhone = document.getElementById("customerPhone").value.trim();
      const serviceCategory = document.getElementById("serviceCategory").value;
      const appointmentSlot = document.getElementById("appointmentSlot").value;
      const problemDetails = document.getElementById("problemDetails").value.trim();

      const payload = {
        appointmentId,
        customerName,
        customerPhone,
        serviceCategory,
        appointmentSlot,
        problemDetails
      };

      try {
        const response = await fetch("/save-appointment", {
          method: "POST",
          headers: {
            "Content-Type": "application/json"
          },
          body: JSON.stringify(payload)
        });

        const message = await response.text();

        if (response.ok) {
          saveAlert.className = "alert alert-success";
          saveAlert.style.display = "block";
          saveAlert.innerHTML = `✅ <strong>Success:</strong> ${message}<br><small>File persisted as <code>appointments/${appointmentId}.txt</code></small>`;

          // Automatically set search input to this ID for easy testing
          document.getElementById("searchId").value = appointmentId;

          // Clear form fields
          form.reset();
        } else {
          saveAlert.className = "alert alert-error";
          saveAlert.style.display = "block";
          saveAlert.textContent = `❌ ${message}`;
        }
      } catch (err) {
        saveAlert.className = "alert alert-error";
        saveAlert.style.display = "block";
        saveAlert.textContent = "❌ Network communication error with the Node.js server.";
      }
    });
  }
});

/**
 * Retrieve Appointment Record from Server by ID
 */
function getAppointment() {
  const searchInput = document.getElementById("searchId");
  const appointmentId = searchInput.value.trim();
  const resultDiv = document.getElementById("result");

  // Check whether ID was entered
  if (appointmentId === "") {
    alert("Please enter an Appointment ID (e.g. APT101)");
    searchInput.focus();
    return;
  }

  // Send request to Node.js server
  fetch("/get-appointment/" + encodeURIComponent(appointmentId))
    .then((response) => {
      if (!response.ok) {
        throw new Error("Appointment record not found.");
      }
      return response.text();
    })
    .then((data) => {
      // Display report in result box
      resultDiv.style.display = "block";
      resultDiv.textContent = data;
      resultDiv.scrollIntoView({ behavior: "smooth", block: "nearest" });
    })
    .catch((error) => {
      resultDiv.style.display = "block";
      resultDiv.textContent = `⚠️ Appointment record "${appointmentId}" not found in appointments/ folder.\nPlease make sure the Appointment ID exists.`;
    });
}
