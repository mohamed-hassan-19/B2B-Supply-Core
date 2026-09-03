import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { Incident, Order, Product, OrderActivityLog, AdminUser } from '../../database/models';
import { Op } from 'sequelize';

@Injectable()
export class IncidentService {
  async createIncident(data: any, actorUser: any) {
    if (data.target_type === 'order') {
      const order = await Order.findByPk(data.order_id);
      if (!order) {
        throw new NotFoundException(`Order with ID ${data.order_id} not found`);
      }

      const incident = await Incident.create({
        order_id: data.order_id,
        type: data.type,
        description: data.description,
        status: 'open',
        created_by: actorUser.id
      });

      await OrderActivityLog.create({
        order_id: order.id,
        action_type: 'incident_raised',
        actor: `Admin #${actorUser.id} (${actorUser.name || actorUser.email})`,
        description: `Incident raised: ${data.type}`
      });

      return incident;
    } else if (data.target_type === 'product') {
      const product = await Product.findByPk(data.product_id);
      if (!product) {
        throw new NotFoundException(`Product with ID ${data.product_id} not found`);
      }

      const incident = await Incident.create({
        product_id: data.product_id,
        type: data.type,
        description: data.description,
        status: 'open',
        created_by: actorUser.id
      });

      return incident;
    } else {
      throw new BadRequestException('target_type must be either "order" or "product"');
    }
  }

  async findAll(options: { start_date?: string, end_date?: string, client_id?: number, status?: string, type?: string, page?: number, limit?: number, export?: string | boolean } = {}) {
    const where: any = {};
    if (options.start_date && options.end_date) {
      where.createdAt = {
        [Op.gte]: new Date(options.start_date),
        [Op.lte]: new Date(options.end_date)
      };
    } else if (options.start_date) {
      where.createdAt = { [Op.gte]: new Date(options.start_date) };
    } else if (options.end_date) {
      where.createdAt = { [Op.lte]: new Date(options.end_date) };
    }

    if (options.status) where.status = options.status;
    if (options.type) where.type = options.type;

    const queryOptions: any = { where, order: [['createdAt', 'DESC']] };
    
    // Add specific includes if needed based on entity
    if (options.client_id) {
      queryOptions.include = [
        { model: require('../../database/models').Order, where: { client_id: options.client_id } },
        { model: require('../../database/models').Product },
        { model: require('../../database/models').AdminUser, attributes: ['id', 'name', 'email'] }
      ];
    } else {
      queryOptions.include = [
        { model: require('../../database/models').Order },
        { model: require('../../database/models').Product },
        { model: require('../../database/models').AdminUser, attributes: ['id', 'name', 'email'] }
      ];
    }

    if (options.export && (options.export === 'true' || options.export === true)) {
      const items = await Incident.findAll(queryOptions);
      return { items, total: items.length, page: 1, limit: items.length };
    }

    const page = Number(options.page) || 1;
    const limit = Number(options.limit) || 20;
    const offset = (page - 1) * limit;

    queryOptions.limit = limit;
    queryOptions.offset = offset;

    const { count, rows } = await Incident.findAndCountAll(queryOptions);

    return {
      items: rows,
      total: count,
      page,
      limit
    };
  }

  async updateIncident(id: number, data: any, actorUser: any) {
    const incident = await Incident.findByPk(id);
    if (!incident) {
      throw new NotFoundException(`Incident with ID ${id} not found`);
    }

    const oldStatus = incident.status;
    const newStatus = data.status || oldStatus;

    incident.status = newStatus;
    if (data.resolution !== undefined) {
      incident.resolution = data.resolution;
    }
    
    await incident.save();

    if (oldStatus !== 'resolved' && newStatus === 'resolved' && incident.order_id) {
      await OrderActivityLog.create({
        order_id: incident.order_id,
        action_type: 'incident_resolved',
        actor: `Admin #${actorUser.id} (${actorUser.name || actorUser.email})`,
        description: `Incident resolved: ${incident.resolution || 'No resolution provided'}`
      });
    }

    return incident;
  }
}
