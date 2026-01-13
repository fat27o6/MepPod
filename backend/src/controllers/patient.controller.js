import dao from '../dao/patient.dao.js';
import PatientService from '../services/patient.service.js';

class PatientController {
  async create(req, res) {
    try {
      const result = await dao.create(req.body);
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
        await PatientService.deleteCascade(req.params.id, true);
        res.json({ message: 'Hard deleted with cascade' });
      }
      await PatientService.deleteCascade(req.params.id);
      res.json({ message: 'Deleted with cascade' });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  };

  async restore(req, res) {
    try {
      await PatientService.restoreCascade(req.params.id);
      res.json({ message: 'Patient restore with cascade' });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  };
}

export default new PatientController();