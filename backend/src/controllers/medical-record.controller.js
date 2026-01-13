import dao from '../dao/medical-record.dao.js';

class MedicalRecordController {
  async create(req, res) {
    try {
      const payload = req.body;

      // Nếu có appointment_id thì không cho phép tạo trùng hồ sơ cho cùng một lịch hẹn
      if (payload.appointment_id) {
        const existing = await dao.model.findOne({
          appointment_id: payload.appointment_id,
          disabled: false,
        });

        if (existing) {
          return res.status(400).json({
            error: 'Hồ sơ y tế cho lịch hẹn này đã tồn tại. Vui lòng sử dụng hồ sơ hiện có hoặc chọn lịch hẹn khác.',
            existing_record_id: existing._id,
          });
        }
      }

      const result = await dao.create(payload);
      res.status(201).json(result);
    } catch (err) {
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
      res.status(500).json({ error: err.message });
    }
  };

  async remove(req, res) {
    try {
      if (req.query && req.query.hard === 'true') {
        await dao.hardDelete(req.params.id);
        return res.json({ message: 'Permanently deleted' });
      }
      await dao.delete(req.params.id);
      res.json({ message: 'Deleted' });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  };

  async restore(req, res) {
    try {
      await dao.restore(req.params.id);
      res.json({ message: 'Restored' });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  };

  async findByPatientId(req, res) {
    try {
      const result = await dao.findByPatientId(req.params.id);
      res.json(result);
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  };
}

export default new MedicalRecordController();