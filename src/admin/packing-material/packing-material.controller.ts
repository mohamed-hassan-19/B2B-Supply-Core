import { Controller, Get, Post, Patch, Body, Param, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { PackingMaterialService } from './packing-material.service';
import { CreatePackingMaterialDto, UpdatePackingMaterialDto } from './packing-material.dto';
import { JwtAuthGuard } from '../../auth/jwt-auth.guard';
import { RolesGuard } from '../../auth/roles.guard';
import { Roles } from '../../auth/roles.decorator';

@ApiTags('Admin - Packing Materials')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('api/admin/packing-materials')
export class PackingMaterialController {
  constructor(private readonly packingMaterialService: PackingMaterialService) {}

  @Get()
  @Roles('super_admin', 'warehouse', 'operator')
  @ApiOperation({ summary: 'List all packing materials' })
  findAll() {
    return this.packingMaterialService.findAll();
  }

  @Post()
  @Roles('super_admin', 'warehouse')
  @ApiOperation({ summary: 'Create a new packing material' })
  create(@Body() dto: CreatePackingMaterialDto) {
    return this.packingMaterialService.create(dto);
  }

  @Patch(':id')
  @Roles('super_admin', 'warehouse')
  @ApiOperation({ summary: 'Update a packing material' })
  update(@Param('id') id: string, @Body() dto: UpdatePackingMaterialDto) {
    return this.packingMaterialService.update(+id, dto);
  }
}
