import React from "react";
import { ThemeToggle } from "./ThemeToggle";

export interface NavbarProps {
  showToggle?: boolean;
}

export function Navbar(props: NavbarProps) {
  return (
    <nav>
      <h1>App Title</h1>
      {props.showToggle && <ThemeToggle />}
    </nav>
  );
}
