import {
  Controller,
  Get,
  Post,
  Param,
  Body,
  UseGuards,
  UsePipes,
} from "@nestjs/common";
import { UserService } from "../services/UserService.js";
import { AuthGuard } from "../middleware/auth.js";
import { ValidationPipe } from "../middleware/validation.js";

@Controller("api/v1/users")
@UseGuards(AuthGuard)
export class UserController {
  constructor(private readonly userService: UserService) {}

  @Get()
  async getAllUsers() {
    return this.userService.listUsers();
  }

  @Get(":id")
  async getUserById(@Param("id") id: string) {
    return this.userService.getUser(id);
  }

  @Post()
  @UsePipes(ValidationPipe)
  async createUser(@Body() data: any) {
    return this.userService.createUser(data);
  }
}
