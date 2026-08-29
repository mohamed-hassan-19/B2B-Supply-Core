import { Injectable } from '@nestjs/common';
import { Invoice, Order } from '../../database/models';

@Injectable()
export class StorefrontInvoiceService {
  async findAllForClient(clientId: number) {
    return Invoice.findAll({
      include: [
        {
          model: Order,
          where: { client_id: clientId },
          attributes: ['id', 'client_id'], // Don't need to leak full order details if they only need the ID
        },
      ],
      order: [['createdAt', 'DESC']],
    });
  }
}
