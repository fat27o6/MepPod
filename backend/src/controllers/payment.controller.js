import dao from '../dao/payment.dao.js';
import Payment from '../models/payment.model.js';
import PaymentService from '../services/payment.service.js';

class PaymentController {
  async create(req, res) {
    try {
      const result = await PaymentService.create(req.body);
      res.status(201).json(result);
    } catch (err) {
      res.status(400).json({ error: err.message });
    }
  }

  async findAll(req, res) {
    try {
      const result = await dao.findAll();
      res.json(result);
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  }

  async findById(req, res) {
    try {
      const result = await dao.findById(req.params.id);
      if (!result) return res.status(404).json({ message: 'Not found' });
      res.json(result);
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  }

  async findByInvoiceId(req, res) {
    try {
      const { invoiceId } = req.params;
      const payments = await Payment.find({
        invoice_id: invoiceId,
        disabled: false
      }).sort({ date: -1 });
      res.json(payments);
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  }

  async update(req, res) {
    try {
      const result = await PaymentService.update(req.params.id, req.body);
      res.json(result);
    } catch (err) {
      res.status(400).json({ error: err.message });
    }
  }

  async remove(req, res) {
    try {
      await PaymentService.remove(req.params.id);
      res.json({ message: 'Deleted' });
    } catch (err) {
      res.status(400).json({ error: err.message });
    }
  }

  async restore(req, res) {
    try {
      await PaymentService.restore(req.params.id);
      res.json({ message: 'Restored' });
    } catch (err) {
      res.status(400).json({ error: err.message });
    }
  }
}

export default new PaymentController();