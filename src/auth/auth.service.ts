import { Injectable, UnauthorizedException, ConflictException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { AdminUser, Client } from '../database/models';

@Injectable()
export class AuthService {
  constructor(private jwtService: JwtService) {}

  async validateAdmin(email: string, pass: string): Promise<any> {
    const admin = await AdminUser.findOne({ where: { email } });
    if (admin && admin.is_active && await bcrypt.compare(pass, admin.password_hash)) {
      const { password_hash, ...result } = admin.toJSON();
      return result;
    }
    return null;
  }

  async validateClient(email: string, pass: string): Promise<any> {
    const client = await Client.findOne({ where: { email } });
    if (client && await bcrypt.compare(pass, client.password_hash)) {
      const { password_hash, ...result } = client.toJSON();
      return result;
    }
    return null;
  }

  async loginAdmin(admin: any) {
    const payload = { email: admin.email, id: admin.id, role: admin.role, type: 'admin', name: admin.name };
    return {
      access_token: this.jwtService.sign(payload),
    };
  }

  async loginClient(client: any) {
    const payload = { email: client.email, id: client.id, status: client.status, type: 'client' };
    return {
      access_token: this.jwtService.sign(payload),
    };
  }

  async registerClient(data: any) {
    const existing = await Client.findOne({ where: { email: data.email } });
    if (existing) {
      throw new ConflictException('Email already in use');
    }

    const saltRounds = 10;
    const password_hash = await bcrypt.hash(data.password, saltRounds);

    const client = await Client.create({
      company_name: data.company_name,
      email: data.email,
      password_hash: password_hash,
      commercial_registration: data.commercial_registration,
      tax_registration: data.tax_registration,
      contact_details: {
        contact_name: data.contact_name,
        phone: data.contact_phone
      },
      status: 'pending'
    });

    return { message: 'Registration successful. Account is pending approval.' };
  }
}
