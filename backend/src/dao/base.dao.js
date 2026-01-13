export default class BaseDAO {
  static async injectDB(conn) {
    return;
  }

  constructor(model) {
    this.model = model;
  }

  async findAll(filter = {}) {
    if (filter.disabled === undefined) {
      filter.disabled = false;
    }
    return await this.model.find(filter);
  }

  async findRestore(filter = {}) {
    if (filter.disabled === undefined) {
      filter.disabled = true;
    }
    return await this.model.find(filter);
  }

  // async findById(id, session = null) {
  //   return await this.model.findOne({ _id: id, disabled: false }).session(session);
  // }

  async create(data) {
    return await this.model.create(data);
  }

  async update(id, data) {
    return await this.model.findByIdAndUpdate(id, data, { new: true });
  }

  async findById(id, session = null) {
    return this.model.findById(id).session(session);
  }

  async delete(id, session = null) {
    return this.model.findByIdAndUpdate(
      id,
      { disabled: true },
      { new: true, session }
    );
  }

  async restore(id, session = null) {
    return this.model.findByIdAndUpdate(
      id,
      { disabled: false },
      { new: true, session }
    );
  }

  async hardDelete(id, session = null) {
    return this.model.findByIdAndDelete(id, { session });
  }
}