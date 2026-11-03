import React from "react";

export type ButtonVariant = "primary" | "secondary";

export interface ButtonProps {
  label: string;
  variant?: ButtonVariant;
  onClick?: () => void;
}

export function Button({ label, variant = "primary", onClick }: ButtonProps) {
  return (
    <button className={`btn-${variant}`} onClick={onClick}>
      {label}
    </button>
  );
}
