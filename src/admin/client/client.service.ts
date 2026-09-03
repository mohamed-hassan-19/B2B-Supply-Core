import { Injectable, NotFoundException, InternalServerErrorException } from '@nestjs/common';
import { Client, ClientDocument, Order } from '../../database/models';
import { Op } from 'sequelize';
import { UpdateClientStatusDto, UpdateClientCreditDto } from './client.dto';
import { Resend } from 'resend';
import * as fs from 'fs';
import * as path from 'path';

@Injectable()
export class ClientService {
  private resend: Resend;

  constructor() {
    this.resend = new Resend(process.env.RESEND_API_KEY || 're_dummy_key');
  }

  async findAll(options: { start_date?: string, end_date?: string, client_id?: number, status?: string, page?: number, limit?: number, export?: string | boolean } = {}) {
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

    const queryOptions: any = { 
      where, 
      order: [['createdAt', 'DESC']],
      attributes: { exclude: ['password_hash'] },
      include: [
        { model: Order, attributes: ['id', 'createdAt'], order: [['createdAt', 'DESC']] }
      ]
    };
    
    if (options.export && (options.export === 'true' || options.export === true)) {
      const items = await Client.findAll(queryOptions);
      return { items: this.mapClientsWithDaysSinceOrder(items), total: items.length, page: 1, limit: items.length };
    }

    const page = Number(options.page) || 1;
    const limit = Number(options.limit) || 20;
    const offset = (page - 1) * limit;

    queryOptions.limit = limit;
    queryOptions.offset = offset;
    queryOptions.distinct = true;

    const { count, rows } = await Client.findAndCountAll(queryOptions);

    return {
      items: this.mapClientsWithDaysSinceOrder(rows),
      total: count,
      page,
      limit
    };
  }

  private mapClientsWithDaysSinceOrder(clients: any[]) {
    const now = new Date().getTime();
    return clients.map(c => {
      const plain = c.get({ plain: true });
      let days_since_last_order = null;
      if (plain.Orders && plain.Orders.length > 0) {
        // Orders are included. We can just take the most recent one.
        const latestOrder = plain.Orders.reduce((latest: any, order: any) => {
          return new Date(order.createdAt).getTime() > new Date(latest.createdAt).getTime() ? order : latest;
        }, plain.Orders[0]);

        const diffTime = Math.abs(now - new Date(latestOrder.createdAt).getTime());
        days_since_last_order = Math.floor(diffTime / (1000 * 60 * 60 * 24));
      }
      return {
        ...plain,
        days_since_last_order,
        Orders: undefined // exclude orders array from payload to keep it clean
      };
    });
  }

  async findOne(id: number) {
    const client = await Client.findByPk(id, { 
      attributes: { exclude: ['password_hash'] },
      include: [
        { model: ClientDocument }
      ]
    });
    if (!client) {
      throw new NotFoundException(`Client with ID ${id} not found`);
    }
    return client;
  }

  async updateStatus(id: number, updateClientStatusDto: UpdateClientStatusDto) {
    const client = await Client.findByPk(id);
    if (!client) throw new NotFoundException(`Client with ID ${id} not found`);
    return client.update({ status: updateClientStatusDto.status });
  }

  async updateCredit(id: number, updateClientCreditDto: UpdateClientCreditDto) {
    const client = await Client.findByPk(id);
    if (!client) throw new NotFoundException(`Client with ID ${id} not found`);
    return client.update(updateClientCreditDto);
  }

  async updatePriority(id: number, is_priority: boolean) {
    const client = await Client.findByPk(id);
    if (!client) throw new NotFoundException(`Client with ID ${id} not found`);
    return client.update({ is_priority });
  }

  async uploadDocument(id: number, file: Express.Multer.File) {
    const client = await Client.findByPk(id);
    if (!client) throw new NotFoundException(`Client with ID ${id} not found`);

    if (!file) throw new InternalServerErrorException('File upload failed');

    const doc = await ClientDocument.create({
      client_id: id,
      file_name: file.originalname,
      file_url: `/uploads/${file.filename}`
    });

    return doc;
  }

  async deleteDocument(docId: number) {
    const doc = await ClientDocument.findByPk(docId);
    if (!doc) throw new NotFoundException(`Document with ID ${docId} not found`);

    const filePath = path.join(process.cwd(), doc.file_url);
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }
    
    await doc.destroy();
    return { success: true };
  }

  async remindClient(id: number) {
    const client = await Client.findByPk(id);
    if (!client) throw new NotFoundException(`Client with ID ${id} not found`);

    try {
      const data = await this.resend.emails.send({
        from: 'Sales <sales@yourcompany.com>',
        to: [client.email],
        subject: 'Time to Reorder!',
        html: `<p>Hello ${client.company_name},</p><p>It looks like it's been a while since your last order. We wanted to check in and see if you need to restock any of your supplies.</p><p>Best,<br/>Your Sales Team</p>`
      });

      return { success: true, message: 'Reminder sent successfully', data };
    } catch (error: any) {
      console.error('Failed to send email:', error);
      // In dev environment or if API key is not set, we can just return success as a mock.
      if (!process.env.RESEND_API_KEY) {
        return { success: true, message: 'Reminder mocked successfully (no API key)' };
      }
      throw new InternalServerErrorException('Failed to send reminder email');
    }
  }
}
