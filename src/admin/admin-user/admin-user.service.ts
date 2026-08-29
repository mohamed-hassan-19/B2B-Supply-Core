import { Injectable, ConflictException, BadRequestException, NotFoundException } from '@nestjs/common';
import { CreateAdminUserDto } from './admin-user.dto';
import { AdminUser } from '../../database/models';
import * as bcrypt from 'bcrypt';

@Injectable()
export class AdminUserService {
  async create(createAdminUserDto: CreateAdminUserDto) {
    const existing = await AdminUser.findOne({ where: { email: createAdminUserDto.email } });
    if (existing) {
      throw new ConflictException('Email already in use');
    }

    const saltRounds = 10;
    const password_hash = await bcrypt.hash(createAdminUserDto.password, saltRounds);

    const user = await AdminUser.create({
      name: createAdminUserDto.name,
      email: createAdminUserDto.email,
      password_hash: password_hash,
      role: createAdminUserDto.role,
      is_active: true,
    });

    const { password_hash: _, ...result } = user.toJSON();
    return result;
  }

  async findAll() {
    const users = await AdminUser.findAll({
      attributes: { exclude: ['password_hash'] },
      order: [['createdAt', 'DESC']],
    });
    return users;
  }

  async deactivate(id: number, currentUserId: number) {
    if (id === currentUserId) {
      throw new BadRequestException('Cannot deactivate your own account');
    }

    const user = await AdminUser.findByPk(id);
    if (!user) {
      throw new NotFoundException('Admin user not found');
    }

    user.is_active = false;
    await user.save();

    return { message: 'User deactivated successfully' };
  }

  async reactivate(id: number) {
    const user = await AdminUser.findByPk(id);
    if (!user) {
      throw new NotFoundException('Admin user not found');
    }

    user.is_active = true;
    await user.save();

    return { message: 'User reactivated successfully' };
  }
}
