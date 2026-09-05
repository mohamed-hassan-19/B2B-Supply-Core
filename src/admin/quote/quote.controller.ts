import { Controller, Get, Param, Patch, Post, Body, UseGuards, Query } from '@nestjs/common';
import { QuoteService } from './quote.service';
import { CreateQuoteDto, UpdateQuoteDto } from './quote.dto';
import { JwtAuthGuard } from '../../auth/jwt-auth.guard';
import { RolesGuard } from '../../auth/roles.guard';
import { Roles } from '../../auth/roles.decorator';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';

@ApiTags('Admin Quotes')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('api/admin/quotes')
export class QuoteController {
  constructor(private readonly quoteService: QuoteService) {}

  @Get()
  @Roles('super_admin', 'sales', 'warehouse', 'finance', 'content', 'operator')
  @ApiOperation({ summary: 'List all quotes' })
  findAll(
    @Query('start_date') start_date?: string,
    @Query('end_date') end_date?: string,
    @Query('client_id') client_id?: string,
    @Query('status') status?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('export') exp?: string,
    @Query('quote_type') quote_type?: string
  ) {
    return this.quoteService.findAll({ 
      start_date, 
      end_date, 
      client_id: client_id ? parseInt(client_id, 10) : undefined, 
      page: page ? parseInt(page, 10) : undefined, 
      limit: limit ? parseInt(limit, 10) : undefined,
      export: exp,
      
    });
  }

  @Post()
  @Roles('super_admin', 'sales', 'operator')
  @ApiOperation({ summary: 'Draft a new quote' })
  create(@Body() createQuoteDto: CreateQuoteDto) {
    return this.quoteService.createQuote(createQuoteDto.clientId, createQuoteDto.items, createQuoteDto.valid_until);
  }

  @Patch(':id/send')
  @Roles('super_admin', 'sales', 'operator')
  @ApiOperation({ summary: 'Send quote to client' })
  send(@Param('id') id: string) {
    return this.quoteService.sendQuote(+id);
  }

  @Patch(':id')
  @Roles('super_admin', 'sales', 'operator')
  @ApiOperation({ summary: 'Update a draft or sent quote' })
  update(@Param('id') id: string, @Body() updateQuoteDto: UpdateQuoteDto) {
    return this.quoteService.updateQuote(+id, updateQuoteDto);
  }
}
