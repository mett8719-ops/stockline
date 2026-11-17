import apiClient from "@/core/api/client.js";

export async function fetchEmployees({ signal } = {}) {
  const { data } = await apiClient.get("/users", { signal });
  return data.data;
}

export async function fetchEmployeeRoles({ signal } = {}) {
  const { data } = await apiClient.get("/roles", { signal });
  return data.data;
}

export async function inviteEmployee(employee) {
  const { data } = await apiClient.post("/users", employee);
  return data.data;
}

export async function updateEmployee({ employeeId, changes }) {
  const { data } = await apiClient.patch(`/users/${employeeId}`, changes);
  return data.data;
}
