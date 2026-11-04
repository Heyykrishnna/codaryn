import React from "react";
import { UserCard } from "../../../src/components/UserCard";

export default function UserDetailPage({
  params,
}: {
  params: { id: string };
}) {
  return (
    <div>
      <h1>User Profile</h1>
      <UserCard userId={params.id} name="Demo User" />
    </div>
  );
}
