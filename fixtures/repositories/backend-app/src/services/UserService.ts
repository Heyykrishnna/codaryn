import { UserRepository } from "../repositories/UserRepository.js";

export class UserService {
  constructor(private readonly userRepository: UserRepository) {}

  async getUser(id: string) {
    return this.userRepository.findById(id);
  }

  async listUsers() {
    return this.userRepository.findAll();
  }

  async createUser(data: any) {
    return this.userRepository.create(data);
  }
}
