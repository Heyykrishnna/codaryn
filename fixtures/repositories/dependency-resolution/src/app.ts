import React from "react";
import Button, { ButtonProps } from "@components/Button";
import { add } from "@/utils";
import { nonExistentFunction } from "./unresolved-module";

export function runApp(): void {
  const sum = add(10, 20);
  const props: ButtonProps = { label: `Result: ${sum}` };
  Button(props);
}
