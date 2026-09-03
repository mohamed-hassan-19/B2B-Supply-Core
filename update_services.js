const fs = require('fs');

const updateService = (filePath, entity, hasClientId = false, hasStatus = false, statusField = 'status', extraFilters = []) => {
  let code = fs.readFileSync(filePath, 'utf8');
  
  // Find findAll method
  const match = code.match(/async findAll\([^)]*\) \{[\s\S]*?\n  \}/);
  if (!match) return console.log('findAll not found in ' + filePath);
  
  if (!code.includes('Op')) {
    code = code.replace(/import \{.*?\} from '\.\.\/\.\.\/database\/models';/, (m) => m + '\nimport { Op } from \'sequelize\';');
  }

  let extras = '';
  extraFilters.forEach(f => {
    extras += ` ${f}?: string,`;
  });

  const replacement = `async findAll(options: { start_date?: string, end_date?: string, client_id?: number, ${hasStatus ? 'status?: string, ' : ''}${extras}page?: number, limit?: number, export?: string | boolean } = {}) {
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

    ${hasClientId ? (entity === 'Invoice' ? `
    // Invoice has order_id which links to client_id
    ` : 'if (options.client_id) where.client_id = options.client_id;') : ''}
    ${hasStatus ? `if (options.status) where.${statusField} = options.status;` : ''}
    ${extraFilters.map(f => `if (options.${f}) where.${f} = options.${f};`).join('\n    ')}

    const queryOptions: any = { where, order: [['createdAt', 'DESC']] };
    
    // Add specific includes if needed based on entity
    ${entity === 'Incident' ? `
    if (options.client_id) {
      queryOptions.include = [
        { model: require('../../database/models').Order, where: { client_id: options.client_id } },
        { model: require('../../database/models').AdminUser, attributes: ['id', 'name', 'email'] }
      ];
    } else {
      queryOptions.include = [
        { model: require('../../database/models').Order },
        { model: require('../../database/models').AdminUser, attributes: ['id', 'name', 'email'] }
      ];
    }
    ` : ''}
    ${entity === 'Quote' ? `queryOptions.include = [{ model: require('../../database/models').Client, attributes: ['company_name', 'is_priority'] }];` : ''}
    ${entity === 'Order' ? `queryOptions.include = [{ model: require('../../database/models').Client, attributes: ['company_name', 'is_priority'] }];` : ''}
    ${entity === 'Invoice' ? `
    if (options.client_id) {
      queryOptions.include = [
        { model: require('../../database/models').Order, where: { client_id: options.client_id }, include: [require('../../database/models').Client] }
      ];
    } else {
      queryOptions.include = [
        { model: require('../../database/models').Order, include: [require('../../database/models').Client] }
      ];
    }
    ` : ''}
    ${entity === 'Client' ? `queryOptions.attributes = { exclude: ['password_hash'] };` : ''}

    if (options.export && (options.export === 'true' || options.export === true)) {
      const items = await ${entity}.findAll(queryOptions);
      return { items, total: items.length, page: 1, limit: items.length };
    }

    const page = Number(options.page) || 1;
    const limit = Number(options.limit) || 20;
    const offset = (page - 1) * limit;

    queryOptions.limit = limit;
    queryOptions.offset = offset;

    const { count, rows } = await ${entity}.findAndCountAll(queryOptions);

    return {
      items: rows,
      total: count,
      page,
      limit
    };
  }`;

  code = code.replace(match[0], replacement);
  fs.writeFileSync(filePath, code);
  console.log('Updated ' + filePath);
};

updateService('src/admin/client/client.service.ts', 'Client', false, true);
updateService('src/admin/product/product.service.ts', 'Product', false, false);
updateService('src/admin/order/order.service.ts', 'Order', true, true);
updateService('src/admin/quote/quote.service.ts', 'Quote', true, false, 'status', ['quote_type']);
updateService('src/admin/invoice/invoice.service.ts', 'Invoice', true, true, 'payment_status'); 
updateService('src/admin/incident/incident.service.ts', 'Incident', true, true, 'status', ['type']);
