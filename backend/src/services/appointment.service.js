import mongoose from 'mongoose';

import AppointmentDAO from '../dao/appointment.dao.js';
import MedicalRecordDAO from '../dao/medical-record.dao.js';
import InvoiceDAO from '../dao/invoice.dao.js';

class AppointmentService {
  async deleteCascade(appointmentId) {
    const session = await mongoose.startSession();
    session.startTransaction();

    try {
      const appointment = await AppointmentDAO.findById(appointmentId, session);

      if (!appointment) {
        throw new Error('Appointment not found');
      }

      if (appointment.status === 'Completed') {
        throw new Error('Completed appointment cannot be deleted');
      }

      await MedicalRecordDAO.model.updateMany(
        { appointment_id: appointmentId, disabled: false },
        { disabled: true },
        { session }
      );

      await InvoiceDAO.model.updateMany(
        { appointment_id: appointmentId, disabled: false },
        { disabled: true },
        { session }
      );

      const result = await AppointmentDAO.delete(appointmentId, session);

      await session.commitTransaction();
      return result;
    } catch (err) {
      await session.abortTransaction();
      throw err;
    } finally {
      session.endSession();
    }
  }

  async restoreCascade(appointmentId) {
    const session = await mongoose.startSession();
    session.startTransaction();

    try {
      const appointment = await AppointmentDAO.findById(appointmentId, session);

      if (!appointment) {
        throw new Error('Appointment not found');
      }

      if (appointment.status === 'Completed') {
        throw new Error('Completed appointment cannot be restored');
      }

      await MedicalRecordDAO.model.updateMany(
        { appointment_id: appointmentId, disabled: true },
        { disabled: false },
        { session }
      );

      await InvoiceDAO.model.updateMany(
        { appointment_id: appointmentId, disabled: true },
        { disabled: false },
        { session }
      );

      const result = await AppointmentDAO.restore(appointmentId, session);

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

export default new AppointmentService();