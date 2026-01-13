import dao from '../dao/employee.dao.js';
import EmployeeService from '../services/employee.service.js';

class EmployeeController {
  async create(req, res) {
    try {
      const result = await dao.create(req.body);
      res.status(201).json(result);
    } catch (err) {
      // Xử lý lỗi duplicate key (email đã tồn tại)
      if (err.code === 11000 && err.keyPattern && err.keyPattern.email) {
        return res.status(400).json({ error: "Email này đã được sử dụng bởi nhân viên khác" });
      }
      res.status(500).json({ error: err.message });
    }
  };

  async findAll(req, res) {
    try {
      const filter = {};
      if (req.query.disabled !== undefined) {
        filter.disabled = req.query.disabled === 'true';
      }
      const result = await dao.findAll(filter);
      res.json(result);
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  };

  async findById(req, res) {
    try {
      const result = await dao.findById(req.params.id);
      if (!result) return res.status(404).json({ message: 'Not found' });
      res.json(result);
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  };

  async update(req, res) {
    try {
      const result = await dao.update(req.params.id, req.body);
      res.json(result);
    } catch (err) {
      // Xử lý lỗi duplicate key (email đã tồn tại)
      if (err.code === 11000 && err.keyPattern && err.keyPattern.email) {
        return res.status(400).json({ error: "Email này đã được sử dụng bởi nhân viên khác" });
      }
      res.status(500).json({ error: err.message });
    }
  };

  async remove(req, res) {
    try {
      if (req.query && req.query.hard === 'true') {
        await EmployeeService.deleteCascade(req.params.id, true);
        return res.json({ message: 'Hard deleted with cascade' });
      }

      await EmployeeService.deleteCascade(req.params.id);
      res.json({ message: 'Deleted with cascade' });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  };

  async restore(req, res) {
    try {
      await EmployeeService.restoreCascade(req.params.id);
      res.json({ message: 'Employee restore with cascade' });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  };

  async getAllDoctor(req, res) {
    try {
      const doctors = await dao.findDoc();

      res.status(200).json({
        success: true,
        data: doctors
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: "Không thể lấy danh sách bác sĩ",
        error: error.message
      });
    }
  };
}

export default new EmployeeController();