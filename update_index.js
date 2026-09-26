const fs = require('fs');
let content = fs.readFileSync('src/database/models/index.ts', 'utf8');

const importStr = `import { Purchase, initPurchase } from './purchase.model';\n`;
content = importStr + content;

content = content.replace('initOrderPackingMaterialUsage(sequelize);', 'initOrderPackingMaterialUsage(sequelize);\n  initPurchase(sequelize);');

const relationsStr = `
  // Purchases
  Product.hasMany(Purchase, { foreignKey: 'product_id' });
  Purchase.belongsTo(Product, { foreignKey: 'product_id' });
  AdminUser.hasMany(Purchase, { foreignKey: 'created_by' });
  Purchase.belongsTo(AdminUser, { foreignKey: 'created_by' });
`;
content = content.replace('export {', relationsStr + '\nexport {');

// export Purchase
content = content.replace('  OrderPackingMaterialUsage', '  OrderPackingMaterialUsage,\n  Purchase');

fs.writeFileSync('src/database/models/index.ts', content);
