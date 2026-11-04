import React from "react";
import { DynamicLoader } from "../src/components/DynamicLoader";

export default function HomePage() {
  return (
    <div>
      <h1>Welcome Home</h1>
      <DynamicLoader />
    </div>
  );
}
