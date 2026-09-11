import { Controller, Get, Post, Body, UseGuards, Patch, Param, Query } from '@nestjs/common';
import { CategoryService } from './category.service';
import { CreateCategoryDto } from './category.dto';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../auth/jwt-auth.guard';
import { RolesGuard } from '../../auth/roles.guard';
import { Roles } from '../../auth/roles.decorator';

@ApiTags('Admin Categories')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('api/admin/categories')
export class CategoryController {
  constructor(private readonly categoryService: CategoryService) {}

  @Get()
  @ApiOperation({ summary: 'List all categories' })
  findAll(@Query('include_inactive') include_inactive?: string) {
    return this.categoryService.findAll(include_inactive === 'true');
  }

  @Post()
  @Roles('super_admin', 'content')
  @ApiOperation({ summary: 'Create a new category' })
  create(@Body() createCategoryDto: CreateCategoryDto) {
    return this.categoryService.create(createCategoryDto);
  }

  @Patch(':id/activate')
  @Roles('super_admin', 'content')
  @ApiOperation({ summary: 'Activate category' })
  activate(@Param('id') id: string) {
    return this.categoryService.activate(+id);
  }

  @Patch(':id/deactivate')
  @Roles('super_admin', 'content')
  @ApiOperation({ summary: 'Deactivate category' })
  deactivate(@Param('id') id: string) {
    return this.categoryService.deactivate(+id);
  }
}
