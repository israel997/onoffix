import { applyDecorators } from '@nestjs/common';
import { Transform, type TransformFnParams } from 'class-transformer';
import { IsEmail } from 'class-validator';

/**
 * @IsEmail() + normalisation (trim + minuscules) avant validation. Les adresses
 * email ne sont pas sensibles à la casse en pratique — sans ça, "Test@x.com" et
 * "test@x.com" sont traités comme deux comptes/invitations distincts partout où
 * on compare des emails (login, invitations, unicité de compte...).
 */
export function NormalizedEmail() {
  return applyDecorators(
    Transform(({ value }: TransformFnParams): unknown =>
      typeof value === 'string' ? value.trim().toLowerCase() : value,
    ),
    IsEmail(),
  );
}
