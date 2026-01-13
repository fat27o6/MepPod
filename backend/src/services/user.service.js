import mongoose from 'mongoose';

import UserDAO from '../dao/user.dao.js';
import EmployeeDAO from '../dao/employee.dao.js';
import PatientDAO from '../dao/patient.dao.js';

class UserService {
  async deleteCascade(userId) {
    const session = await mongoose.startSession();
    session.startTransaction();

    try {
      await EmployeeDAO.model.updateMany(
        { user_id: userId, disabled: false },
        { disabled: true },
        { session }
      );

      await PatientDAO.model.updateMany(
        { user_id: userId, disabled: false },
        { disabled: true },
        { session }
      );

      const result = await UserDAO.delete(userId, session);

      await session.commitTransaction();
      return result;
    } catch (err) {
      await session.abortTransaction();
      throw err;
    } finally {
      session.endSession();
    }
  }

  async restoreCascade(userId) {
    const session = await mongoose.startSession();
    session.startTransaction();

    try {
      await EmployeeDAO.model.updateMany(
        { user_id: userId, disabled: true },
        { disabled: false },
        { session }
      );

      await PatientDAO.model.updateMany(
        { user_id: userId, disabled: true },
        { disabled: false },
        { session }
      );

      const result = await UserDAO.restore(userId, session);

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

export default new UserService();