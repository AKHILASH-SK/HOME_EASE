/**
 * ==============================================================================
 * HomeEase - Home Service Appointment Booking Server
 * ==============================================================================
 * Course: U21AD502 - Application Development
 * Institution: KPR Institute of Engineering and Technology, Coimbatore
 * 
 * Technology Stack:
 * - Node.js Runtime
 * - Express.js Web Application Framework
 * - File-System Storage (Zero Database - Data stored in JSON files)
 * ==============================================================================
 */

const express = require('express');
const path = require('path');
const fs = require('fs').promises;

const app = express();
const PORT = process.env.PORT || 3000;

// Data directory path (db folder)
const DATA_DIR = path.join(__dirname, '..', 'db');
const SERVICES_FILE = path.join(DATA_DIR, 'services.json');
const TECHNICIANS_FILE = path.join(DATA_DIR, 'technicians.json');
const BOOKINGS_FILE = path.join(DATA_DIR, 'bookings.json');
const USERS_FILE = path.join(DATA_DIR, 'users.json');

// Frontend directory path (fe folder)
const FE_DIR = path.join(__dirname, '..', 'fe');

// ==============================================================================
// MIDDLEWARE CONFIGURATION
// ==============================================================================
// Parse incoming JSON request bodies
app.use(express.json());
// Parse URL-encoded form data
app.use(express.urlencoded({ extended: true }));
// Serve static client assets (HTML, CSS, JS, images) from the "fe" directory
app.use(express.static(FE_DIR));

// Direct route for authenticated customer home screen
app.get('/home', (req, res) => {
  res.sendFile(path.join(FE_DIR, 'home.html'));
});

// ==============================================================================
// HELPER FUNCTIONS FOR FILE SYSTEM (JSON) OPERATIONS
// ==============================================================================
/**
 * Asynchronously read and parse JSON file from disk
 * @param {string} filePath - Absolute path to JSON file
 * @returns {Promise<any>} Parsed JavaScript object/array
 */
async function readJsonFile(filePath) {
  try {
    const data = await fs.readFile(filePath, 'utf-8');
    return JSON.parse(data);
  } catch (error) {
    console.error(`Error reading ${filePath}:`, error.message);
    return [];
  }
}

/**
 * Asynchronously serialize and write JSON data to disk with indentation
 * @param {string} filePath - Absolute path to JSON file
 * @param {any} data - Data to persist
 */
async function writeJsonFile(filePath, data) {
  try {
    await fs.writeFile(filePath, JSON.stringify(data, null, 2), 'utf-8');
    return true;
  } catch (error) {
    console.error(`Error writing ${filePath}:`, error.message);
    throw error;
  }
}

// ==============================================================================
// CLIENT-FACING HTML ROUTES
// ==============================================================================
app.get('/', (req, res) => {
  res.sendFile(path.join(FE_DIR, 'index.html'));
});

app.get('/book', (req, res) => {
  res.sendFile(path.join(FE_DIR, 'book.html'));
});

app.get('/appointments', (req, res) => {
  res.sendFile(path.join(FE_DIR, 'appointments.html'));
});

// ==============================================================================
// REST API ENDPOINTS
// ==============================================================================

/**
 * GET /api/services
 * Description: Retrieve catalog of all available home services
 */
app.get('/api/services', async (req, res) => {
  try {
    const services = await readJsonFile(SERVICES_FILE);
    res.status(200).json({ success: true, count: services.length, data: services });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to retrieve services.' });
  }
});

/**
 * GET /api/technicians
 * Description: Retrieve certified technicians, optionally filtered by service category
 * Query params: ?category=Electrical
 */
app.get('/api/technicians', async (req, res) => {
  try {
    const { category } = req.query;
    let technicians = await readJsonFile(TECHNICIANS_FILE);

    if (category) {
      technicians = technicians.filter(
        t => t.category.toLowerCase() === category.toLowerCase()
      );
    }

    res.status(200).json({ success: true, count: technicians.length, data: technicians });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to retrieve technicians.' });
  }
});

