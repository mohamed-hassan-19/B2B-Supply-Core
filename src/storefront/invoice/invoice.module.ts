import { Module } from '@nestjs/common';
import { StorefrontInvoiceController } from './invoice.controller';
import { StorefrontInvoiceService } from './invoice.service';
import { InvoiceModule } from '../../admin/invoice/invoice.module';

@Module({
  imports: [InvoiceModule],
  controllers: [StorefrontInvoiceController],
  providers: [StorefrontInvoiceService],
})
export class StorefrontInvoiceModule {}
