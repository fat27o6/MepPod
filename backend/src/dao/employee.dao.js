import Employee from "../models/employee.model.js";
import BaseDAO from './base.dao.js';

let employeeModel = null;

class EmployeeDAO extends BaseDAO {
  async injectDB(conn) {
    if (employeeModel) return;
    employeeModel = Employee;
    return;
  }
  constructor() {
    super(Employee);
  }

  // Tạo employee từ front-end input (tạm chưa có shift_schedule)
  async createEmployee(data) {
    try {
      if (!employeeModel) throw new Error('Employee DAO has not been initialized. Call injectDB(conn) first.');
      // bỏ shift_schedule nếu bị dính data
      // const { shift_schedule, ...payload } = data || {};
      const doc = await employeeModel.create(data);
      return doc.toObject();
    } catch (e) {
      console.error('EmployeeDAO.createEmployee error:', e);
      throw e;
    }
  }

  async findById(id) {
    if (!employeeModel) throw new Error('Employee DAO has not been initialized. Call injectDB(conn) first.');
    return employeeModel.findById(id).exec();
  }

  async findDoc() {
    if (!employeeModel) throw new Error('Employee DAO has not been initialized. Call injectDB(conn) first.');
    return employeeModel.find({
          position: "Bác sĩ",
          disabled: false
        }).select("_id fullname email phone").exec();
  }

  async findByEmail(email, session = null) {
    if (!email) return null;

    return Employee.findOne({
      email: {
        $regex: new RegExp(`^${this.escapeRegex(email.trim())}$`, 'i')
      },
      disabled: false
    }).session(session);
  }

  async findByName(name, session = null) {
    if (!name) return null;

    return Employee.findOne({
      fullname: {
        $regex: new RegExp(this.escapeRegex(name.trim()), 'i')
      },
      disabled: false
    }).session(session);
  }

  escapeRegex(str = '') {
    return String(str).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  }
}

export default new EmployeeDAO()