/**
 * ==============================================================================
 * HomeEase - Simple Home Service Appointment Booking System (Node.js + Express)
 * ==============================================================================
 * Course: U21AD502 - Application Development
 * Architecture:
 * - Pure Node.js & Express.js server
 * - File-System text storage in "appointments/" folder
 * ==============================================================================
 */

const express = require("express");
const fs = require("fs");
const path = require("path");

const app = express();
const PORT = process.env.PORT || 3000;

// Location where appointment text records will be stored
const appointmentsFolder = path.join(__dirname, "appointments");

// Create appointments folder if it does not exist
if (!fs.existsSync(appointmentsFolder)) {
  fs.mkdirSync(appointmentsFolder);
}

// Middleware for reading form data
app.use(express.urlencoded({ extended: true }));

// Middleware for reading JSON data
app.use(express.json());

// Serve static frontend files from the "public" folder
app.use(express.static(path.join(__dirname, "public")));

// Default route
app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "index.html"));
});

// ==========================================
// 1. SAVE / BOOK HOME SERVICE APPOINTMENT
// ==========================================
app.post("/save-appointment", (req, res) => {
  const appointmentId = req.body.appointmentId;
  const customerName = req.body.customerName;
  const customerPhone = req.body.customerPhone || "Not provided";
  const serviceCategory = req.body.serviceCategory || "General Home Maintenance";
  const appointmentSlot = req.body.appointmentSlot || "Immediate / Next Available";
  const problemDetails = req.body.problemDetails || req.body.report;

  // Validation: Check whether all mandatory fields are entered
  if (!appointmentId || !customerName || !problemDetails) {
    return res.status(400).send("Please fill in Appointment ID, Customer Name, and Problem Description.");
  }

  // File name based on Appointment ID
  const fileName = appointmentId.trim() + ".txt";
  const filePath = path.join(appointmentsFolder, fileName);

  // Formatted data to store in the text file
  const fileData =
    "================================================\n" +
    "   HOMEEASE APPOINTMENT BOOKING RECORD\n" +
    "================================================\n" +
    "Appointment ID : " + appointmentId.trim() + "\n" +
    "Customer Name  : " + customerName.trim() + "\n" +
    "Customer Phone : " + customerPhone.trim() + "\n" +
    "Service Type   : " + serviceCategory.trim() + "\n" +
    "Preferred Slot : " + appointmentSlot.trim() + "\n" +
    "Booking Status : Confirmed\n" +
    "------------------------------------------------\n" +
    "Problem Description / Service Details:\n" +
    problemDetails.trim() + "\n" +
    "================================================\n" +
    "Recorded On    : " + new Date().toLocaleString() + "\n";

  // Write data into the file on disk
  fs.writeFile(filePath, fileData, "utf8", (err) => {
    if (err) {
      console.error("Error saving appointment record:", err);
      return res.status(500).send("Error saving appointment on the server.");
    }
    console.log(`[File System] Successfully saved ${fileName} in ${appointmentsFolder}`);
    res.send("Appointment " + appointmentId.trim() + " saved successfully.");
  });
});

// ==========================================
// 2. GET / RETRIEVE APPOINTMENT DETAILS
// ==========================================
app.get("/get-appointment/:appointmentId", (req, res) => {
  const appointmentId = req.params.appointmentId.trim();
  const fileName = appointmentId + ".txt";
  const filePath = path.join(appointmentsFolder, fileName);

  // Read the text file from the appointments directory
  fs.readFile(filePath, "utf8", (err, data) => {
    if (err) {
      if (err.code === "ENOENT") {
        return res.status(404).send("Appointment record not found for ID: " + appointmentId);
      }
      return res.status(500).send("Error reading appointment record.");
    }
    // Send raw text report back to the browser
    res.type("text").send(data);
  });
});

// ==========================================
// START SERVER
// ==========================================
const server = app.listen(PORT, () => {
  console.log(`====================================================`);
  console.log(`🚀 HomeEase Simple Server running at http://localhost:${PORT}`);
  console.log(`📁 Appointment Records Directory: ${appointmentsFolder}`);
  console.log(`====================================================`);
});

// Fallback to port 3001 if port 3000 is occupied by main project
server.on("error", (err) => {
  if (err.code === "EADDRINUSE") {
    const ALT_PORT = 3001;
    console.log(`⚠️ Port ${PORT} is busy. Automatically switching to http://localhost:${ALT_PORT}`);
    app.listen(ALT_PORT, () => {
      console.log(`🚀 HomeEase Simple Server running at http://localhost:${ALT_PORT}`);
    });
  } else {
    console.error("Server error:", err);
  }
});
