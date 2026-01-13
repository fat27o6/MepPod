import express from 'express'
import cors from 'cors'

import authRoutes from "./src/routes/auth.routes.js";
import userRoutes from "./src/routes/user.routes.js";
import employeeRoutes from "./src/routes/employee.routes.js";
import payrollRoutes from "./src/routes/payroll.routes.js";
import patientRoutes from "./src/routes/patient.routes.js";
import appointmentRoutes from "./src/routes/appointment.routes.js";
import scheduleRoutes from "./src/routes/schedule.routes.js";
import medicalRecordRoutes from "./src/routes/medical-record.routes.js";
import medicineRoutes from "./src/routes/medicine.routes.js";
import medicineImportRoutes from "./src/routes/medicine-import.routes.js";
import purchaseTransactionRoutes from "./src/routes/purchase-transaction.routes.js";
import invoiceRoutes from "./src/routes/invoice.routes.js";
import paymentRoutes from "./src/routes/payment.routes.js";
import vnpayRoutes from "./src/routes/vnpay.routes.js";
import reportRoutes from "./src/routes/report.route.js";
import notificationRoutes from "./src/routes/notification.routes.js";

const app = express()

app.use(cors())
app.use(express.json())

app.get('/', (req, res) => {
  console.log(req.headers)
  res.send('<h1>Backend here!</h1>')
})

// Sử dụng routes
app.use("/api/auth", authRoutes);
app.use("/api/users", userRoutes);
app.use("/api/employees", employeeRoutes);
app.use("/api/payrolls", payrollRoutes);
app.use("/api/patients", patientRoutes);
app.use("/api/appointments", appointmentRoutes);
app.use("/api/schedules", scheduleRoutes);
app.use("/api/medical-records", medicalRecordRoutes);
app.use("/api/medicines", medicineRoutes);
app.use("/api/medicine-imports", medicineImportRoutes);
app.use("/api/purchase-transactions", purchaseTransactionRoutes);
app.use("/api/invoices", invoiceRoutes);
// VNPay routes phải đăng ký trước paymentRoutes để tránh conflict với route /:id
app.use("/api/payments", vnpayRoutes); // VNPay routes (không cần auth cho vnpay-return và vnpay-ipn)
app.use("/api/payments", paymentRoutes);
app.use("/api/reports", reportRoutes);
app.use("/api/notifications", notificationRoutes);

app.use((err, req, res, next) => {
  console.error('Unhandled:', err)
  res.status(500).json({ error: 'Internal server error' })
})

export default app