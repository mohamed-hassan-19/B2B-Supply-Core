import { Module } from '@nestjs/common';
import { QuoteController } from './quote.controller';
import { QuoteService } from './quote.service';
import { InvoiceModule } from '../../admin/invoice/invoice.module';

@Module({
  imports: [InvoiceModule],
  controllers: [QuoteController],
  providers: [QuoteService]
})
export class QuoteModule {}
