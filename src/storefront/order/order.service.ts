import { Injectable, BadRequestException, ForbiddenException, NotFoundException } from '@nestjs/common';
import { Sequelize, Op } from 'sequelize';
import { Client, Product, Order, OrderItem, Invoice, InvoiceSequence } from '../../database/models';
import { CreateOrderDto } from './order.dto';
import { PdfService } from '../../admin/invoice/pdf.service';

@Injectable()
export class OrderService {
  constructor(private readonly pdfService: PdfService) {}

  async createOrder(clientId: number, dto: CreateOrderDto) {
    if (!Product.sequelize) {
      throw new Error('Sequelize instance not found');
    }
    const t = await Product.sequelize.transaction();

    try {
      // 1. Validate Client Status and Payment Eligibility
      const client = await Client.findByPk(clientId, { transaction: t, lock: t.LOCK.UPDATE });
      if (!client) {
        throw new NotFoundException('Client not found');
      }
      
      if (client.status !== 'approved') {
        throw new ForbiddenException(`Client account is ${client.status}. Only approved clients can place orders.`);
      }

      let totalAmount = 0;
      const orderItemsData: any[] = [];

      // 2. Process Items and Lock Rows
      const productIds = dto.items.map(i => i.productId).sort((a, b) => a - b);
      
      const products = await Product.findAll({
        where: { id: productIds },
        transaction: t,
        lock: t.LOCK.UPDATE,
      });

      const productMap = new Map<number, Product>();
      products.forEach(p => productMap.set(p.id, p));

      // 3. Verify Stock and Build Order Items
      for (const item of dto.items) {
        const product = productMap.get(item.productId);
        
        if (!product) {
          throw new BadRequestException(`Product with ID ${item.productId} does not exist`);
        }
        
        if (!product.is_active) {
          throw new BadRequestException(`Product ${product.name} is no longer active`);
        }

        if (product.stock_level < item.quantity) {
          throw new BadRequestException(`Insufficient stock for product ${product.name}. Requested: ${item.quantity}, Available: ${product.stock_level}`);
        }

        totalAmount += Number(product.price) * item.quantity;

        orderItemsData.push({
          product_id: product.id,
          product_name: product.name,
          quantity: item.quantity,
          unit_price: product.price,
        });

        product.stock_level -= item.quantity;
        await product.save({ transaction: t });
      }

      // 3.5. Comprehensive Credit Limit Check
      if (dto.paymentMethod === 'Credit') {
        if (!client.credit_limit || client.credit_limit <= 0) {
          throw new BadRequestException('Client is not eligible for Credit payment method. No credit limit assigned.');
        }

        const unpaidInvoices = await Invoice.findAll({
          where: { payment_status: { [Op.ne]: 'paid' } },
          include: [{
            model: Order,
            where: { client_id: client.id },
            attributes: []
          }],
          transaction: t
        });
        const unpaidInvoiceTotal = unpaidInvoices.reduce((sum, inv) => sum + Number(inv.grand_total || inv.amount), 0);

        const totalExposure = unpaidInvoiceTotal + totalAmount;

        if (totalExposure > client.credit_limit) {
          throw new BadRequestException(
            `Credit limit exceeded. Limit: £${client.credit_limit}, ` +
            `Unpaid Invoices: £${unpaidInvoiceTotal}, ` +
            `New Order: £${totalAmount}. ` +
            `Total Exposure: £${totalExposure}`
          );
        }
      }

      // 4. Create the Order
      const order = await Order.create({
        client_id: client.id,
        status: 'pending',
        payment_method: dto.paymentMethod,
        total_amount: totalAmount
      }, { transaction: t });

      // 5. Create the Order Items
      for (const itemData of orderItemsData) {
        await OrderItem.create({
          order_id: order.id,
          ...itemData
        }, { transaction: t });
      }

      // 6. Create the Invoice automatically
      const currentYear = new Date().getFullYear();
      
      // Upsert sequence row securely
      await InvoiceSequence.findOrCreate({
        where: { year: currentYear },
        defaults: { last_value: 0 },
        transaction: t
      });
      const sequence = await InvoiceSequence.findOne({
        where: { year: currentYear },
        lock: t.LOCK.UPDATE,
        transaction: t
      });
      
      const nextVal = sequence!.last_value + 1;
      sequence!.last_value = nextVal;
      await sequence!.save({ transaction: t });

      const invoiceNumber = `INV-${currentYear}-${String(nextVal).padStart(4, '0')}`;
      const taxRate = 0.14;
      const subtotal = totalAmount;
      const taxAmount = subtotal * taxRate;
      const grandTotal = subtotal + taxAmount;

      const invoice = await Invoice.create({
        invoice_number: invoiceNumber,
        order_id: order.id,
        amount: grandTotal,
        subtotal: subtotal,
        tax_rate: taxRate,
        tax_amount: taxAmount,
        grand_total: grandTotal,
        currency: 'EGP',
        payment_method: dto.paymentMethod,
        sales_order_reference: `SO-${order.id}`,
        customer_tax_id: client.tax_registration || null,
        payment_status: 'pending'
      }, { transaction: t });

      await t.commit();

      // 7. Non-blocking PDF generation
      try {
        const pdfUrl = await this.pdfService.generateInvoicePdf(invoice, client, orderItemsData);
        invoice.pdf_url = pdfUrl;
        invoice.pdf_generated_at = new Date();
        await invoice.save();
      } catch (err) {
        console.error('Failed to generate PDF for order', order.id, err);
      }

      return order;
    } catch (error) {
      await t.rollback();
      throw error;
    }
  }

  async findAllForClient(clientId: number) {
    return Order.findAll({
      where: { client_id: clientId },
      include: [
        { model: OrderItem },
      ],
      order: [['createdAt', 'DESC']],
    });
  }
}
