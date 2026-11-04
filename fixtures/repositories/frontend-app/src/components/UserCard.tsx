import React, { useState, useEffect } from "react";

export interface UserCardProps {
  userId: string;
  name: string;
}

export function UserCard({ userId, name }: UserCardProps) {
  const [status, setStatus] = useState("idle");

  useEffect(() => {
    async function loadStatus() {
      const res = await fetch(`/api/v1/users/${userId}/status`);
      const data = await res.json();
      setStatus(data.status);
    }
    loadStatus();
  }, [userId]);

  return (
    <div>
      <h2>{name}</h2>
      <p>Status: {status}</p>
    </div>
  );
}
