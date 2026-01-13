import mongoose from 'mongoose';

import AppointmentDAO from '../dao/appointment.dao.js';
import BaseDAO from '../dao/base.dao.js';
import EmployeeDAO from '../dao/employee.dao.js';
import InvoiceDAO from '../dao/invoice.dao.js';
import MedicalrecordDAO from '../dao/medical-record.dao.js';
import MedicineDAO from '../dao/medicine.dao.js';
import MedicineimportDAO from '../dao/medicine-import.dao.js';
import PatientDAO from '../dao/patient.dao.js';
import PaymentDAO from '../dao/payment.dao.js';
import PayrollDAO from '../dao/payroll.dao.js';
import PurchasetransactionDAO from '../dao/purchase-transaction.dao.js';
import UserDAO from '../dao/user.dao.js';

export default async function connectDB() {
  try {
    await mongoose.connect(process.env.MONGO_URI, {
      dbName: process.env.MONGO_DB_NAME,
      // useNewUrlParser: true,
      // useUnifiedTopology: true,
    });
    await AppointmentDAO.injectDB(mongoose);
    await BaseDAO.injectDB(mongoose);
    await EmployeeDAO.injectDB(mongoose);
    await InvoiceDAO.injectDB(mongoose);
    await MedicalrecordDAO.injectDB(mongoose);
    await MedicineDAO.injectDB(mongoose);
    await MedicineimportDAO.injectDB(mongoose);
    await PatientDAO.injectDB(mongoose);
    await PaymentDAO.injectDB(mongoose);
    await PayrollDAO.injectDB(mongoose);
    await PurchasetransactionDAO.injectDB(mongoose);
    await UserDAO.injectDB(mongoose);

    console.log('✅ MongoDB Connected');
  } catch (err) {
    console.error('❌ MongoDB connection failed:', err);
    throw err;
  }
};