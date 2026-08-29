import { ExtractJwt, Strategy } from 'passport-jwt';
import { PassportStrategy } from '@nestjs/passport';
import { Injectable, UnauthorizedException } from '@nestjs/common';
import { AdminUser } from '../database/models';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor() {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: process.env.JWT_SECRET || 'super_secret_jwt_key_12345',
    });
  }

  async validate(payload: any) {
    if (payload.type === 'admin') {
      const admin = await AdminUser.findByPk(payload.id);
      if (!admin || !admin.is_active) {
        throw new UnauthorizedException('User is deactivated or does not exist');
      }
    }
    // This payload will be added to the Request object as `req.user`
    return { id: payload.id, role: payload.role, status: payload.status, type: payload.type };
  }
}
