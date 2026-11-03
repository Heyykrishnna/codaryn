import type { UserEntity } from "./models.js";

export interface IUserService {
  getUser(id: string): Promise<UserEntity>;
}

export class UserService implements IUserService {
  public endpoint: string;

  constructor(endpoint: string) {
    this.endpoint = endpoint;
  }

  public async getUser(id: string): Promise<UserEntity> {
    return {
      id,
      name: "User",
      email: "user@example.com",
      isActive: true,
      createdAt: new Date().toISOString(),
    };
  }
}
