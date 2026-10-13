# HomeEase Mini - Home Service Appointment Booking

A lightweight, clean, and modern full-stack single-page web application built with **HTML5, CSS3, Vanilla JavaScript, and Node.js + Express**. Designed specifically for student laboratory evaluations, mini-projects, and academic presentations.

---

## 📌 Project Overview

**HomeEase Mini** bridges the gap between an overly complex enterprise architecture and a plain HTML form. It provides an intuitive single-page interface where customers can:
1. **Sign In / Manage Profile**: Quick student-friendly session management stored in `localStorage`.
2. **Browse Service Catalog**: Dynamically loaded home services (Electrical, Plumbing, AC Servicing, Cleaning, Carpentry, Painting) with category filters, pricing, and duration.
3. **Interactive Appointment Booking**: Real-time form with date selection, preferred time slots, address, and live price summary.
4. **Track & Cancel Appointments**: Instant appointment ID lookup, filter by customer, and appointment cancellation.
5. **Zero-Database JSON Persistence**: All appointments are stored persistently in `data/bookings.json` using Node's `fs` module.

---

## 📂 Directory Structure

```text
mini-website/
├── data/
│   ├── services.json       # Preloaded services catalog (prices, badges, icons)
│   └── bookings.json       # Persisted appointment records
├── public/                 # Client-side single-page application
│   ├── index.html          # Semantic HTML5 single-page layout
│   ├── style.css           # Modern, responsive CSS design
│   └── app.js              # Vanilla JS DOM manipulation & REST API integration
├── package.json            # Node.js manifest with start script
├── server.js               # Express server with REST endpoints & auto port handling
└── README.md               # Project guide and documentation
```

---

## 🚀 How to Run the Project

### Prerequisites
Make sure **Node.js** is installed on your computer.

### Step 1: Open Terminal & Navigate to `mini-website/`
```bash
cd "c:\Users\akhil\HOME SERVICE APPOINTMENT BOOKING\mini-website"
```

### Step 2: Start the Node.js Server
```bash
node server.js
```
*(or run `npm start`)*

### Step 3: Open in Browser
Visit the link displayed in the terminal:
```text
http://localhost:3000
```
> **Note**: If port 3000 is occupied by another process on your computer, the server will automatically switch to `http://localhost:3001` or `http://localhost:3002` without crashing!

---

## 🌐 REST API Endpoints

| Method | Endpoint | Description | Sample Response / Payload |
|---|---|---|---|
| `GET` | `/api/services` | Returns all available home services | `{ "success": true, "services": [...] }` |
| `GET` | `/api/bookings` | Returns all appointments (optional `?phone=...` or `?search=...`) | `{ "success": true, "total": 2, "bookings": [...] }` |
| `GET` | `/api/bookings/:id` | Returns single appointment by ID | `{ "success": true, "booking": { "id": "HE-1001", ... } }` |
| `POST` | `/api/bookings` | Creates a new appointment with an auto-generated ID (e.g. `HE-1042`) | Body: `{ customerName, customerPhone, serviceName, appointmentDate, ... }` |
| `PATCH` | `/api/bookings/:id/cancel` | Updates appointment status to "Cancelled" | `{ "success": true, "message": "Appointment HE-1001 has been cancelled." }` |

---

## 💡 Key Architectural Concepts for Evaluation / Viva

1. **Single-Page Application (SPA) UX**:
   No full-page reloads. All interactions (filtering categories, booking appointments, cancelling, searching) update the DOM asynchronously via JavaScript `fetch()` APIs.

2. **Decoupled Frontend and Backend**:
   - The frontend (`public/`) is pure client-side code (HTML, CSS, JS) that consumes the API.
   - The backend (`server.js`) is an Express REST server serving both the static files and JSON endpoints.

3. **Persistent File-System Storage**:
   Unlike temporary in-memory arrays that lose data when the server restarts, this project uses `fs.readFileSync` and `fs.writeFileSync` to write structured JSON directly to `data/bookings.json`.

4. **Input Validation & Safety**:
   - Minimum booking date dynamically restricted to today's date so past bookings cannot be selected.
   - 10-digit phone validation and required field verification on both client and server sides.
   - XSS sanitization helper (`escapeHtml`) on user input rendering.
