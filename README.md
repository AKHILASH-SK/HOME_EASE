# HomeEase — Home Service Appointment Booking Web Application

A full-stack, on-demand home service appointment booking platform built with **HTML5, CSS3, Vanilla JavaScript, and Node.js with Express**. 

All data is stored directly in the file system using **JSON files (No Database)**, fulfilling the academic requirements for **App Development Assignment 1 (U21AD502)** at **KPR Institute of Engineering and Technology, Coimbatore**.

---

## 🌟 Highlights & Features

- **Multi-Tier Architecture**:
  - `fe/`: Modern, responsive frontend with HTML5 semantic elements, Vanilla CSS3 (CSS Grid & Flexbox), and JavaScript ES6.
  - `be/`: Node.js + Express backend providing RESTful API endpoints and serving static assets.
  - `db/`: File-system data storage persisting appointments, service catalog, technicians, and user credentials in JSON files.
- **Dual-State User Experience**:
  - **Guest Landing Page**: Corporate company presentation with our mission, the 6 Quality Commitments (Police verification, 2-hour arrival, upfront pricing, genuine OEM parts, eco-safe agents, 30-day rework warranty), customer testimonials, and FAQs.
  - **Customer Dashboard (Post-Login)**: Personalized hub with KPI cards, upcoming appointment spotlight widget, interactive service catalog with direct booking actions, and transparent comparison table.
- **Interactive Booking Wizard (`fe/book.html`)**:
  - Dynamic sub-service & add-on selection.
  - Certified specialist technician picker (ratings, hourly fees, and auto-assign option).
  - HTML5 date picker restricting past dates.
  - Strict client-side regex validation (10-digit Indian phone numbers, valid email formats, minimum character lengths).
  - Live, real-time bill recalculator including base fee, add-ons, and 18% GST.
- **Management Dashboard (`fe/appointments.html`)**:
  - Master log of all appointments persisted to `db/bookings.json`.
  - Search by Booking ID, customer name, or phone number.
  - Filter tabs (`All`, `Confirmed`, `In Progress`, `Completed`, `Cancelled`).
  - Appointment cancellation feature (`PATCH /api/bookings/:id/cancel`).
  - Printable official booking receipt slip with full cost breakdown.
  - Service Manager mode toggle for live review demonstration.

---

## 📁 Directory Structure

```
HOME SERVICE APPOINTMENT BOOKING/
│
├── 📁 fe/                             # Frontend Layer (HTML, CSS, JS, Assets)
│   ├── 📄 index.html                  # Corporate Landing Page & Customer Portal
│   ├── 📄 book.html                   # Multi-step booking wizard with live bill calculation
│   ├── 📄 appointments.html           # Management dashboard (Master table, search, receipt)
│   ├── 📁 css/
│   │   ├── 📄 style.css               # Design system, custom color grade, cards, badges
│   │   └── 📄 responsive.css          # Mobile & tablet responsiveness
│   ├── 📁 js/
│   │   ├── 📄 main.js                 # Session state, view switcher, auth modal, toasts
│   │   ├── 📄 booking.js              # Technician picker, date limits, live bill engine
│   │   └── 📄 appointments.js         # Dynamic table rendering, cancel action, receipt slip
│   └── 📁 assets/
│       └── 📁 images/                 # Custom generated photography for all 6 services
│
├── 📁 be/                             # Backend Layer (Node.js & Express Server)
│   └── 📄 server.js                   # REST API endpoints & static serving
│
├── 📁 db/                             # Database Layer (JSON File-System Storage - Zero DB)
│   ├── 📄 services.json               # 6 service catalog items with pricing, addons, durations
│   ├── 📄 technicians.json            # Verified local technician profiles with ratings & contact
│   ├── 📄 bookings.json               # Master appointment store (persisted to disk)
│   └── 📄 users.json                  # Customer credentials
│
├── 📄 .gitignore                      # Excludes node_modules and OS files
├── 📄 package.json                    # Project configuration & npm start script
└── 📄 package-lock.json
```

---

## 🚀 Quick Start Guide

### Prerequisites
- [Node.js](https://nodejs.org/) (v16 or higher recommended)
- [Git](https://git-scm.com/)

### Installation & Run

1. **Clone the repository**:
   ```bash
   git clone https://github.com/AKHILASH-SK/HOME_EASE.git
   cd HOME_EASE
   ```

2. **Install dependencies**:
   ```bash
   npm install
   ```

3. **Start the server**:
   ```bash
   npm start
   ```

4. **Open in browser**:
   Navigate to [http://localhost:3000](http://localhost:3000)

---

## 🔑 Demo Credentials

To test the customer login and view the authenticated portal:
* **Email:** `akhilash@gmail.com`
* **Password:** `password123`

---

## 👨‍💻 Author

* **Akhilash S** (Roll No: 24AD008)
* KPR Institute of Engineering and Technology, Coimbatore
