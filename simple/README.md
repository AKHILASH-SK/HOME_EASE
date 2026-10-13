# HomeEase - Simple Appointment Booking System

A lightweight, clean single-page web application built with **Node.js, Express, HTML, CSS, and Vanilla JavaScript** for laboratory evaluation and validation.

---

## Directory Structure

```
simple/
├── appointments/          # Text file persistence folder (e.g. APT101.txt)
│   ├── APT101.txt
│   └── APT202.txt
├── public/                # Client-side frontend files
│   ├── index.html         # Appointment booking & retrieval interface
│   ├── style.css          # Clean card container styling
│   └── script.js          # Asynchronous fetch and DOM updater
├── package.json           # Node.js project manifest
├── server.js              # Express backend server with fs read/write operations
└── README.md
```

---

## How to Run

1. Open your terminal and navigate to the `simple/` folder:
   ```bash
   cd simple
   ```

2. Start the Node.js server:
   ```bash
   node server.js
   ```

3. Open your browser and visit:
   ```
   http://localhost:3000
   ```
   *(If port 3000 is occupied by another process, it will automatically run on `http://localhost:3001`)*

---

## Features

- **Store Appointment (`POST /save-appointment`)**:
  Takes Appointment ID, Customer Name, Phone, Service Category, Time Slot, and Problem Description, and persists it directly as a `.txt` file into the `appointments/` directory.

- **Retrieve Appointment (`GET /get-appointment/:appointmentId`)**:
  Reads the `.txt` file corresponding to the entered ID using Node's `fs.readFile` and displays the formatted appointment report directly on the screen without reloading.
