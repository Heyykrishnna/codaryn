export interface ButtonProps {
  label: string;
  disabled?: boolean;
}

export default function Button({ label, disabled }: ButtonProps) {
  return { type: "button", label, disabled };
}
