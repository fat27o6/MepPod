import mongoose from 'mongoose';

import EmployeeDAO from '../dao/employee.dao.js';
import UserDAO from '../dao/user.dao.js';
import AppointmentDAO from '../dao/appointment.dao.js';
import PayrollDAO from '../dao/payroll.dao.js';
import MedicalRecordDAO from '../dao/medical-record.dao.js';

class EmployeeService {
  async deleteCascade(employeeId, hard = false) {
    const session = await mongoose.startSession();
    session.startTransaction();

    try {
      if (hard) {
        await AppointmentDAO.model.deleteMany(
          { doctor_id: employeeId },
          { session }
        );

        await UserDAO.model.deleteMany(
          { employee_id: employeeId },
          { session }
        );

        // Nếu sau này bật payroll hard delete thì vẫn an toàn
        await PayrollDAO.model.deleteMany(
          { employee_id: employeeId },
          { session }
        );

        await MedicalRecordDAO.model.deleteMany(
          { doctor_id: employeeId },
          { session }
        );

        const result = await EmployeeDAO.hardDelete(employeeId, session);

        await session.commitTransaction();
        return result;
      }

      // ===== SOFT DELETE =====
      await AppointmentDAO.model.updateMany(
        { doctor_id: employeeId, disabled: false },
        { disabled: true },
        { session }
      );

      await UserDAO.model.updateMany(
        { employee_id: employeeId, disabled: false },
        { disabled: true },
        { session }
      );

      await PayrollDAO.model.updateMany(
        { employee_id: employeeId, disabled: false },
        { disabled: true },
        { session }
      );

      await MedicalRecordDAO.model.updateMany(
        { doctor_id: employeeId, disabled: false },
        { disabled: true },
        { session }
      );

      const result = await EmployeeDAO.delete(employeeId, session);

      await session.commitTransaction();
      return result;
    } catch (err) {
      await session.abortTransaction();
      throw err;
    } finally {
      session.endSession();
    }
  }

  async restoreCascade(employeeId) {
    const session = await mongoose.startSession();
    session.startTransaction();

    try {
      await AppointmentDAO.model.updateMany(
        { doctor_id: employeeId, disabled: true },
        { disabled: false },
        { session }
      );

      await UserDAO.model.updateMany(
        { employee_id: employeeId, disabled: true },
        { disabled: false },
        { session }
      );

      await PayrollDAO.model.updateMany(
        { employee_id: employeeId, disabled: true },
        { disabled: false },
        { session }
      );

      await MedicalRecordDAO.model.updateMany(
        { doctor_id: employeeId, disabled: true },
        { disabled: false },
        { session }
      );

      const result = await EmployeeDAO.restore(employeeId, session);

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

export default new EmployeeService();