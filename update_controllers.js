const fs = require('fs');

const updateController = (filePath, extraQueries = []) => {
  let code = fs.readFileSync(filePath, 'utf8');
  
  // Find findAll method
  const match = code.match(/findAll\([\s\S]*?\)\s*\{[\s\S]*?\n  \}/);
  if (!match) return console.log('findAll not found in ' + filePath);

  let queryDecorators = `@ApiQuery({ name: 'start_date', required: false, type: String })
  @ApiQuery({ name: 'end_date', required: false, type: String })
  @ApiQuery({ name: 'client_id', required: false, type: Number })
  @ApiQuery({ name: 'status', required: false, type: String })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiQuery({ name: 'export', required: false, type: String })`;
  
  let args = `@Query('start_date') start_date?: string,
    @Query('end_date') end_date?: string,
    @Query('client_id') client_id?: string,
    @Query('status') status?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('export') exp?: string`;

  let paramObj = `{ 
      start_date, 
      end_date, 
      client_id: client_id ? parseInt(client_id, 10) : undefined, 
      status, 
      page: page ? parseInt(page, 10) : undefined, 
      limit: limit ? parseInt(limit, 10) : undefined,
      export: exp
    }`;
    
  extraQueries.forEach(q => {
    queryDecorators += `\n  @ApiQuery({ name: '${q}', required: false, type: String })`;
    args += `,\n    @Query('${q}') ${q}?: string`;
    paramObj = paramObj.replace('}', `  ${q},\n    }`);
  });

  const replacement = `findAll(
    ${args}
  ) {
    return this.${filePath.split('/').pop().split('.')[0]}Service.findAll(${paramObj});
  }`;
  
  // We also need to add ApiQuery decorators above findAll if missing, but for now we'll just replace the method
  code = code.replace(match[0], replacement);
  fs.writeFileSync(filePath, code);
  console.log('Updated ' + filePath);
};

updateController('src/admin/client/client.controller.ts');
updateController('src/admin/product/product.controller.ts');
updateController('src/admin/order/order.controller.ts');
updateController('src/admin/quote/quote.controller.ts', ['quote_type']);
updateController('src/admin/invoice/invoice.controller.ts');
updateController('src/admin/incident/incident.controller.ts', ['type']);

