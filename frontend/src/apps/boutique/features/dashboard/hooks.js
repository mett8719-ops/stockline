import { useQuery } from "@tanstack/react-query";
import { useEffect } from "react";
import { getSocket } from "@/core/socket.js";
import { queryClient } from "@/core/queryClient.js";
import { fetchDashboard } from "./api.js";

const dashboardKey = ["reports", "dashboard"];

export function useDashboard() {
  const query = useQuery({
    queryKey: dashboardKey,
    queryFn: fetchDashboard,
  });

  useEffect(() => {
    const socket = getSocket();
    if (!socket) return undefined;

    const refreshDashboard = () => {
      queryClient.invalidateQueries({ queryKey: dashboardKey });
    };

    socket.on("sale:created", refreshDashboard);
    return () => socket.off("sale:created", refreshDashboard);
  }, []);

  return query;
}
