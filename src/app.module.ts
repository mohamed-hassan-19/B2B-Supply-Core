import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { Sequelize } from 'sequelize';
import { setupModels } from './database/models';
import { AuthModule } from './auth/auth.module';
import { ProductModule } from './admin/product/product.module';
import { ClientModule } from './admin/client/client.module';
import { StorefrontModule } from './storefront/storefront.module';
import { OrderModule } from './admin/order/order.module';
import { InvoiceModule } from './admin/invoice/invoice.module';
import { QuoteModule } from './admin/quote/quote.module';
import { AdminUserModule } from './admin/admin-user/admin-user.module';
import { CategoryModule } from './admin/category/category.module';
import { ReportsModule } from './admin/reports/reports.module';
import { IncidentModule } from './admin/incident/incident.module';
import * as dotenv from 'dotenv';

dotenv.config();

const databaseProvider = {
  provide: 'SEQUELIZE',
  useFactory: async () => {
    const sequelize = new Sequelize({
      dialect: 'postgres',
      host: process.env.DB_HOST || 'localhost',
      port: parseInt(process.env.DB_PORT || '5432', 10),
      username: process.env.DB_USER || 'postgres',
      password: process.env.DB_PASSWORD || 'postgres',
      database: process.env.DB_NAME || 'procurement_db',
      logging: false,
      dialectOptions: {
        ssl: {
          require: true,
          rejectUnauthorized: false, // ← required for Supabase
        },
      },
    });
    
    setupModels(sequelize);
    
    // Attempt to authenticate
    try {
      await sequelize.authenticate();
      console.log('Database connection has been established successfully.');
      await sequelize.sync({ force: false });
    } catch (error) {
      console.error('Unable to connect to the database:', error);
    }

    try {
      await sequelize.sync({ force: false });
      console.log('All tables synced successfully.');
    } catch (error) {
      console.error('Sync error:', error); 
    }
    
    return sequelize;
  },
};

@Module({
  imports: [AuthModule, ProductModule, ClientModule, StorefrontModule, OrderModule, InvoiceModule, QuoteModule, AdminUserModule, CategoryModule, ReportsModule, IncidentModule],
  controllers: [AppController],
  providers: [AppService, databaseProvider],
  exports: ['SEQUELIZE'],
})
export class AppModule {}
