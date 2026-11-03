import { bFunc } from "./cycle-b";

export function aFunc(): string {
  return `a:${bFunc()}`;
}
