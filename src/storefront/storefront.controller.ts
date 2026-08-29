import { Controller, Get, Query, Param } from '@nestjs/common';
import { StorefrontService } from './storefront.service';
import { ApiTags, ApiOperation, ApiQuery } from '@nestjs/swagger';

@ApiTags('Storefront Catalog')
@Controller('api/catalog')
export class StorefrontController {
  constructor(private readonly storefrontService: StorefrontService) {}

  @Get()
  @ApiOperation({ summary: 'List all active products in the catalog' })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiQuery({ name: 'search', required: false, type: String })
  @ApiQuery({ name: 'category', required: false, type: String })
  findAll(
    @Query('page') page: string = '1',
    @Query('limit') limit: string = '20',
    @Query('search') search?: string,
    @Query('category') category?: string,
  ) {
    return this.storefrontService.findAll(
      parseInt(page, 10),
      parseInt(limit, 10),
      search,
      category,
    );
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get details of an active product' })
  findOne(@Param('id') id: string) {
    return this.storefrontService.findOne(+id);
  }
}
