import mongoose from 'mongoose';

import PatientDAO from '../dao/patient.dao.js';
import AppointmentDAO from '../dao/appointment.dao.js';
import MedicalRecordDAO from '../dao/medical-record.dao.js';
import UserDAO from '../dao/user.dao.js';
import InvoiceDAO from '../dao/invoice.dao.js';

class PatientService {
  async deleteCascade(patientId, hard = false) {
    const session = await mongoose.startSession();
    session.startTransaction();

    try {
      if (hard) {
        await AppointmentDAO.model.deleteMany({ patient_id: patientId }, { session });
        await MedicalRecordDAO.model.deleteMany({ patient_id: patientId }, { session });
        await UserDAO.model.deleteMany({ patient_id: patientId }, { session });
        // Nếu sau này bật lại invoice hard delete thì thêm vào đây
        // await InvoiceDAO.model.deleteMany({ patient_id: patientId }, { session });

        const result = await PatientDAO.hardDelete(patientId, session);

        await session.commitTransaction();
        return result;
      }

      // ===== SOFT DELETE =====
      await AppointmentDAO.model.updateMany(
        { patient_id: patientId, disabled: false },
        { disabled: true },
        { session }
      );

      await MedicalRecordDAO.model.updateMany(
        { patient_id: patientId, disabled: false },
        { disabled: true },
        { session }
      );

      await UserDAO.model.updateMany(
        { patient_id: patientId, disabled: false },
        { disabled: true },
        { session }
      );

      await InvoiceDAO.model.updateMany(
        { patient_id: patientId, disabled: false },
        { disabled: true },
        { session }
      );

      const result = await PatientDAO.delete(patientId, session);

      await session.commitTransaction();
      return result;
    } catch (err) {
      await session.abortTransaction();
      throw err;
    } finally {
      session.endSession();
    }
  }

  async restoreCascade(patientId) {
    const session = await mongoose.startSession();
    session.startTransaction();

    try {
      await AppointmentDAO.model.updateMany(
        { patient_id: patientId, disabled: true },
        { disabled: false },
        { session }
      );

      await MedicalRecordDAO.model.updateMany(
        { patient_id: patientId, disabled: true },
        { disabled: false },
        { session }
      );

      await UserDAO.model.updateMany(
        { patient_id: patientId, disabled: true },
        { disabled: false },
        { session }
      );

      await InvoiceDAO.model.updateMany(
        { patient_id: patientId, disabled: true },
        { disabled: false },
        { session }
      );

      const result = await PatientDAO.restore(patientId, session);

      await session.commitTransaction();
      return result;
    } catch (err) {
      await session.abortTransaction();
      throw err;
    } finally {
      session.endSession();
    }
  }
}

export default new PatientService();