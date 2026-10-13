/**
 * ==============================================================================
 * HomeEase Mini - Home Service Appointment Booking Server
 * ==============================================================================
 * Course / Evaluation: Student Web Application Project
 * Architecture:
 * - Runtime: Node.js
 * - Framework: Express.js
 * - Persistence: JSON File Storage (fs module)
 * - Frontend: Single-Page Application (HTML5, CSS3, Vanilla JS)
 * ==============================================================================
 */

const express = require("express");
const fs = require("fs");
const path = require("path");

const app = express();
const DEFAULT_PORT = process.env.PORT || 3000;

// Data file paths
const DATA_DIR = path.join(__dirname, "data");
const SERVICES_FILE = path.join(DATA_DIR, "services.json");
const BOOKINGS_FILE = path.join(DATA_DIR, "bookings.json");

// Ensure data folder exists
if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

// Ensure bookings file exists
if (!fs.existsSync(BOOKINGS_FILE)) {
  fs.writeFileSync(BOOKINGS_FILE, JSON.stringify([], null, 2), "utf-8");
}

// ------------------------------------------------------------------------------
// Middleware Configuration
// ------------------------------------------------------------------------------
// Parse URL-encoded forms
app.use(express.urlencoded({ extended: true }));
// Parse JSON payloads from fetch()
app.use(express.json());

// Serve static frontend assets from the "public" folder
app.use(express.static(path.join(__dirname, "public")));

// ------------------------------------------------------------------------------
// Helper Functions for JSON File Persistence
// ------------------------------------------------------------------------------
function readJSONFile(filePath) {
  try {
    const rawData = fs.readFileSync(filePath, "utf-8");
    return JSON.parse(rawData);
  } catch (error) {
    console.error(`Error reading ${filePath}:`, error.message);
    return [];
  }
}

function writeJSONFile(filePath, data) {
  try {
    fs.writeFileSync(filePath, JSON.stringify(data, null, 2), "utf-8");
    return true;
  } catch (error) {
    console.error(`Error writing to ${filePath}:`, error.message);
    return false;
  }
}

// ------------------------------------------------------------------------------
// REST API ENDPOINTS
// ------------------------------------------------------------------------------

/**
 * 1. GET /api/services
 * Returns the catalog of home services available for booking.
 */
app.get("/api/services", (req, res) => {
  const services = readJSONFile(SERVICES_FILE);
  res.json({ success: true, services });
});

/**
 * 2. GET /api/bookings
 * Retrieves appointments.
 * Supports optional queries: ?phone=9876543210 or ?search=HE-1001
 */
app.get("/api/bookings", (req, res) => {
  const bookings = readJSONFile(BOOKINGS_FILE);
  const { phone, search } = req.query;

  let filtered = bookings;

  if (phone) {
    filtered = filtered.filter(
      (b) => b.customerPhone && b.customerPhone.trim() === phone.trim()
    );
  }

  if (search) {
    const term = search.trim().toLowerCase();
    filtered = filtered.filter(
      (b) =>
        (b.id && b.id.toLowerCase().includes(term)) ||
        (b.customerName && b.customerName.toLowerCase().includes(term)) ||
        (b.serviceName && b.serviceName.toLowerCase().includes(term))
    );
  }

  res.json({ success: true, total: filtered.length, bookings: filtered });
});

/**
 * 3. GET /api/bookings/:id
 * Retrieve a specific appointment by ID.
 */
app.get("/api/bookings/:id", (req, res) => {
  const bookings = readJSONFile(BOOKINGS_FILE);
  const bookingId = req.params.id.trim().toUpperCase();
  const found = bookings.find((b) => b.id.toUpperCase() === bookingId);

  if (!found) {
    return res.status(404).json({
      success: false,
      message: `Appointment with ID ${bookingId} not found.`,
    });
  }

  res.json({ success: true, booking: found });
});

/**
 * 4. POST /api/bookings
 * Create and persist a new appointment booking.
 */
