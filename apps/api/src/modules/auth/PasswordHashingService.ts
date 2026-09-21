import { Injectable } from "@nestjs/common";
import * as bcrypt from "bcrypt";

@Injectable()
export class PasswordHashingService {
  public async hashPassword(plainPassword: string): Promise<string> {
    return bcrypt.hash(plainPassword, 12);
  }

  public async verifyPassword(
    plainPassword: string,
    passwordHash: string,
  ): Promise<boolean> {
    return bcrypt.compare(plainPassword, passwordHash);
  }
}
