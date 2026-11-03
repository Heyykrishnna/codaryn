export type EntityId = string | number;

export interface BaseEntity {
  id: EntityId;
  readonly createdAt: string;
}

export interface UserEntity extends BaseEntity {
  name: string;
  email: string;
  isActive: boolean;
}
