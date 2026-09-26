import { Injectable, NotFoundException, InternalServerErrorException } from '@nestjs/common';
import { PackingMaterial } from '../../database/models/packing-material.model';
import { CreatePackingMaterialDto, UpdatePackingMaterialDto } from './packing-material.dto';

@Injectable()
export class PackingMaterialService {
  async findAll() {
    return PackingMaterial.findAll({
      order: [['id', 'ASC']]
    });
  }

  async create(dto: CreatePackingMaterialDto) {
    return PackingMaterial.create(dto as any);
  }

  async update(id: number, dto: UpdatePackingMaterialDto) {
    const material = await PackingMaterial.findByPk(id);
    if (!material) {
      throw new NotFoundException(`Packing material with id ${id} not found`);
    }
    return material.update(dto);
  }
}
