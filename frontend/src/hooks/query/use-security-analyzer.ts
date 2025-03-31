import { useQuery, useQueryClient } from "@tanstack/react-query";

export enum ActionSecurityRisk {
  UNKNOWN = -1,
  LOW = 0,
  MEDIUM = 1,
  HIGH = 2,
}

export type SecurityAnalyzerLog = {
  id: number;
  content: string;
  security_risk: ActionSecurityRisk;
  confirmation_state?: "awaiting_confirmation" | "confirmed" | "rejected";
  confirmed_changed: boolean;
};

interface SecurityAnalyzerState {
  logs: SecurityAnalyzerLog[];
}

// Initial state
const initialSecurityAnalyzer: SecurityAnalyzerState = {
  logs: [],
};

/**
 * Hook to access and manipulate security analyzer data using React Query
 * This provides the securityAnalyzer slice functionality
 */
export function useSecurityAnalyzer() {
  const queryClient = useQueryClient();

  // Get initial state from cache if this is the first time accessing the data
  const getInitialSecurityAnalyzerState = (): SecurityAnalyzerState => {
    // If we already have data in React Query, use that
    const existingData = queryClient.getQueryData<SecurityAnalyzerState>([
      "securityAnalyzer",
    ]);
    if (existingData) return existingData;

    // If no existing data, return the initial state
    return initialSecurityAnalyzer;
  };

  // Query for security analyzer state
  const query = useQuery({
    queryKey: ["securityAnalyzer"],
    queryFn: () => {
      // First check if we already have data in the query cache
      const existingData = queryClient.getQueryData<SecurityAnalyzerState>([
        "securityAnalyzer",
      ]);
      if (existingData) return existingData;

      // Otherwise get from the bridge or use initial state
      return getInitialSecurityAnalyzerState();
    },
    initialData: initialSecurityAnalyzer, // Use initialSecurityAnalyzer directly to ensure it's always defined
    staleTime: Infinity, // We manage updates manually through mutations
    refetchOnMount: false,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
  });

  // Function to append security analyzer input (synchronous)
  const appendSecurityAnalyzerInput = (message: {
    payload: Record<string, unknown>;
  }) => {
    // Get current state
    const previousState =
      queryClient.getQueryData<SecurityAnalyzerState>(["securityAnalyzer"]) ||
      initialSecurityAnalyzer;

    // Safely access nested properties
    const args = message.payload?.args as Record<string, unknown> | undefined;

    const log: SecurityAnalyzerLog = {
      id: typeof message.payload?.id === "number" ? message.payload.id : 0,
      content:
        (typeof args?.command === "string" ? args.command : "") ||
        (typeof args?.code === "string" ? args.code : "") ||
        (typeof args?.content === "string" ? args.content : "") ||
        (typeof message.payload?.message === "string"
          ? message.payload.message
          : ""),
      security_risk:
        typeof args?.security_risk === "number"
          ? (args.security_risk as ActionSecurityRisk)
          : ActionSecurityRisk.UNKNOWN,
      confirmation_state:
        typeof args?.confirmation_state === "string"
          ? (args.confirmation_state as
              | "awaiting_confirmation"
              | "confirmed"
              | "rejected")
          : undefined,
      confirmed_changed: false,
    };

    // Find existing log if any
    const existingLogIndex = previousState.logs.findIndex(
      (stateLog) =>
        stateLog.id === log.id ||
        (stateLog.confirmation_state === "awaiting_confirmation" &&
          stateLog.content === log.content),
    );

    let newLogs = [...previousState.logs];

    if (existingLogIndex !== -1) {
      // Update existing log
      if (
        previousState.logs[existingLogIndex].confirmation_state !==
        log.confirmation_state
      ) {
        newLogs = newLogs.map((stateLog, index) => {
          if (index === existingLogIndex) {
            return {
              ...stateLog,
              confirmation_state: log.confirmation_state,
              confirmed_changed: true,
            };
          }
          return stateLog;
        });
      }
    } else {
      // Add new log
      newLogs = [...newLogs, log];
    }

    // Update state
    const newState = {
      ...previousState,
      logs: newLogs,
    };

    // Set the state synchronously
    queryClient.setQueryData<SecurityAnalyzerState>(
      ["securityAnalyzer"],
      newState,
    );
  };

  return {
    // State
    logs: query.data?.logs || initialSecurityAnalyzer.logs,
    isLoading: query.isLoading,

    // Actions
    appendSecurityAnalyzerInput,
  };
}
