import { BadRequestException } from '@nestjs/common';
import { Op, Transaction } from 'sequelize';
import { Client, Product, Order, OrderItem, Invoice, InvoiceSequence, OrderActivityLog } from '../../database/models';
import { calculateDiscountTotals } from './discount-calculator.util';

export interface CoreOrderItemData {
  productId?: number;
  customItemName?: string;
  customItemDescription?: string;
  quantity: number;
  purchaseUnit: 'single' | 'dozen';
  dozenSizeAtPurchase?: number | null;
  unitPrice?: number;
  discountPercentage?: number | null;
  isCancelled?: boolean;
}

export interface ExecuteOrderTransactionParams {
  client: Client;
  items: CoreOrderItemData[];
  paymentMethod: 'COD' | 'Credit';
  discountPercentage?: number | null;
  existingOrder?: any | null;
  orderStatus: 'pending' | 'approved';
  actor: string;
  actionType: string;
  description: string;
  source?: string;
  notes?: string;
  transaction: Transaction;
}

export async function executeOrderTransaction(params: ExecuteOrderTransactionParams) {
  const {
    client,
    items,
    paymentMethod,
    existingOrder,
    orderStatus,
    actor,
    actionType,
    description,
    source,
    notes,
    transaction: t
  } = params;

  // 1. Process Stock and Resolve Prices
  const productIds = new Set<number>();
  for (const item of items) {
    if (item.productId) productIds.add(item.productId);
  }

  const oldOrderItemsMap = new Map<number, number>();
  if (existingOrder) {
    const oldItems = await OrderItem.findAll({ where: { order_id: existingOrder.id }, transaction: t });
    for (const oi of oldItems) {
      if (oi.product_id) oldOrderItemsMap.set(oi.product_id, oi.quantity);
      productIds.add(oi.product_id as number);
    }
  }

  const pidArr = Array.from(productIds).sort((a, b) => a - b);
  const products = await Product.findAll({
    where: { id: pidArr },
    transaction: t,
    lock: t.LOCK.UPDATE
  });
  const productMap = new Map<number, Product>();
  products.forEach(p => productMap.set(p.id, p));

  // Restore old stock in memory first
  for (const [pid, oldQty] of oldOrderItemsMap.entries()) {
    const p = productMap.get(pid);
    if (p) p.stock_level += oldQty;
  }

  const orderItemsData: any[] = [];

  // Process new requirements
  for (const item of items) {
    if (item.productId) {
      const product = productMap.get(item.productId);
      if (!product || (!product.is_active && !existingOrder)) {
        if (!product || !product.is_active) {
           throw new BadRequestException(`Product is unavailable`);
        }
      }

      const p = product!;
      let effectiveUnitPrice = item.unitPrice;

      if (effectiveUnitPrice === undefined || effectiveUnitPrice === null) {
        if (item.purchaseUnit === 'dozen') {
          if (!p.dozen_quantity || !p.dozen_price) {
            throw new BadRequestException(`Product ${p.name} cannot be bought by the dozen`);
          }
          effectiveUnitPrice = Number(p.dozen_price) / p.dozen_quantity;
        } else {
          effectiveUnitPrice = Number(p.price);
        }
      }

      if (item.purchaseUnit === 'dozen') {
        const dozenSize = item.dozenSizeAtPurchase || p.dozen_quantity;
        if (dozenSize && item.quantity % dozenSize !== 0) {
          throw new BadRequestException(`Requested quantity ${item.quantity} for dozen purchase of ${p.name} is not an exact multiple of its dozen size (${dozenSize})`);
        }
      }

      if (p.stock_level < item.quantity) {
        throw new BadRequestException(`Insufficient stock for product: ${p.name}. Requested: ${item.quantity}, Available: ${p.stock_level}`);
      }

      orderItemsData.push({
        product_id: p.id,
        product_name: p.name,
        quantity: item.quantity,
        unit_price: effectiveUnitPrice,
        purchase_unit: item.purchaseUnit,
        dozen_size_at_purchase: item.purchaseUnit === 'dozen' ? (item.dozenSizeAtPurchase || p.dozen_quantity) : null,
        discount_percentage: item.discountPercentage || null,
        is_cancelled: item.isCancelled || false
      });

      p.stock_level -= item.quantity;
    } else {
      if (item.unitPrice === undefined || item.unitPrice === null) {
        throw new BadRequestException(`Custom item ${item.customItemName} must have a price`);
      }
      orderItemsData.push({
        custom_item_name: item.customItemName,
        custom_item_description: item.customItemDescription,
        quantity: item.quantity,
        unit_price: item.unitPrice,
        purchase_unit: item.purchaseUnit || 'single',
        dozen_size_at_purchase: null,
        discount_percentage: item.discountPercentage || null,
        is_cancelled: item.isCancelled || false
      });
    }
  }

  for (const p of productMap.values()) {
    await p.save({ transaction: t });
  }

  // 2. Calculate Discounts
  const { itemsSumAfterItemDiscounts, orderDiscountAmount, totalAmount: discountedTotal, processedItems } = calculateDiscountTotals(params.discountPercentage, orderItemsData);

  // 3. Credit Check
  if (paymentMethod === 'Credit') {
    let shouldCheckCredit = true;
    if (existingOrder && discountedTotal <= Number(existingOrder.total_amount)) {
      shouldCheckCredit = false;
    }
    if (shouldCheckCredit) {
      if (!client.credit_limit || client.credit_limit <= 0) {
        throw new BadRequestException('Client is not eligible for Credit payment method. No credit limit assigned.');
      }
      const unpaidInvoices = await Invoice.findAll({
        where: { payment_status: { [Op.in]: ['pending', 'overdue'] } },
        include: [{
          model: Order,
          where: { client_id: client.id },
          attributes: []
        }],
        transaction: t
      });
      
      let unpaidInvoiceTotal = 0;
      for (const inv of unpaidInvoices) {
        if (existingOrder && inv.order_id === existingOrder.id) continue;
        unpaidInvoiceTotal += Number(inv.grand_total || inv.amount);
      }

      const totalExposure = unpaidInvoiceTotal + discountedTotal;
      if (totalExposure > client.credit_limit) {
        throw new BadRequestException(`Credit limit exceeded. Total exposure would be EGP ${totalExposure}`);
      }
    }
  }

  let order, invoice;

  if (existingOrder) {
    order = existingOrder;
    order.total_amount = discountedTotal;
    order.discount_amount = orderDiscountAmount;
    order.discount_percentage = params.discountPercentage;
    order.payment_method = paymentMethod;
    await order.save({ transaction: t });

    await OrderItem.destroy({ where: { order_id: order.id }, transaction: t });
    for (const itemData of processedItems) {
      await OrderItem.create({
        order_id: order.id,
        ...itemData
      }, { transaction: t });
    }

    invoice = await Invoice.findOne({ where: { order_id: order.id }, transaction: t, lock: t.LOCK.UPDATE });
    if (invoice) {
      const taxRate = 0.14;
      const subtotal = itemsSumAfterItemDiscounts;
      const taxAmount = discountedTotal * taxRate;
      const grandTotal = discountedTotal + taxAmount;

      invoice.amount = grandTotal;
      invoice.subtotal = subtotal;
      invoice.tax_amount = taxAmount;
      invoice.grand_total = grandTotal;
      invoice.payment_method = paymentMethod;
      await invoice.save({ transaction: t });
    }
  } else {
    order = await Order.create({
      client_id: client.id,
      status: orderStatus,
      payment_method: paymentMethod,
      total_amount: discountedTotal,
      discount_amount: orderDiscountAmount,
      discount_percentage: params.discountPercentage
    }, { transaction: t });

    for (const itemData of processedItems) {
      await OrderItem.create({
        order_id: order.id,
        ...itemData
      }, { transaction: t });
    }

    const currentYear = new Date().getFullYear();
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
    const subtotal = itemsSumAfterItemDiscounts;
    const taxAmount = discountedTotal * taxRate;
    const grandTotal = discountedTotal + taxAmount;

    invoice = await Invoice.create({
      invoice_number: invoiceNumber,
      order_id: order.id,
      amount: grandTotal,
      subtotal: subtotal,
      tax_rate: taxRate,
      tax_amount: taxAmount,
      grand_total: grandTotal,
      currency: 'EGP',
      payment_method: paymentMethod,
      sales_order_reference: `SO-${order.id}`,
      customer_tax_id: client.tax_registration || null,
      payment_status: 'pending',
      due_date: new Date(Date.now() + (client.credit_terms || 0) * 24 * 60 * 60 * 1000)
    }, { transaction: t });
  }

  const logDesc = source ? `${description} (Source: ${source})` + (notes ? ` - Notes: ${notes}` : ``) : (notes ? `${description} - Notes: ${notes}` : description);
  await OrderActivityLog.create({
    order_id: order.id,
    action_type: actionType as any,
    actor: actor,
    to_status: existingOrder ? undefined : orderStatus,
    description: logDesc
  }, { transaction: t });

  return order;
}
