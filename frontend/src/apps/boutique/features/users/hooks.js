import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  fetchEmployeeRoles,
  fetchEmployees,
  inviteEmployee,
  updateEmployee,
} from "./api.js";

const employeeKeys = {
  all: ["employees"],
  roles: ["employee-roles"],
};

export function useEmployees() {
  return useQuery({
    queryKey: employeeKeys.all,
    queryFn: fetchEmployees,
  });
}

export function useEmployeeRoles() {
  return useQuery({
    queryKey: employeeKeys.roles,
    queryFn: fetchEmployeeRoles,
  });
}

function useRefreshEmployees() {
  const queryClient = useQueryClient();

  return async () => {
    await queryClient.invalidateQueries({ queryKey: employeeKeys.all });
  };
}

export function useInviteEmployee() {
  const refreshEmployees = useRefreshEmployees();

  return useMutation({
    mutationFn: inviteEmployee,
    onSuccess: refreshEmployees,
  });
}

export function useUpdateEmployee() {
  const refreshEmployees = useRefreshEmployees();

  return useMutation({
    mutationFn: updateEmployee,
    onSuccess: refreshEmployees,
  });
}