app.post("/api/bookings", (req, res) => {
  const {
    customerName,
    customerPhone,
    customerEmail,
    serviceId,
    serviceName,
    servicePrice,
    appointmentDate,
    appointmentSlot,
    address,
    notes,
  } = req.body;

  // Basic validation
  if (!customerName || !customerPhone || !serviceName || !appointmentDate || !appointmentSlot || !address) {
    return res.status(400).json({
      success: false,
      message: "Please fill in all required fields (Name, Phone, Service, Date, Time Slot, and Address).",
    });
  }

  // Validate Phone: exactly 10 digits
  const phoneClean = customerPhone.trim();
  if (!/^[0-9]{10}$/.test(phoneClean)) {
    return res.status(400).json({
      success: false,
      message: "Phone number must be exactly 10 digits.",
    });
  }

  // Validate Email if entered
  if (customerEmail && customerEmail.trim()) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
    if (!emailRegex.test(customerEmail.trim())) {
      return res.status(400).json({
        success: false,
        message: "Please enter a valid email address (e.g. name@example.com).",
      });
    }
  }

  const bookings = readJSONFile(BOOKINGS_FILE);

  // Generate unique appointment ID (e.g., HE-1042)
  let newId;
  let isUnique = false;
  while (!isUnique) {
    const randomNum = Math.floor(1000 + Math.random() * 9000);
    newId = `HE-${randomNum}`;
    if (!bookings.some((b) => b.id === newId)) {
      isUnique = true;
    }
  }

  const newBooking = {
    id: newId,
    customerName: customerName.trim(),
    customerPhone: customerPhone.trim(),
    customerEmail: customerEmail ? customerEmail.trim() : "",
    serviceId: serviceId || "custom-service",
    serviceName: serviceName.trim(),
    servicePrice: Number(servicePrice) || 399,
    appointmentDate,
    appointmentSlot,
    address: address.trim(),
    notes: notes ? notes.trim() : "No special instructions provided.",
    status: "Confirmed",
    createdAt: new Date().toISOString(),
  };

  bookings.unshift(newBooking); // Add newest booking to top

  const writeSuccess = writeJSONFile(BOOKINGS_FILE, bookings);

  if (!writeSuccess) {
    return res.status(500).json({
      success: false,
      message: "Failed to save appointment to storage.",
    });
  }

  res.status(201).json({
    success: true,
    message: "Appointment successfully booked!",
    booking: newBooking,
  });
});

/**
 * 5. Update Appointment Status (Service Manager & Cancellation)
 * Supports PATCH and POST on /api/bookings/:id/status and /api/bookings/:id/cancel
 */
function updateBookingStatusHandler(req, res) {
  const bookings = readJSONFile(BOOKINGS_FILE);
  const bookingId = req.params.id.trim().toUpperCase();
  const index = bookings.findIndex((b) => b.id.toUpperCase() === bookingId);

  if (index === -1) {
    return res.status(404).json({
      success: false,
      message: `Appointment ${bookingId} not found.`,
    });
  }

  // Determine target status
  let newStatus = req.body && req.body.status ? req.body.status : "Cancelled";
  if (req.path.endsWith("/cancel")) {
    newStatus = "Cancelled";
  }

  const validStatuses = ["Confirmed", "In Progress", "Completed", "Cancelled"];
  if (!validStatuses.includes(newStatus)) {
    return res.status(400).json({
      success: false,
      message: `Invalid status "${newStatus}". Allowed values: ${validStatuses.join(", ")}`,
    });
  }

  bookings[index].status = newStatus;
  bookings[index].updatedAt = new Date().toISOString();
  if (newStatus === "Cancelled") {
    bookings[index].cancelledAt = new Date().toISOString();
  }

  writeJSONFile(BOOKINGS_FILE, bookings);

  res.json({
    success: true,
    message: `Appointment ${bookingId} status updated to "${newStatus}".`,
    booking: bookings[index],
  });
}

app.patch("/api/bookings/:id/status", updateBookingStatusHandler);
app.post("/api/bookings/:id/status", updateBookingStatusHandler);
app.patch("/api/bookings/:id/cancel", updateBookingStatusHandler);
app.post("/api/bookings/:id/cancel", updateBookingStatusHandler);

// ------------------------------------------------------------------------------
// Start Server with Graceful Port Conflict Handling
// ------------------------------------------------------------------------------
function startServer(port) {
  const server = app.listen(port, () => {
    console.log("====================================================");
    console.log(`🚀 HomeEase Mini Server running at http://localhost:${port}`);
    console.log(`📁 Static Frontend: ${path.join(__dirname, "public")}`);
    console.log(`💾 JSON Data Directory: ${DATA_DIR}`);
    console.log("====================================================");
  });

  server.on("error", (err) => {
    if (err.code === "EADDRINUSE") {
      const nextPort = Number(port) + 1;
      console.log(`⚠️ Port ${port} is occupied. Attempting port ${nextPort}...`);
      startServer(nextPort);
    } else {
      console.error("Server error:", err);
    }
  });
}

startServer(DEFAULT_PORT);
