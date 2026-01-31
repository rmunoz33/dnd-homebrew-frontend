import { useState, useRef, useEffect } from "react";
import { Send, ArrowDown } from "lucide-react";
import { useDnDStore, Message } from "@/stores/useStore";
import { generateChatCompletion } from "@/app/api/openai";
import MessageContent from "./MessageContent";
import { Virtuoso, VirtuosoHandle } from "react-virtuoso";
import { medievalFont } from "@/app/components/medievalFont";

const GameChat = () => {
  // Store
  const {
    messages,
    addMessage,
    updateLastMessage,
    inputMessage,
    setInputMessage,
  } = useDnDStore();
  const [isLoading, setIsLoading] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const virtuosoRef = useRef<VirtuosoHandle>(null);
  const [shouldAutoScroll, setShouldAutoScroll] = useState(true);
  const hasTriggeredGreeting = useRef(false);

  // Auto-resize the textarea based on content
  useEffect(() => {
    const textarea = textareaRef.current;
    if (!textarea) return;
    const adjustHeight = () => {
      textarea.style.height = "auto";
      const newHeight = Math.min(textarea.scrollHeight, 128); // 8rem = 128px
      textarea.style.height = `${newHeight}px`;
    };
    adjustHeight();
    textarea.addEventListener("input", adjustHeight);
    return () => {
      textarea.removeEventListener("input", adjustHeight);
    };
  }, [inputMessage]);

  // Auto-send initial DM greeting when chat is empty
  useEffect(() => {
    if (messages.length > 0 || hasTriggeredGreeting.current) return;
    hasTriggeredGreeting.current = true;

    const sendGreeting = async () => {
      const aiMessage: Message = {
        id: Date.now().toString(),
        content: "",
        sender: "ai",
        timestamp: new Date(),
      };
      addMessage(aiMessage);
      setIsLoading(true);
      try {
        await generateChatCompletion(
          "Begin the adventure. Set the scene for the player and invite them to make their first choice."
        );
      } catch (error) {
        console.error("Error sending greeting:", error);
        updateLastMessage("The ancient tome flickers... Please try again.");
      } finally {
        setIsLoading(false);
      }
    };

    sendGreeting();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Use atBottomStateChange to manage autoscroll
  const handleAtBottomStateChange = (isAtBottom: boolean) => {
    setShouldAutoScroll(isAtBottom);
  };

  // When a new message is sent, scroll to bottom and enable autoscroll
  useEffect(() => {
    if (!virtuosoRef.current) return;
    // If user is at bottom or last message is from user, scroll to bottom
    if (
      shouldAutoScroll ||
      (messages.length > 0 && messages[messages.length - 1].sender === "user")
    ) {
      virtuosoRef.current.scrollTo({ top: 999999, behavior: "smooth" });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [messages.length]);

  // Autoscroll as the last message content changes (for streaming AI responses), but only if shouldAutoScroll
  const lastMessageContent =
    messages.length > 0 ? messages[messages.length - 1].content : "";
  useEffect(() => {
    if (!virtuosoRef.current) return;
    if (messages.length === 0) return;
    if (shouldAutoScroll) {
      virtuosoRef.current.scrollTo({ top: 999999, behavior: "auto" });
    }
  }, [lastMessageContent, shouldAutoScroll, messages.length]);

  const handleSendMessage = async () => {
    if (!inputMessage.trim() || isLoading) return;
    const userMessage: Message = {
      id: Date.now().toString(),
      content: inputMessage,
      sender: "user",
      timestamp: new Date(),
    };
    const aiMessage: Message = {
      id: (Date.now() + 1).toString(),
      content: "",
      sender: "ai",
      timestamp: new Date(),
    };
    addMessage(userMessage);
    addMessage(aiMessage);
    setInputMessage("");
    // Explicitly scroll to bottom after sending and enable autoscroll
    if (virtuosoRef.current) {
      virtuosoRef.current.scrollTo({ top: 999999, behavior: "smooth" });
    }
    setShouldAutoScroll(true);
    setIsLoading(true);
    try {
      const success = await generateChatCompletion();
      if (!success) {
        throw new Error("Failed to get response");
      }
      // Character state updates and toasts are now handled
      // automatically by the AI's tool calls during generation
    } catch (error) {
      console.error("Error sending message:", error);
      updateLastMessage("Sorry, I encountered an error. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  // Add a dummy spacer item to the end of the messages array
  const virtuosoData = [...messages, { id: "spacer", type: "spacer" }];

  const renderMessage = (index: number) => {
    const item = virtuosoData[index];
    // Type guard for spacer
    if ("type" in item && item.type === "spacer") {
      return <div style={{ height: 48 }} />;
    }
    const message = item as Message;
    // Only add bottom margin if not the last real message
    const isLast = index === virtuosoData.length - 2;
    // Show DM label if this is an AI message and the previous message was from the user (or it's the first message)
    const showDmLabel =
      message.sender === "ai" &&
      (index === 0 ||
        (index > 0 &&
          !("type" in virtuosoData[index - 1]) &&
          (virtuosoData[index - 1] as Message).sender === "user"));

    return (
      <div
        className={`flex ${
          message.sender === "user" ? "justify-end" : "justify-start"
        } mt-4${!isLast ? " mb-4" : ""}`}
      >
        <div className={message.sender === "user" ? "max-w-[85%]" : "max-w-[75%]"}>
          {showDmLabel && (
            <div className={`text-xs text-primary/40 mb-1 ml-1 ${medievalFont.className}`}>
              Dungeon Master
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
            data={virtuosoData}
            totalCount={virtuosoData.length}
            itemContent={renderMessage}
            className="h-full"
            followOutput={false}
            atBottomStateChange={handleAtBottomStateChange}
          />
          {!shouldAutoScroll && (
            <div className="fixed bottom-20 right-4 z-50">
              <button
                onClick={() => {
                  if (virtuosoRef.current) {
                    virtuosoRef.current.scrollTo({
                      top: 999999,
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
            <div className="flex gap-2 items-end rounded-lg border border-transparent focus-within:border-primary/25 transition-colors p-1">
              <textarea
                ref={textareaRef}
                value={inputMessage}
                onChange={(e) => setInputMessage(e.target.value)}
                placeholder="Type your message..."
                className="textarea textarea-bordered flex-1 text-base md:text-base min-h-10 sm:min-h-12 bg-base-200/50 border-primary/15 text-base-content placeholder:text-base-content/30 focus:border-primary/40 focus:outline-none disabled:text-base-content/30 disabled:bg-base-200/30 resize-none overflow-y-auto transition-none"
                disabled={isLoading}
                rows={1}
              />
              <button
                onClick={(e) => {
                  e.preventDefault();
                  handleSendMessage();
                }}
                disabled={!inputMessage.trim() || isLoading}
                className={`btn btn-circle btn-primary h-10 w-10 sm:h-12 sm:w-12 min-h-0 ${
                  isLoading ? "loading" : ""
                }`}
              >
                <Send size={18} className="sm:w-5 sm:h-5" />
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default GameChat;
