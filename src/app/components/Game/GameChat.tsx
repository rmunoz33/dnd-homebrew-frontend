import { useState, useRef, useEffect, useCallback } from "react";
import { Send, ArrowDown } from "lucide-react";
import { useDnDStore, Message } from "@/stores/useStore";
import { extractStateChanges } from "@/app/actions/openai";
import { toolRegistry } from "@/app/api/tools";
import MessageContent from "./MessageContent";
import { Virtuoso, VirtuosoHandle } from "react-virtuoso";
import { medievalFont } from "@/app/components/medievalFont";

const GameChat = () => {
  // Zustand store - single source of truth
  const {
    messages: storedMessages,
    addMessage,
    character,
    campaignOutline,
    inputMessage: input,
    setInputMessage: setInput,
    isChatLoading: isLoading,
    setIsChatLoading: setIsLoading,
  } = useDnDStore();

  const virtuosoRef = useRef<VirtuosoHandle>(null);
  const [shouldAutoScroll, setShouldAutoScroll] = useState(true);
  const hasTriggeredGreeting = useRef(false);
  const [isProcessingStateChanges, setIsProcessingStateChanges] = useState(false);

  // Stream a chat response directly to Zustand (no useChat, no syncing needed)
  const streamToZustand = useCallback(
    async (
      aiMessageId: string,
      requestMessages: Array<{ role: string; content: string }>
    ) => {
      try {
        const response = await fetch("/api/chat", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            messages: requestMessages,
            character,
            campaignOutline,
          }),
        });

        if (!response.ok) throw new Error("Failed to send message");

        const reader = response.body?.getReader();
        if (!reader) throw new Error("No response body");

        const decoder = new TextDecoder();
        let fullContent = "";

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          const chunk = decoder.decode(value, { stream: true });
          fullContent += chunk;

          // Update the AI message directly in Zustand by ID
          useDnDStore.setState((state) => {
            const newMessages = [...state.messages];
            const idx = newMessages.findIndex((m) => m.id === aiMessageId);
            if (idx >= 0) {
              newMessages[idx] = { ...newMessages[idx], content: fullContent };
            }
            return { messages: newMessages };
          });
        }

        // Update timestamp when streaming completes
        useDnDStore.setState((state) => {
          const newMessages = [...state.messages];
          const idx = newMessages.findIndex((m) => m.id === aiMessageId);
          if (idx >= 0) {
            newMessages[idx] = {
              ...newMessages[idx],
              timestamp: new Date(),
            };
          }
          return { messages: newMessages };
        });

        return fullContent;
      } catch (error) {
        console.error("Error streaming message:", error);
        useDnDStore.setState((state) => {
          const newMessages = [...state.messages];
          const idx = newMessages.findIndex((m) => m.id === aiMessageId);
          if (idx >= 0) {
            newMessages[idx] = {
              ...newMessages[idx],
              content: "The ancient tome flickers... Please try again.",
            };
          }
          return { messages: newMessages };
        });
        return null;
      }
    },
    [character, campaignOutline]
  );

  // Process state changes after AI response
  const processStateChanges = useCallback(async () => {
    setIsProcessingStateChanges(true);
    try {
      const currentMessages = useDnDStore.getState().messages;
      const currentCharacter = useDnDStore.getState().character;
      const toolCalls = await extractStateChanges(
        currentMessages,
        currentCharacter
      );

      for (const tc of toolCalls) {
        try {
          await toolRegistry.executeTool(tc.tool, tc.params);
        } catch (error) {
          console.error(`Error executing ${tc.tool}:`, error);
        }
      }
    } catch (error) {
      console.error("Error processing state changes:", error);
    } finally {
      setIsProcessingStateChanges(false);
    }
  }, []);

  // Handle form submission
  const handleFormSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      if (!input.trim() || isLoading) return;

      const messageText = input;
      setInput("");
      setIsLoading(true);
      setShouldAutoScroll(true);

      // Add user message to Zustand
      const userMessage: Message = {
        id: Date.now().toString(),
        content: messageText,
        sender: "user",
        timestamp: new Date(),
      };
      addMessage(userMessage);

      // Add placeholder AI message
      const aiMessageId = (Date.now() + 1).toString();
      const aiMessage: Message = {
        id: aiMessageId,
        content: "",
        sender: "ai",
        timestamp: new Date(),
      };
      addMessage(aiMessage);

      // Build message history for API
      const currentMessages = useDnDStore.getState().messages;
      const requestMessages = currentMessages
        .filter((m) => m.content) // Exclude empty placeholder
        .map((m) => ({
          role: m.sender === "user" ? "user" : "assistant",
          content: m.content,
        }));

      // Stream response directly to Zustand
      const response = await streamToZustand(aiMessageId, requestMessages);

      setIsLoading(false);

      // Process state changes if we got a response
      if (response) {
        await processStateChanges();
      }
    },
    [input, isLoading, addMessage, setInput, streamToZustand, processStateChanges]
  );

  // Auto-send initial DM greeting when chat is empty
  useEffect(() => {
    if (storedMessages.length > 0 || hasTriggeredGreeting.current) return;
    hasTriggeredGreeting.current = true;

    const sendGreeting = async () => {
      setIsLoading(true);

      const aiMessageId = Date.now().toString();
      const aiMessage: Message = {
        id: aiMessageId,
        content: "",
        sender: "ai",
        timestamp: new Date(),
      };
      addMessage(aiMessage);

      const greetingPrompt = [
        {
          role: "user",
          content:
            "Begin the adventure. Set the scene for the player and invite them to make their first choice.",
        },
      ];

      await streamToZustand(aiMessageId, greetingPrompt);
      setIsLoading(false);
    };

    sendGreeting();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Scroll handling
  const handleAtBottomStateChange = (isAtBottom: boolean) => {
    setShouldAutoScroll(isAtBottom);
  };

  const handleFollowOutput = (isAtBottom: boolean) => {
    return isAtBottom ? ("auto" as const) : false;
  };

  const renderMessage = (index: number) => {
    const message = storedMessages[index];
    const isLast = index === storedMessages.length - 1;
    const showDmLabel =
      message.sender === "ai" &&
      (index === 0 ||
        (index > 0 && storedMessages[index - 1].sender === "user"));
    const showPlayerLabel =
      message.sender === "user" &&
      (index === 0 ||
        (index > 0 && storedMessages[index - 1].sender === "ai"));

    return (
      <div
        className={`flex ${
          message.sender === "user" ? "justify-end" : "justify-start"
        } pt-4${!isLast ? " pb-4" : ""}`}
      >
        <div
          className={message.sender === "user" ? "max-w-[85%]" : "max-w-[75%]"}
        >
          {showDmLabel && (
            <div
              className={`text-xs text-primary/40 mb-1 ml-1 ${medievalFont.className}`}
            >
              Dungeon Master
            </div>
          )}
          {showPlayerLabel && (
            <div
              className={`text-xs text-primary/40 mb-1 mr-1 text-right ${medievalFont.className}`}
            >
              {character.name}
            </div>
          )}
          <div
            className={`p-2 sm:p-3 ${
              message.sender === "user"
                ? "bg-primary/15 border border-primary/20 text-base-content rounded-lg rounded-br-sm"
                : "bg-neutral border border-primary/10 text-neutral-content rounded-lg rounded-bl-sm chat-ai-glow"
            }`}
          >
            {message.sender === "ai" && !message.content ? (
              <span className="loading loading-dots loading-sm"></span>
            ) : (
              <MessageContent content={message.content} />
            )}
            <div
              className={`text-[10px] sm:text-xs mt-1 text-base-content/50 ${
                message.sender === "user" ? "text-right" : "text-left"
              }`}
            >
              {message.timestamp.toLocaleTimeString()}
            </div>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="fixed inset-0">
      <div className="flex flex-col h-full max-w-4xl mx-auto pr-16 sm:pr-4">
        {/* Messages area */}
        <div className="flex-1 overflow-hidden p-4 relative">
          <Virtuoso
            ref={virtuosoRef}
            data={storedMessages}
            totalCount={storedMessages.length}
            itemContent={renderMessage}
            className="h-full"
            followOutput={handleFollowOutput}
            atBottomThreshold={50}
            alignToBottom
            atBottomStateChange={handleAtBottomStateChange}
            initialTopMostItemIndex={Math.max(0, storedMessages.length - 1)}
            style={{ paddingBottom: 16 }}
          />
          {!shouldAutoScroll && (
            <div className="fixed bottom-20 right-4 z-50">
              <button
                onClick={() => {
                  if (virtuosoRef.current) {
                    virtuosoRef.current.scrollTo({
                      top: Number.MAX_SAFE_INTEGER,
                      behavior: "smooth",
                    });
                  }
                  setShouldAutoScroll(true);
                }}
                className="btn btn-circle bg-base-300 hover:bg-base-200 border border-primary/20 text-primary shadow-lg"
                aria-label="Scroll to bottom"
              >
                <ArrowDown size={20} />
              </button>
            </div>
          )}
        </div>
        {/* Input area */}
        <div className="border-t border-primary/15">
          <div className="max-w-4xl mx-auto px-4 py-2">
            <form
              onSubmit={handleFormSubmit}
              className="flex gap-2 items-end rounded-lg border border-transparent focus-within:border-primary/25 transition-colors p-1"
            >
              <textarea
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Type your message..."
                className="textarea textarea-bordered flex-1 text-base md:text-base min-h-10 sm:min-h-12 bg-base-200/50 border-primary/15 text-base-content placeholder:text-base-content/30 focus:border-primary/40 focus:outline-none disabled:text-base-content/30 disabled:bg-base-200/30 resize-none overflow-y-auto transition-none"
                disabled={isLoading || isProcessingStateChanges}
                rows={1}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    handleFormSubmit(e);
                  }
                }}
              />
              <button
                type="submit"
                disabled={!input?.trim() || isLoading || isProcessingStateChanges}
                className={`btn btn-circle btn-primary h-10 w-10 sm:h-12 sm:w-12 min-h-0 ${
                  isLoading || isProcessingStateChanges ? "loading" : ""
                }`}
              >
                <Send size={18} className="sm:w-5 sm:h-5" />
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
};

export default GameChat;
