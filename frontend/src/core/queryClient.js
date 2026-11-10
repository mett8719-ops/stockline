import { QueryClient } from "@tanstack/react-query";

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30_000,
      retry: (failureCount, error) => {
        const status = error?.response?.status;

        if (status >= 400 && status < 500) {
          return false;
        }

        return failureCount < 1;
      },
    },
  },
});

export default queryClient;
