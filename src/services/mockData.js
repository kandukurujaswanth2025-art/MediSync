// Centralized demo data for MediSync Phase 1.
// All data is fictional. This module is the single seed source;
// the store layer (store.js) loads it into localStorage on first run.
// Replace store.js internals with REST calls later without touching UI.

export function seedData() {
  const hospitals = [
    {
      id: "HOSP001",
      code: "HOSP001",
      name: "ApolloCare Multispeciality Hospital",
      email: "apollo@medisync.demo",
      password: "Apollo@123",
      rmPassword: "RM@Apollo123",
      description: "A flagship multispeciality hospital with 24/7 emergency, cardiology and ICU services.",
      tagline: "Care. Compassion. Commitment.",
    },
    {
      id: "HOSP002",
      code: "HOSP002",
      name: "MediLife General Hospital",
      email: "medilife@medisync.demo",
      password: "MediLife@123",
      rmPassword: "RM@MediLife123",
      description: "Community-focused general hospital delivering accessible healthcare for every family.",
      tagline: "Life, made healthier.",
    },
    {
      id: "HOSP003",
      code: "HOSP003",
      name: "CityCare Medical Center",
      email: "citycare@medisync.demo",
      password: "CityCare@123",
      rmPassword: "RM@CityCare123",
      description: "Modern urban medical center specializing in neurology, cardiac and critical care.",
      tagline: "City-grade care, close to you.",
    },
  ];

  const deptNames = ["Pharmacy", "Cardiology", "Neurology", "Emergency", "ICU", "General Medicine"];
  const departments = [];
  hospitals.forEach((h) => {
    deptNames.forEach((name, i) => {
      departments.push({
        id: `${h.code}-DEPT-${String(i + 1).padStart(2, "0")}`,
        hospitalId: h.id,
        name,
        description: `${name} department at ${h.name}`,
        createdAt: "2026-08-01T09:00:00Z",
      });
    });
  });

  const deptId = (code, name) =>
    departments.find((d) => d.hospitalId === code && d.name === name)?.id;

  // Resources: medicines + equipment, per hospital.
  const resources = [];
  const medTemplate = [
    { name: "Paracetamol 500mg", dept: "Pharmacy", qty: 120, min: 30, unit: "tablets" },
    { name: "Amoxicillin 500mg", dept: "Pharmacy", qty: 45, min: 20, unit: "capsules" },
    { name: "Pantoprazole 40mg", dept: "Pharmacy", qty: 60, min: 25, unit: "tablets" },
    { name: "Ibuprofen 400mg", dept: "Pharmacy", qty: 18, min: 20, unit: "tablets" },
    { name: "Cetirizine 10mg", dept: "Pharmacy", qty: 90, min: 30, unit: "tablets" },
    { name: "Metformin 500mg", dept: "General Medicine", qty: 75, min: 25, unit: "tablets" },
    { name: "Atorvastatin 10mg", dept: "Cardiology", qty: 40, min: 15, unit: "tablets" },
    { name: "Salbutamol Inhaler", dept: "Emergency", qty: 22, min: 10, unit: "inhalers" },
    { name: "Insulin Glargine", dept: "General Medicine", qty: 14, min: 15, unit: "vials" },
    { name: "Diclofenac 50mg", dept: "Pharmacy", qty: 55, min: 20, unit: "tablets" },
  ];
  const equipTemplate = [
    { name: "Ventilator", dept: "ICU", qty: 8, status: "AVAILABLE" },
    { name: "ECG Machine", dept: "Cardiology", qty: 6, status: "AVAILABLE" },
    { name: "Patient Monitor", dept: "ICU", qty: 12, status: "AVAILABLE" },
    { name: "Wheelchair", dept: "General Medicine", qty: 20, status: "AVAILABLE" },
    { name: "Defibrillator", dept: "Emergency", qty: 4, status: "UNDER_MAINTENANCE" },
    { name: "Suction Pump", dept: "Emergency", qty: 3, status: "OUT_OF_SERVICE" },
    { name: "Oxygen Concentrator", dept: "ICU", qty: 10, status: "AVAILABLE" },
    { name: "Nebulizer", dept: "General Medicine", qty: 15, status: "AVAILABLE" },
  ];

  let resIdx = 1;
  hospitals.forEach((h) => {
    medTemplate.forEach((m) => {
      resources.push({
        id: `${h.code}-MED-${String(resIdx++).padStart(3, "0")}`,
        hospitalId: h.id,
        departmentId: deptId(h.id, m.dept),
        departmentName: m.dept,
        type: "medicine",
        name: m.name,
        quantity: m.qty,
        minStock: m.min,
        unit: m.unit,
        status: m.qty <= m.min ? "LOW_STOCK" : "AVAILABLE",
        lastUpdated: "2026-09-01T10:00:00Z",
      });
    });
    equipTemplate.forEach((e) => {
      resources.push({
        id: `${h.code}-EQP-${String(resIdx++).padStart(3, "0")}`,
        hospitalId: h.id,
        departmentId: deptId(h.id, e.dept),
        departmentName: e.dept,
        type: "equipment",
        name: e.name,
        quantity: e.qty,
        minStock: 0,
        unit: "units",
        status: e.status,
        lastUpdated: "2026-09-01T10:00:00Z",
      });
    });
  });

  // Demo patient accounts (global, not hospital-scoped).
  const patients = [
    { id: "PAT001", fullName: "Anjali Sharma", email: "anjali@medisync.demo", phone: "+91 98100 10001", password: "Patient@123", age: 28, gender: "Female", createdAt: "2026-08-20T08:00:00Z" },
    { id: "PAT002", fullName: "Rahul Verma", email: "rahul@medisync.demo", phone: "+91 98100 10002", password: "Patient@123", age: 35, gender: "Male", createdAt: "2026-08-22T08:00:00Z" },
    { id: "PAT003", fullName: "Kiran Patel", email: "kiran@medisync.demo", phone: "+91 98100 10003", password: "Patient@123", age: 42, gender: "Female", createdAt: "2026-08-25T08:00:00Z" },
    { id: "PAT004", fullName: "Arjun Mehta", email: "arjun@medisync.demo", phone: "+91 98100 10004", password: "Patient@123", age: 31, gender: "Male", createdAt: "2026-08-28T08:00:00Z" },
  ];

  // Queue entries — hospital scoped, mix of statuses.
  const queueEntries = [
    // ApolloCare
    { id: "QE001", hospitalId: "HOSP001", patientId: "PAT002", patientName: "Rahul Verma", problem: "Chest pain", token: "P-012", registeredAt: "2026-09-03T08:10:00Z", status: "IN_CONSULTATION", medicineOrderId: null },
    { id: "QE002", hospitalId: "HOSP001", patientId: "PAT001", patientName: "Anjali Sharma", problem: "Headache", token: "P-013", registeredAt: "2026-09-03T08:25:00Z", status: "WAITING", medicineOrderId: null },
    { id: "QE003", hospitalId: "HOSP001", patientId: "PAT003", patientName: "Kiran Patel", problem: "Fever", token: "P-014", registeredAt: "2026-09-03T08:40:00Z", status: "WAITING", medicineOrderId: null },
    { id: "QE004", hospitalId: "HOSP001", patientId: "PAT004", patientName: "Arjun Mehta", problem: "Cold", token: "P-015", registeredAt: "2026-09-03T08:55:00Z", status: "WAITING", medicineOrderId: null },
    { id: "QE005", hospitalId: "HOSP001", patientName: "Sneha Reddy", problem: "Stomach pain", token: "P-011", registeredAt: "2026-09-03T07:50:00Z", status: "COMPLETED", medicineOrderId: "MO001" },
    // MediLife
    { id: "QE006", hospitalId: "HOSP002", patientName: "Vikram Nair", problem: "High fever", token: "P-008", registeredAt: "2026-09-03T08:05:00Z", status: "IN_CONSULTATION", medicineOrderId: null },
    { id: "QE007", hospitalId: "HOSP002", patientName: "Pooja Iyer", problem: "Migraine", token: "P-009", registeredAt: "2026-09-03T08:20:00Z", status: "WAITING", medicineOrderId: null },
    { id: "QE008", hospitalId: "HOSP002", patientName: "Sahil Khan", problem: "Back pain", token: "P-010", registeredAt: "2026-09-03T08:35:00Z", status: "WAITING", medicineOrderId: null },
    // CityCare
    { id: "QE009", hospitalId: "HOSP003", patientName: "Meera Joshi", problem: "Dizziness", token: "P-005", registeredAt: "2026-09-03T08:00:00Z", status: "IN_CONSULTATION", medicineOrderId: null },
    { id: "QE010", hospitalId: "HOSP003", patientName: "Rohit Das", problem: "Numbness", token: "P-006", registeredAt: "2026-09-03T08:15:00Z", status: "WAITING", medicineOrderId: null },
    { id: "QE011", hospitalId: "HOSP003", patientName: "Divya Rao", problem: "Fatigue", token: "P-007", registeredAt: "2026-09-03T08:30:00Z", status: "WAITING", medicineOrderId: null },
  ];

  const medicineOrders = [
    {
      id: "MO001",
      hospitalId: "HOSP001",
      patientId: null,
      patientName: "Sneha Reddy",
      queueEntryId: "QE005",
      status: "READY_FOR_COLLECTION",
      items: [
        { medicineId: "HOSP001-MED-001", name: "Paracetamol 500mg", quantity: 2 },
        { medicineId: "HOSP001-MED-003", name: "Pantoprazole 40mg", quantity: 1 },
      ],
      createdAt: "2026-09-03T08:05:00Z",
    },
  ];

  const resourceRequests = [
    { id: "RR001", hospitalId: "HOSP001", resourceName: "ECG Machine", quantity: 2, reason: "Cardiology expansion requires additional units", status: "PENDING", date: "2026-09-02T09:00:00Z" },
    { id: "RR002", hospitalId: "HOSP001", resourceName: "Insulin Glargine", quantity: 20, reason: "Diabetes clinic demand spike", status: "APPROVED", date: "2026-09-01T09:00:00Z" },
    { id: "RR003", hospitalId: "HOSP002", resourceName: "Ventilator", quantity: 1, reason: "ICU capacity increase", status: "PENDING", date: "2026-09-02T11:00:00Z" },
    { id: "RR004", hospitalId: "HOSP003", resourceName: "Defibrillator", quantity: 2, reason: "Replace faulty unit", status: "COMPLETED", date: "2026-08-30T09:00:00Z" },
  ];

  const notifications = [
    { id: "NT001", hospitalId: "HOSP001", scope: "hospital", targetId: null, title: "Resource request submitted", message: "Your request for ECG Machine x2 has been submitted to the resource manager.", read: false, createdAt: "2026-09-02T09:01:00Z" },
    { id: "NT002", hospitalId: "HOSP001", scope: "manager", targetId: null, title: "New resource request received", message: "ApolloCare requested ECG Machine x2.", read: false, createdAt: "2026-09-02T09:01:00Z" },
    { id: "NT003", hospitalId: "HOSP001", scope: "manager", targetId: null, title: "Stock level is low", message: "Ibuprofen 400mg is below minimum stock at ApolloCare.", read: false, createdAt: "2026-09-01T10:05:00Z" },
    { id: "NT004", hospitalId: "HOSP001", scope: "patient", targetId: "PAT001", title: "Welcome to MediSync", message: "You are now in the ApolloCare queue. We will notify you when the doctor calls you.", read: false, createdAt: "2026-09-03T08:25:05Z" },
  ];

  const stockHistory = [
    { id: "SH001", hospitalId: "HOSP001", resourceId: "HOSP001-MED-001", resourceName: "Paracetamol 500mg", change: -2, reason: "Issued to patient Sneha Reddy", date: "2026-09-03T08:05:00Z" },
    { id: "SH002", hospitalId: "HOSP001", resourceId: "HOSP001-MED-003", resourceName: "Pantoprazole 40mg", change: -1, reason: "Issued to patient Sneha Reddy", date: "2026-09-03T08:05:00Z" },
    { id: "SH003", hospitalId: "HOSP002", resourceId: "HOSP002-MED-001", resourceName: "Paracetamol 500mg", change: 50, reason: "Stock replenishment", date: "2026-08-29T10:00:00Z" },
  ];

  // Recovery email for password reset (defaults to the account email; set a real
  // email here to test OTP delivery). Demo emails (e.g. apollo@medisync.demo)
  // cannot receive mail.
  hospitals.forEach((h) => { h.recoveryEmail = h.email; });
  patients.forEach((p) => { p.recoveryEmail = p.email; });
  // All seeded queue entries are normal priority.
  queueEntries.forEach((q) => { q.priority = "NORMAL"; });

  return {
    hospitals,
    departments,
    resources,
    patients,
    queueEntries,
    medicineOrders,
    resourceRequests,
    notifications,
    stockHistory,
    counters: { HOSP001: 15, HOSP002: 10, HOSP003: 7 },
  };
}