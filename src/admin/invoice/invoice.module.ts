import { Module } from '@nestjs/common';
import { InvoiceController } from './invoice.controller';
import { InvoiceService } from './invoice.service';
import { PdfService } from './pdf.service';

@Module({
  controllers: [InvoiceController],
  providers: [InvoiceService, PdfService],
  exports: [PdfService]
})
export class InvoiceModule {}
