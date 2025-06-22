import { useState, useRef, useEffect } from "react";
import { Send } from "lucide-react";
import { useDnDStore, Message } from "@/stores/useStore";
import {
  generateChatCompletion,
  updateCharacterStatsAPI,
} from "@/app/api/openai";
import MessageContent from "./MessageContent";
import { Virtuoso, VirtuosoHandle } from "react-virtuoso";
import { ArrowDown } from "lucide-react";

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
      await updateCharacterStats();
    } catch (error) {
      console.error("Error sending message:", error);
      updateLastMessage("Sorry, I encountered an error. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  const updateCharacterStats = async () => {
    console.log("Checking for character stat updates...");
    const changes = await updateCharacterStatsAPI();
    console.log("Received changes from API:", changes);

    const showToast = (message: string, isPositive: boolean) => {
      const toast = document.createElement("div");
      toast.className = "toast toast-end";
      const alert = document.createElement("div");
      alert.className = `alert ${isPositive ? "alert-success" : "alert-error"}`;
      alert.textContent = message;
      toast.appendChild(alert);
      document.body.appendChild(toast);
      setTimeout(() => {
        toast.remove();
      }, 5000);
    };

    if (changes) {
      useDnDStore.getState().applyCharacterChanges(changes);

      if (changes.type === "stat_changes" && changes.changes) {
        changes.changes.forEach((change: any) => {
          if (change.type === "item_remove") {
            const message = `Removed: ${change.item}`;
            showToast(message, false);
            return;
          }
          if (change.type === "item_add") {
            const message = `Acquired: ${change.item}`;
            showToast(message, true);
            return;
          }
          const formattedStat = change.stat
            .split(".")
            .map((word: string) => word.charAt(0).toUpperCase() + word.slice(1))
            .join(" ");
          const message = `${formattedStat} ${change.change > 0 ? "+" : ""}${
            change.change
          }`;
          showToast(message, change.change > 0);
        });
      }
      if (changes.type === "tool_results" && changes.results?.allResults) {
        changes.results.allResults.forEach((result: any) => {
          if (result.result && result.result.name) {
            const message = `Acquired: ${result.result.name}`;
            showToast(message, true);
          }
        });
      }
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
    return (
      <div
        className={`flex ${
          message.sender === "user" ? "justify-end" : "justify-start"
        } mt-3${!isLast ? " mb-3" : ""}`}
      >
        <div
          className={`max-w-[85%] rounded-lg p-2 sm:p-3 ${
            message.sender === "user"
              ? "bg-gray-600 text-white"
              : "bg-neutral text-neutral-content"
          }`}
        >
          {message.sender === "ai" && !message.content ? (
            <span className="loading loading-dots loading-sm"></span>
          ) : (
            <MessageContent content={message.content} />
          )}
          <div
            className={`text-[10px] sm:text-xs mt-1 opacity-70 ${
              message.sender === "user" ? "text-right" : "text-left"
            }`}
          >
            {message.timestamp.toLocaleTimeString()}
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="fixed inset-0">
      <div className="flex flex-col h-full max-w-4xl mx-auto">
        {/* Messages area */}
        <div className="flex-1 overflow-hidden p-4 relative">
          {messages.length === 0 ? (
            <div className="text-center text-neutral-content opacity-50">
              <h2 className="text-2xl mb-2">Welcome, brave adventurer!</h2>
              <p>
                Start your journey by sending a message to your Dungeon Master.
              </p>
            </div>
          ) : (
            <>
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
                    className="btn btn-circle bg-gray-700 hover:bg-gray-600 text-white shadow-lg"
                    aria-label="Scroll to bottom"
                  >
                    <ArrowDown size={20} />
                  </button>
                </div>
              )}
            </>
          )}
        </div>
        {/* Input area */}
        <div className="border-t border-gray-700">
          <div className="max-w-4xl mx-auto px-4 py-2">
            <div className="flex gap-2 items-end">
              <textarea
                ref={textareaRef}
                value={inputMessage}
                onChange={(e) => setInputMessage(e.target.value)}
                placeholder="Type your message..."
                className="textarea textarea-bordered flex-1 text-base md:text-base min-h-10 sm:min-h-12 bg-gray-500 text-white placeholder-gray-400 disabled:text-gray-500 disabled:bg-gray-600 resize-none overflow-y-auto transition-none"
                disabled={isLoading}
                rows={1}
              />
              <button
                onClick={(e) => {
                  e.preventDefault();
                  handleSendMessage();
                }}
                disabled={!inputMessage.trim() || isLoading}
                className={`btn btn-circle btn-neutral-content h-10 w-10 sm:h-12 sm:w-12 min-h-0 ${
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
