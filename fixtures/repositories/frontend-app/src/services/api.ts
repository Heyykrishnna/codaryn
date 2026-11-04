export async function checkHealth() {
  const response = await fetch("/api/v1/health", { method: "GET" });
  return response.json();
}

export async function getUser(userId: string) {
  const response = await fetch(`/api/v1/users/${userId}`);
  return response.json();
}