/**
 * GET /api/bookings
 * Description: Retrieve all bookings with optional query filters (status, phone, search)
 */
app.get('/api/bookings', async (req, res) => {
  try {
    const { status, phone, search } = req.query;
    let bookings = await readJsonFile(BOOKINGS_FILE);

    if (status && status !== 'All') {
      bookings = bookings.filter(b => b.status.toLowerCase() === status.toLowerCase());
    }

    if (phone) {
      bookings = bookings.filter(b => b.customer && b.customer.phone === phone);
    }

    if (search) {
      const q = search.toLowerCase();
      bookings = bookings.filter(b => 
        b.id.toLowerCase().includes(q) ||
        (b.customer && b.customer.name.toLowerCase().includes(q)) ||
        (b.customer && b.customer.phone.includes(q)) ||
        (b.service && b.service.name.toLowerCase().includes(q))
      );
    }

    res.status(200).json({ success: true, count: bookings.length, data: bookings });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to read bookings from file system.' });
  }
});

/**
 * GET /api/bookings/:id
 * Description: Retrieve a single booking by its unique ID (e.g., HE-8021)
 */
app.get('/api/bookings/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const bookings = await readJsonFile(BOOKINGS_FILE);
    const booking = bookings.find(b => b.id.toUpperCase() === id.toUpperCase());

    if (!booking) {
      return res.status(404).json({ success: false, message: `Booking ${id} not found.` });
    }

    res.status(200).json({ success: true, data: booking });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Error retrieving booking.' });
  }
});

/**
 * POST /api/bookings
 * Description: Create a new home service appointment and persist to bookings.json
 */
