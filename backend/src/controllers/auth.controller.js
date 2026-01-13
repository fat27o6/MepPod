import bcrypt from "bcryptjs";
import mongoose from "mongoose";

import UserDAO from '../dao/user.dao.js';
import EmployeeDAO from '../dao/employee.dao.js';
import PatientDAO from '../dao/patient.dao.js';

class AuthController {
  async register(req, res) {
    const session = await mongoose.startSession();

    try {
      const { role, employee } = req.body;

      session.startTransaction();

      // Tạo nhân viên
      const createdEmployee = await EmployeeDAO.createEmployee(employee, session);
      // Tạo tài khoản
      const createdUser = await UserDAO.register(role, createdEmployee, session);

      await session.commitTransaction();

      return res.status(201).json({
        user: createdUser,
        employee: createdEmployee
      });
    } catch (err) {
      await session.abortTransaction();
      console.error('AuthController.register error:', err);
      if (err.message && err.message.includes('đã được sử dụng')) {
        return res.status(400).json({ error: err.message });
      }
      return res.status(500).json({ error: err.message });
    } finally {
      session.endSession();
    }
  };

  async login(req, res) {

    try {
      const { username, password } = req.body;
      if (!username || !password) return res.status(400).json({ message: 'Cần nhập đủ Username và Password' });
      const result = await UserDAO.login(username, password);

      // Lấy thông tin nhân viên vừa đăng nhập
      const employee = result.user.employee_id ? await EmployeeDAO.findById(result.user.employee_id) : null;
      const employeeObj = employee ? (employee.toObject ? employee.toObject() : employee) : null;

      return res.status(200).json({ user: result.user, token: result.token, employee: employeeObj });
    } catch (err) {
      console.error('AuthController.login error:', err);
      return res.status(500).json({ error: err.message });
    }
  };

  async logout(req, res) {
    try {
      const authHeader = req.headers.authorization;
      if (!authHeader) return res.status(400).json({ message: 'Không có token' });

      const token = authHeader.split(' ')[1];
      const result = await UserDAO.logout(token);

      return res.status(200).json(result);
    } catch (err) {
      console.error('AuthController.logout error:', err);
      return res.status(500).json({ error: err.message });
    }
  };

  async forgotPassword(req, res) {
    try {
      const { username, email } = req.body;

      if (!username || !email) {
        return res.status(400).json({ error: 'Username và email là bắt buộc' });
      }

      const result = await UserDAO.forgotPassword(username, email);

      return res.status(200).json({
        message: 'Yêu cầu khôi phục mật khẩu đã được xử lý thành công',
        details: result.message
      });
    } catch (err) {
      console.error('AuthController.forgotPassword error:', err);
      return res.status(400).json({ error: err.message });
    }
  };

  async getEmployee(req, res) {

    try {
      const employeeObj = await EmployeeDAO.findById(req.params.id);
      if (!employeeObj) return res.status(404).json({ message: 'Not found' });

      const userObj = await UserDAO.findEmployAcc(req.params.id);
      if (!userObj) return res.status(404).json({ message: 'Not found' });

      return res.status(200).json({ user: userObj, employee: employeeObj });
    } catch (err) {
      console.error('AuthController.login error:', err);
      return res.status(500).json({ error: err.message });
    }
  };

  async getAccount(req, res) {

    try {
      const userObj = await UserDAO.findById(req.params.id);
      if (!userObj) return res.status(404).json({ message: 'Not found' });

      const employeeObj = await EmployeeDAO.findById(userObj.employee_id);
      if (!employeeObj) return res.status(404).json({ message: 'Not found' });

      return res.status(200).json({ user: userObj, employee: employeeObj });
    } catch (err) {
      console.error('AuthController.login error:', err);
      return res.status(500).json({ error: err.message });
    }
  };

  // Kế thừa
  async updateAccount(req, res) {
    const session = await mongoose.startSession();

    try {
      const requester = req.user || {};
      const requesterId = requester.sub || requester.userId || requester._id;

      if (requester.role !== 'Admin' && String(requesterId) !== String(req.params.id)) {
        return res.status(403).json({ message: 'Không có quyền cập nhật tài khoản này' });
      }

      session.startTransaction();

      const userObj = await UserDAO.findById(req.params.id, session);
      if (!userObj) {
        await session.abortTransaction();
        return res.status(404).json({ message: 'User not found' });
      }

      const allowedEmployeeFields = ['fullname', 'dob', 'phone', 'address', 'email'];
      const employeeUpdate = {};
      for (const key of allowedEmployeeFields) {
        if (req.body[key] !== undefined) employeeUpdate[key] = req.body[key];
      }

      let updatedEmployee = null;
      if (userObj.employee_id && Object.keys(employeeUpdate).length > 0) {
        updatedEmployee = await EmployeeDAO.update(
          userObj.employee_id,
          employeeUpdate,
          session
        );
      }

      await session.commitTransaction();

      const freshUser = await UserDAO.findById(req.params.id);
      const freshEmployee =
        updatedEmployee ||
        (userObj.employee_id ? await EmployeeDAO.findById(userObj.employee_id) : null);

      return res.status(200).json({ user: freshUser, employee: freshEmployee });

    } catch (err) {
      await session.abortTransaction();
      console.error('updateAccount error:', err);
      return res.status(500).json({ error: err.message });

    } finally {
      session.endSession();
    }
  };
  //

  async resetpass(req, res) {
    try {
      const result = await UserDAO.resetPassword(req.params.id);
      res.json(result);
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  };

  async registerPatient(req, res) {
    const session = await mongoose.startSession();

    try {
      const { username, password, patient } = req.body;

      session.startTransaction();

      // Tạo patient
      const createdPatient = await PatientDAO.create(patient, session);

      const hashedPassword = await bcrypt.hash(password, 10);
      const user = await UserDAO.create({
        username,
        password_hash: hashedPassword,
        role: 'Patient',
        patient_id: createdPatient._id
      }, session);

      await session.commitTransaction();

      return res.status(201).json({
        user,
        patient: createdPatient
      });

    } catch (err) {
      await session.abortTransaction();
      return res.status(500).json({ error: err.message });

    } finally {
      session.endSession();
    }
  };

  async loginPatient(req, res) {
    try {
      const { username, password } = req.body;
      if (!username || !password) return res.status(400).json({ message: 'Cần nhập đủ Username và Password' });
      const result = await UserDAO.login(username, password);

      // Lấy thông tin nhân viên vừa đăng nhập
      const patient = result.user.patient_id ? await PatientDAO.findById(result.user.patient_id) : null;
      const patientObj = patient ? (patient.toObject ? patient.toObject() : patient) : null;

      return res.status(200).json({ user: result.user, token: result.token, patient: patientObj });
    } catch (err) {
      console.error('AuthController.login error:', err);
      return res.status(500).json({ error: err.message });
    }
  };

  async validateToken(req, res) {
    try {
      // Token is already validated by auth middleware
      // If we reach here, token is valid
      return res.status(200).json({
        valid: true,
        user: req.user
      });
    } catch (err) {
      console.error('AuthController.validateToken error:', err);
      return res.status(500).json({ error: err.message });
    }
  };
}

export default new AuthController();