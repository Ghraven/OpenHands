import { useQuery, useQueryClient } from "@tanstack/react-query";

export type Command = {
  content: string;
  type: "input" | "output";
};

interface CommandState {
  commands: Command[];
}

// Initial state
const initialCommand: CommandState = {
  commands: [],
};

/**
 * Hook to access and manipulate command data using React Query
 * This provides the command slice functionality
 */
export function useCommand() {
  const queryClient = useQueryClient();

  // Get initial state from cache if this is the first time accessing the data
  const getInitialCommandState = (): CommandState => {
    // If we already have data in React Query, use that
    const existingData = queryClient.getQueryData<CommandState>(["command"]);
    if (existingData) return existingData;

    // If no existing data, return the initial state
    return initialCommand;
  };

  // Query for command state
  const query = useQuery({
    queryKey: ["command"],
    queryFn: () => {
      // First check if we already have data in the query cache
      const existingData = queryClient.getQueryData<CommandState>(["command"]);
      if (existingData) return existingData;

      // Otherwise get from the bridge or use initial state
      return getInitialCommandState();
    },
    initialData: initialCommand, // Use initialCommand directly to ensure it's always defined
    staleTime: Infinity, // We manage updates manually through mutations
    refetchOnMount: false,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
  });

  // Function to append input (synchronous)
  const appendInput = (content: string) => {
    // Get current state
    const previousState =
      queryClient.getQueryData<CommandState>(["command"]) || initialCommand;

    // Update state
    const newState = {
      ...previousState,
      commands: [
        ...previousState.commands,
        { content, type: "input" as const },
      ],
    };

    // Set the state synchronously
    queryClient.setQueryData<CommandState>(["command"], newState);
  };

  // Function to append output (synchronous)
  const appendOutput = (content: string) => {
    // Get current state
    const previousState =
      queryClient.getQueryData<CommandState>(["command"]) || initialCommand;

    // Update state
    const newState = {
      ...previousState,
      commands: [
        ...previousState.commands,
        { content, type: "output" as const },
      ],
    };

    // Set the state synchronously
    queryClient.setQueryData<CommandState>(["command"], newState);
  };

  // Function to clear terminal (synchronous)
  const clearTerminal = () => {
    // Update state
    const newState = {
      commands: [],
    };

    // Set the state synchronously
    queryClient.setQueryData<CommandState>(["command"], newState);
  };

  return {
    // State
    commands: query.data?.commands || initialCommand.commands,
    isLoading: query.isLoading,

    // Actions
    appendInput,
    appendOutput,
    clearTerminal,
  };
}
