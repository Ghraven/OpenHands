import { useDisclosure } from "@heroui/react";
import React from "react";
import { Outlet } from "react-router";
import { FaServer } from "react-icons/fa";
import { useTranslation } from "react-i18next";
import { I18nKey } from "#/i18n/declaration";
import {
  ConversationProvider,
  useConversation,
} from "#/context/conversation-context";
import { Controls } from "#/components/features/controls/controls";
import { useChat } from "#/hooks/query/use-chat";
import { useCommand } from "#/hooks/query/use-command";
import { useEffectOnce } from "#/hooks/use-effect-once";
import CodeIcon from "#/icons/code.svg?react";
import GlobeIcon from "#/icons/globe.svg?react";
import ListIcon from "#/icons/list-type-number.svg?react";
import { useJupyter } from "#/hooks/query/use-jupyter";
import { FilesProvider } from "#/context/files";
import { ChatInterface } from "../../components/features/chat/chat-interface";
import { WsClientProvider } from "#/context/ws-client-provider";
import { EventHandler } from "./event-handler";
import { useConversationConfig } from "#/hooks/query/use-conversation-config";
import { Container } from "#/components/layout/container";
import {
  Orientation,
  ResizablePanel,
} from "#/components/layout/resizable-panel";
import Security from "#/components/shared/modals/security/security";
import { useEndSession } from "#/hooks/use-end-session";
import { useUserConversation } from "#/hooks/query/use-user-conversation";
import { ServedAppLabel } from "#/components/layout/served-app-label";
import { TerminalStatusLabel } from "#/components/features/terminal/terminal-status-label";
import { useSettings } from "#/hooks/query/use-settings";

import { displayErrorToast } from "#/utils/custom-toast-handlers";
import { useInitialQuery } from "#/hooks/query/use-initial-query";

function AppContent() {
  useConversationConfig();
  const { t } = useTranslation();
  const { data: settings } = useSettings();
  const { conversationId } = useConversation();
  const { data: conversation, isFetched } = useUserConversation(
    conversationId || null,
  );
  const { initialPrompt, files, clearInitialPrompt, clearFiles } =
    useInitialQuery();
  const endSession = useEndSession();
  const { clearMessages, addUserMessage } = useChat();

  const [width, setWidth] = React.useState(window.innerWidth);

  const secrets = React.useMemo(
    // secrets to filter go here
    () => [].filter((secret) => secret !== null),
    [],
  );

  const Terminal = React.useMemo(
    () => React.lazy(() => import("#/components/features/terminal/terminal")),
    [],
  );

  React.useEffect(() => {
    if (isFetched && !conversation) {
      displayErrorToast(
        "This conversation does not exist, or you do not have permission to access it.",
      );
      endSession();
    }
  }, [conversation, isFetched]);

  const { clearTerminal } = useCommand();
  const { clearJupyter } = useJupyter();

  React.useEffect(() => {
    clearMessages();
    clearTerminal();
    clearJupyter();
    if (conversationId && (initialPrompt || files.length > 0)) {
      addUserMessage({
        content: initialPrompt || "",
        imageUrls: files || [],
        timestamp: new Date().toISOString(),
        pending: true,
      });
      clearInitialPrompt();
      clearFiles();
    }
  }, [conversationId]);

  useEffectOnce(() => {
    clearMessages();
    clearTerminal();
    clearJupyter();
  });

  function handleResize() {
    setWidth(window.innerWidth);
  }

  React.useEffect(() => {
    window.addEventListener("resize", handleResize);
    return () => {
      window.removeEventListener("resize", handleResize);
    };
  }, []);

  const {
    isOpen: securityModalIsOpen,
    onOpen: onSecurityModalOpen,
    onOpenChange: onSecurityModalOpenChange,
  } = useDisclosure();

  function renderMain() {
    if (width <= 640) {
      return (
        <div className="rounded-xl overflow-hidden border border-neutral-600 w-full">
          <ChatInterface />
        </div>
      );
    }
    return (
      <ResizablePanel
        orientation={Orientation.HORIZONTAL}
        className="grow h-full min-h-0 min-w-0"
        initialSize={500}
        firstClassName="rounded-xl overflow-hidden border border-neutral-600 bg-base-secondary"
        secondClassName="flex flex-col overflow-hidden"
        firstChild={<ChatInterface />}
        secondChild={
          <ResizablePanel
            orientation={Orientation.VERTICAL}
            className="grow h-full min-h-0 min-w-0"
            initialSize={500}
            firstClassName="rounded-xl overflow-hidden border border-neutral-600"
            secondClassName="flex flex-col overflow-hidden"
            firstChild={
              <Container
                className="h-full"
                labels={[
                  {
                    label: t(I18nKey.WORKSPACE$TITLE),
                    to: "",
                    icon: <CodeIcon />,
                  },
                  { label: "Jupyter", to: "jupyter", icon: <ListIcon /> },
                  {
                    label: <ServedAppLabel />,
                    to: "served",
                    icon: <FaServer />,
                  },
                  {
                    label: (
                      <div className="flex items-center gap-1">
                        {t(I18nKey.BROWSER$TITLE)}
                      </div>
                    ),
                    to: "browser",
                    icon: <GlobeIcon />,
                  },
                ]}
              >
                <FilesProvider>
                  <Outlet />
                </FilesProvider>
              </Container>
            }
            secondChild={
              <Container
                className="h-full overflow-scroll"
                label={<TerminalStatusLabel />}
              >
                {/* Terminal uses some API that is not compatible in a server-environment. For this reason, we lazy load it to ensure
                 * that it loads only in the client-side. */}
                <React.Suspense fallback={<div className="h-full" />}>
                  <Terminal secrets={secrets} />
                </React.Suspense>
              </Container>
            }
          />
        }
      />
    );
  }

  return (
    <WsClientProvider conversationId={conversationId}>
      <EventHandler>
        <div data-testid="app-route" className="flex flex-col h-full gap-3">
          <div className="flex h-full overflow-auto">{renderMain()}</div>

          <Controls
            setSecurityOpen={onSecurityModalOpen}
            showSecurityLock={!!settings?.SECURITY_ANALYZER}
          />
          {settings && (
            <Security
              isOpen={securityModalIsOpen}
              onOpenChange={onSecurityModalOpenChange}
              securityAnalyzer={settings.SECURITY_ANALYZER}
            />
          )}
        </div>
      </EventHandler>
    </WsClientProvider>
  );
}

function App() {
  return (
    <ConversationProvider>
      <AppContent />
    </ConversationProvider>
  );
}

export default App;
