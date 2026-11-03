import { betaFn } from "./beta";

export function alphaFn(): number {
  return betaFn() + 1;
}
