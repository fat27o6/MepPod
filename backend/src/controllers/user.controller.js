import bcrypt from "bcryptjs";

import dao from '../dao/user.dao.js';
import UserService from '../services/user.service.js';

class UserController {
  async create(req, res) {
    try {
      let data = req.body;
      const hashedPassword = await bcrypt.hash(data.password, 10);

      const result = await dao.create({
        username: data.username,
        password_hash: hashedPassword,
        role: data.role,
        employee_id: data.employee_id,
      });
      res.status(201).json(result);
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  };

  async findAll(req, res) {
    try {
      const result = await dao.findAll();
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
      res.status(500).json({ error: err.message });
    }
  };

  async remove(req, res) {
    try {
      await UserService.deleteCascade(req.params.id);
      res.json({ message: 'Deleted with cascade' });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  };

  async restore(req, res) {
    try {
      await UserService.restoreCascade(req.params.id);
      res.json({ message: 'Restored with cascade' });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  };

  async changepass(req, res) {
    try {
      const { oldPassword, newPassword } = req.body;
      const result = await dao.changePassword(req.params.id, oldPassword, newPassword);
      res.json(result);
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  };
}

export default new UserController();