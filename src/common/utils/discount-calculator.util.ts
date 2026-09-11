export function calculateDiscountTotals(
  entityDiscountPercentage: number | null | undefined,
  items: any[]
) {
  let itemsSumAfterItemDiscounts = 0;
  let rawItemsSum = 0;
  const processedItems = items.map((item) => {
    const quantity = item.quantity || item.requested_quantity || 0;
    const unitPrice = Number(item.unit_price || item.quoted_price || 0);
    const lineSubtotal = quantity * unitPrice;
    rawItemsSum += lineSubtotal;

    const itemDiscountPercent = Number(item.discount_percentage) || 0;
    const itemDiscountAmount = Math.round((lineSubtotal * (itemDiscountPercent / 100)) * 100) / 100;
    const lineTotal = lineSubtotal - itemDiscountAmount;

    itemsSumAfterItemDiscounts += lineTotal;

    return {
      ...item,
      id: item.id,
      discount_amount: itemDiscountAmount,
      line_total: lineTotal,
      line_subtotal: lineSubtotal
    };
  });

  const orderDiscountPercent = Number(entityDiscountPercentage) || 0;
  const orderDiscountAmount = Math.round((itemsSumAfterItemDiscounts * (orderDiscountPercent / 100)) * 100) / 100;
  const totalAmount = itemsSumAfterItemDiscounts - orderDiscountAmount;

  return {
    rawItemsSum,
    itemsSumAfterItemDiscounts,
    orderDiscountAmount,
    totalAmount,
    processedItems
  };
}
