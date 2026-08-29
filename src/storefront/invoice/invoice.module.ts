import { Module } from '@nestjs/common';
import { StorefrontInvoiceController } from './invoice.controller';
import { StorefrontInvoiceService } from './invoice.service';

@Module({
  controllers: [StorefrontInvoiceController],
  providers: [StorefrontInvoiceService],
})
export class StorefrontInvoiceModule {}
