import { aFunc } from "./cycle-a";

export function bFunc(): string {
  return `b:${aFunc()}`;
}