app.post('/api/bookings', async (req, res) => {
  try {
    const {
      customer,
      serviceId,
      subServices = [],
      technicianId,
      schedule,
      paymentMethod = 'Cash on Delivery',
      specialNotes = '',
      addOns = []
    } = req.body;

    // Server-side validation of mandatory fields
    if (!customer || !customer.name || !customer.phone || !customer.address) {
      return res.status(400).json({
        success: false,
        message: 'Validation Error: Customer name, phone, and complete address are required.'
      });
    }

    if (!serviceId || !schedule || !schedule.date || !schedule.timeSlot) {
      return res.status(400).json({
        success: false,
        message: 'Validation Error: Service, appointment date, and time slot are required.'
      });
    }

    // Read services and technicians from file system
    const services = await readJsonFile(SERVICES_FILE);
    const technicians = await readJsonFile(TECHNICIANS_FILE);
    const bookings = await readJsonFile(BOOKINGS_FILE);

    // Identify the service
    const selectedService = services.find(s => s.id === serviceId);
    if (!selectedService) {
      return res.status(404).json({ success: false, message: 'Selected service does not exist.' });
    }

    // Allocate Technician
    let assignedTech = null;
    if (technicianId && technicianId !== 'auto') {
      assignedTech = technicians.find(t => t.id === technicianId);
    }
    
    // If not found or "auto", pick the top-rated available specialist in this category
    if (!assignedTech) {
      const categoryTechs = technicians.filter(t => t.category === selectedService.category);
      assignedTech = categoryTechs[0] || technicians[0];
    }

    // Calculate Pricing
    const basePrice = Number(selectedService.basePrice) || 299;
    
    // Calculate Sub-Services (Specific Repairs/Tasks) total
    let subServicesTotal = 0;
    if (Array.isArray(subServices) && selectedService.subServices) {
      subServices.forEach(subItem => {
        const subIdentifier = typeof subItem === 'object' && subItem !== null ? (subItem.name || subItem.id) : subItem;
        const matched = selectedService.subServices.find(
          s => s.name === subIdentifier || s.id === subIdentifier
        );
        if (matched) {
          subServicesTotal += (Number(matched.price) || 0);
        } else if (typeof subItem === 'object' && subItem.price) {
          subServicesTotal += (Number(subItem.price) || 0);
        }
      });
    }

    // Calculate Add-on totals
    let addOnsOnlyTotal = 0;
    if (Array.isArray(addOns)) {
      addOns.forEach(add => {
        const addIdentifier = typeof add === 'object' && add !== null ? (add.id || add.name) : add;
        const matched = selectedService.addOns ? selectedService.addOns.find(
          a => a.id === addIdentifier || a.name === addIdentifier
        ) : null;
        if (matched) {
          addOnsOnlyTotal += (Number(matched.price) || 0);
        } else if (typeof add === 'object' && add.price) {
          addOnsOnlyTotal += (Number(add.price) || 0);
        }
      });
    }

    // Combined repairs & add-ons total (matching frontend line-item)
    const combinedAddOnsTotal = subServicesTotal + addOnsOnlyTotal;
    const subTotal = basePrice + combinedAddOnsTotal;
    const tax = Math.round(subTotal * 0.18); // 18% GST standard service tax
    const totalAmount = subTotal + tax;

    // Generate unique 4-digit Booking Reference Code (e.g. HE-4192)
    const randomCode = Math.floor(1000 + Math.random() * 9000);
    const bookingId = `HE-${randomCode}`;

    // Construct the complete booking record
    const newBooking = {
      id: bookingId,
      createdAt: new Date().toISOString(),
      customer: {
        name: customer.name.trim(),
        phone: customer.phone.trim(),
        email: (customer.email || '').trim(),
        address: customer.address.trim(),
        city: customer.city || 'Coimbatore',
        pincode: customer.pincode || '641004'
      },
      service: {
        id: selectedService.id,
        name: selectedService.name,
        category: selectedService.category
      },
      subServices: Array.isArray(subServices) ? subServices : [],
      technician: {
        id: assignedTech.id,
        name: assignedTech.name,
        phone: assignedTech.phone,
        role: assignedTech.role,
        rating: assignedTech.rating
      },
      schedule: {
        date: schedule.date,
        timeSlot: schedule.timeSlot
      },
      pricing: {
        basePrice,
        subServicesTotal,
        addOnsOnlyTotal,
        addOnsTotal: combinedAddOnsTotal,
        tax,
        totalAmount
      },
      paymentMethod,
      specialNotes,
      status: 'Confirmed'
    };

    // Prepend to bookings array (newest first) and persist to JSON file
    bookings.unshift(newBooking);
    await writeJsonFile(BOOKINGS_FILE, bookings);

    console.log(`[File System] Saved appointment ${bookingId} to ${BOOKINGS_FILE}`);

    res.status(201).json({
      success: true,
      message: 'Appointment scheduled successfully!',
      data: newBooking
    });
  } catch (error) {
    console.error('Error creating booking:', error);
    res.status(500).json({ success: false, message: 'Server error persisting appointment.' });
  }
});

/**
 * PATCH /api/bookings/:id/cancel
 * Description: Cancel an active appointment in bookings.json
 */
app.patch('/api/bookings/:id/cancel', async (req, res) => {
  try {
    const { id } = req.params;
    const bookings = await readJsonFile(BOOKINGS_FILE);
    const index = bookings.findIndex(b => b.id.toUpperCase() === id.toUpperCase());

    if (index === -1) {
      return res.status(404).json({ success: false, message: `Booking ${id} not found.` });
    }

    bookings[index].status = 'Cancelled';
    bookings[index].cancelledAt = new Date().toISOString();

    await writeJsonFile(BOOKINGS_FILE, bookings);
    console.log(`[File System] Cancelled booking ${id}`);

    res.status(200).json({
      success: true,
      message: `Appointment ${id} has been cancelled.`,
      data: bookings[index]
    });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to update booking status.' });
  }
});

/**
 * PATCH /api/bookings/:id/status
 * Description: Service Manager endpoint to toggle status (In Progress, Completed)
 */
