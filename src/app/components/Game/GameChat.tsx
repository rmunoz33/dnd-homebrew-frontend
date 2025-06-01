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
  const [atBottom, setAtBottom] = useState(true);

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

  // Ensure autoscroll to bottom when a new message is sent by the user or when atBottom is true
  useEffect(() => {
    if (!virtuosoRef.current) return;
    // If user is at bottom or last message is from user, scroll to bottom
    if (
      atBottom ||
      (messages.length > 0 && messages[messages.length - 1].sender === "user")
    ) {
      virtuosoRef.current.scrollTo({ top: 999999, behavior: "smooth" });
    }

    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [messages.length]);

  // NEW: Ensure autoscroll to bottom as the last message content changes (for streaming AI responses)
  const lastMessageContent =
    messages.length > 0 ? messages[messages.length - 1].content : "";
  useEffect(() => {
    if (!virtuosoRef.current) return;
    if (messages.length === 0) return;
    if (isLoading || atBottom) {
      virtuosoRef.current.scrollTo({ top: 999999, behavior: "auto" });
    }

    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lastMessageContent, isLoading, atBottom]);

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
    // Explicitly scroll to bottom after sending
    if (virtuosoRef.current) {
      virtuosoRef.current.scrollTo({ top: 999999, behavior: "smooth" });
    }
    setIsLoading(true);
    try {
      const success = await generateChatCompletion();
      if (!success) {
        throw new Error("Failed to get response");
      }
    } catch (error) {
      console.error("Error sending message:", error);
      updateLastMessage("Sorry, I encountered an error. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  const updateCharacterStats = async () => {
    const changes = await updateCharacterStatsAPI();
    if (changes) {
      changes.forEach((change) => {
        const message =
          change.old === "Added" || change.old === "Removed"
            ? `${change.field}: ${change.old} ${change.new}`
            : `${change.field} changed from ${change.old} to ${change.new}`;
        const toast = document.createElement("div");
        toast.className = "toast toast-end";
        const alert = document.createElement("div");
        let isPositive = false;
        if (change.old === "Added") {
          isPositive = true;
        } else if (change.old === "Removed") {
          isPositive = false;
        } else {
          isPositive = Number(change.new) > Number(change.old);
        }
        alert.className = `alert ${
          isPositive ? "alert-success" : "alert-error"
        }`;
        alert.textContent = message;
        toast.appendChild(alert);
        document.body.appendChild(toast);
        setTimeout(() => {
          toast.remove();
        }, 5000);
      });
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
                followOutput={isLoading || atBottom}
                atBottomStateChange={setAtBottom}
              />
              {!atBottom && (
                <div className="fixed bottom-20 right-4 z-50">
                  <button
                    onClick={() =>
                      virtuosoRef.current &&
                      virtuosoRef.current.scrollTo({
                        top: 999999,
                        behavior: "smooth",
                      })
                    }
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
                  handleSendMessage().then(() => updateCharacterStats());
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
