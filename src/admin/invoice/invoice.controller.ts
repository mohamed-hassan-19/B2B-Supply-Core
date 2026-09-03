import { Controller, Query, Get, Param, Patch, Post, UseGuards } from '@nestjs/common';
import { InvoiceService } from './invoice.service';
import { JwtAuthGuard } from '../../auth/jwt-auth.guard';
import { RolesGuard } from '../../auth/roles.guard';
import { Roles } from '../../auth/roles.decorator';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';

@ApiTags('Admin Invoices')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('api/admin/invoices')
export class InvoiceController {
  constructor(private readonly invoiceService: InvoiceService) {}

  @Get()
  @Roles('super_admin', 'sales', 'warehouse', 'finance', 'content', 'operator')
  @ApiOperation({ summary: 'List all invoices' })
  findAll(
    @Query('start_date') start_date?: string,
    @Query('end_date') end_date?: string,
    @Query('client_id') client_id?: string,
    @Query('status') status?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('export') exp?: string
  ) {
    return this.invoiceService.findAll({ 
      start_date, 
      end_date, 
      client_id: client_id ? parseInt(client_id, 10) : undefined, 
      status, 
      page: page ? parseInt(page, 10) : undefined, 
      limit: limit ? parseInt(limit, 10) : undefined,
      export: exp
    });
  }

  @Get(':id')
  @Roles('super_admin', 'sales', 'warehouse', 'finance', 'content', 'operator')
  @ApiOperation({ summary: 'Get a single invoice by ID' })
  findOne(@Param('id') id: string) {
    return this.invoiceService.findOne(+id);
  }

  @Post('generate/:orderId')
  @Roles('super_admin', 'finance')
  @ApiOperation({ summary: 'Deprecated. Do not use.' })
  generateInvoice(@Param('orderId') orderId: string) {
    return this.invoiceService.generateInvoice(+orderId);
  }

  @Get(':id/pdf')
  @Roles('super_admin', 'sales', 'warehouse', 'finance', 'content', 'operator')
  @ApiOperation({ summary: 'Get or generate the PDF for an invoice' })
  getPdf(@Param('id') id: string) {
    return this.invoiceService.getPdf(+id);
  }

  @Patch(':id/pay')
  @Roles('super_admin', 'finance')
  @ApiOperation({ summary: 'Mark an invoice as paid' })
  payInvoice(@Param('id') id: string) {
    return this.invoiceService.payInvoice(+id);
  }
}
