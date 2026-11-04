import { eq } from "drizzle-orm";

export class UserRepository {
  constructor(private readonly db: any) {}

  async findById(id: string) {
    return this.db.select().from({}).where(eq({}, id));
  }

  async findAll() {
    return this.db.select().from({});
  }

  async create(data: any) {
    return this.db.insert({}).values(data);
  }

  async delete(id: string) {
    return this.db.delete({}).where(eq({}, id));
  }
}
