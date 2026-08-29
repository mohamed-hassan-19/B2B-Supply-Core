import { Module } from '@nestjs/common';
import { StorefrontController } from './storefront.controller';
import { StorefrontService } from './storefront.service';
import { OrderModule } from './order/order.module';
import { QuoteModule } from './quote/quote.module';
import { StorefrontInvoiceModule } from './invoice/invoice.module';

@Module({
  controllers: [StorefrontController],
  providers: [StorefrontService],
  imports: [OrderModule, QuoteModule, StorefrontInvoiceModule]
})
export class StorefrontModule {}
