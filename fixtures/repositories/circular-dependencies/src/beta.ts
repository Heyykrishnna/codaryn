import { gammaFn } from "./gamma";

export function betaFn(): number {
  return gammaFn() * 2;
}
