import { Module } from '@nestjs/common';
import { OrderController } from './order.controller';
import { OrderService } from './order.service';
import { InvoiceModule } from '../../admin/invoice/invoice.module';

@Module({
  imports: [InvoiceModule],
  controllers: [OrderController],
  providers: [OrderService]
})
export class OrderModule {}
