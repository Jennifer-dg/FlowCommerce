import { Injectable } from '@nestjs/common';
import * as bcrypt from 'bcryptjs';

// Encapsula el hashing de contraseñas (bcryptjs) con 12 rondas de salt.
@Injectable()
export class PasswordHasherService {
  private readonly saltRounds = 12;

  async hash(plainPassword: string): Promise<string> {
    return bcrypt.hash(plainPassword, this.saltRounds);
  }

  async compare(plainPassword: string, passwordHash: string): Promise<boolean> {
    return bcrypt.compare(plainPassword, passwordHash);
  }
}