app.patch('/api/bookings/:id/status', async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    const validStatuses = ['Confirmed', 'In Progress', 'Completed', 'Cancelled'];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({ success: false, message: 'Invalid status value.' });
    }

    const bookings = await readJsonFile(BOOKINGS_FILE);
    const index = bookings.findIndex(b => b.id.toUpperCase() === id.toUpperCase());

    if (index === -1) {
      return res.status(404).json({ success: false, message: `Booking ${id} not found.` });
    }

    bookings[index].status = status;
    bookings[index].updatedAt = new Date().toISOString();

    await writeJsonFile(BOOKINGS_FILE, bookings);

    res.status(200).json({
      success: true,
      message: `Status of ${id} updated to ${status}.`,
      data: bookings[index]
    });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to update status.' });
  }
});

/**
 * GET /api/stats
 * Description: Summary metrics for the Admin/Manager dashboard
 */
app.get('/api/stats', async (req, res) => {
  try {
    const bookings = await readJsonFile(BOOKINGS_FILE);
    const total = bookings.length;
    const confirmed = bookings.filter(b => b.status === 'Confirmed').length;
    const inProgress = bookings.filter(b => b.status === 'In Progress').length;
    const completed = bookings.filter(b => b.status === 'Completed').length;
    const cancelled = bookings.filter(b => b.status === 'Cancelled').length;
    const totalRevenue = bookings
      .filter(b => b.status === 'Completed')
      .reduce((acc, b) => acc + (b.pricing?.totalAmount || 0), 0);

    res.status(200).json({
      success: true,
      data: {
        total,
        confirmed,
        inProgress,
        completed,
        cancelled,
        totalRevenue
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to compute stats.' });
  }
});

/**
 * POST /api/auth/register
 * Description: Basic user sign-up stored in users.json
 */
app.post('/api/auth/register', async (req, res) => {
  try {
    const { name, email, phone, password, city = 'Coimbatore' } = req.body;

    if (!name || !email || !phone || !password) {
      return res.status(400).json({ success: false, message: 'All fields are required.' });
    }

    const users = await readJsonFile(USERS_FILE);
    const existing = users.find(u => u.email.toLowerCase() === email.toLowerCase());

    if (existing) {
      return res.status(409).json({ success: false, message: 'An account with this email already exists.' });
    }

    const newUser = {
      id: `usr-${Date.now()}`,
      name: name.trim(),
      email: email.toLowerCase().trim(),
      password: password.trim(),
      phone: phone.trim(),
      city: city.trim(),
      role: 'customer',
      joinedAt: new Date().toISOString()
    };

    users.push(newUser);
    await writeJsonFile(USERS_FILE, users);

    // Do not return plain password in response
    const { password: _, ...safeUser } = newUser;
    res.status(201).json({ success: true, message: 'Account created successfully!', data: safeUser });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Registration failed.' });
  }
});

/**
 * POST /api/auth/login
 * Description: Verify customer or admin credentials from users.json
 */
app.post('/api/auth/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ success: false, message: 'Email and password required.' });
    }

    const users = await readJsonFile(USERS_FILE);
    const user = users.find(
      u => u.email.toLowerCase() === email.toLowerCase().trim() && u.password === password.trim()
    );

    if (!user) {
      return res.status(401).json({ success: false, message: 'Invalid email or password.' });
    }

    const { password: _, ...safeUser } = user;
    res.status(200).json({ success: true, message: 'Login successful!', data: safeUser });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Login processing failed.' });
  }
});

// ==============================================================================
// START SERVER
// ==============================================================================
const server = app.listen(PORT, () => {
  console.log('====================================================');
  console.log(`🚀 HomeEase Server running on http://localhost:${PORT}`);
  console.log(`📁 File-System Data Storage: ${DATA_DIR}`);
  console.log('====================================================');
});

server.on('error', (err) => {
  if (err.code === 'EADDRINUSE') {
    console.error(`\n⚠️  Port ${PORT} is already in use by an active background process.`);
    console.error(`   To free port ${PORT}, close other running terminals or specify another port:\n   PORT=3001 npm start\n`);
    process.exit(1);
  } else {
    throw err;
  }
});
