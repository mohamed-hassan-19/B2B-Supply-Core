import { Injectable, NotFoundException } from '@nestjs/common';
import { Client } from '../../database/models';
import { UpdateClientStatusDto, UpdateClientCreditDto } from './client.dto';

@Injectable()
export class ClientService {
  async findAll(status?: string) {
    const whereClause = status ? { status } : {};
    return Client.findAll({ where: whereClause, attributes: { exclude: ['password_hash'] } });
  }

  async findOne(id: number) {
    const client = await Client.findByPk(id, { attributes: { exclude: ['password_hash'] } });
    if (!client) {
      throw new NotFoundException(`Client with ID ${id} not found`);
    }
    return client;
  }

  async updateStatus(id: number, updateClientStatusDto: UpdateClientStatusDto) {
    const client = await Client.findByPk(id);
    if (!client) throw new NotFoundException(`Client with ID ${id} not found`);
    return client.update({ status: updateClientStatusDto.status });
  }

  async updateCredit(id: number, updateClientCreditDto: UpdateClientCreditDto) {
    const client = await Client.findByPk(id);
    if (!client) throw new NotFoundException(`Client with ID ${id} not found`);
    return client.update(updateClientCreditDto);
  }
}
