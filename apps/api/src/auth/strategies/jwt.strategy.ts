import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { JwtPayload } from '../jwt-payload.interface';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(configService: ConfigService) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: configService.getOrThrow<string>('JWT_ACCESS_SECRET'),
    });
  }

  validate(payload: JwtPayload) {
    // Un token doit toujours porter une session complète (membership + org). Rejette
    // tout token structurellement incomplet plutôt que de laisser passer des champs undefined.
    if (!payload.sub || !payload.accountId || !payload.organisationId || !payload.roleGlobal) {
      throw new UnauthorizedException('Token invalide');
    }
    return {
      userId: payload.sub,
      accountId: payload.accountId,
      organisationId: payload.organisationId,
      roleGlobal: payload.roleGlobal,
    };
  }
}
