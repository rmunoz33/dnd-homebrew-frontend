import { useState, useRef, useEffect } from "react";
import { Send } from "lucide-react";
import { useDnDStore, Message } from "@/stores/useStore";
import {
  generateChatCompletion,
  updateCharacterStatsAPI,
} from "@/app/api/openai";
import MessageContent from "./MessageContent";

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
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const messagesContainerRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

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

    // Add event listener for input
    textarea.addEventListener("input", adjustHeight);

    // Cleanup
    return () => {
      textarea.removeEventListener("input", adjustHeight);
    };
  }, [inputMessage]);

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

        // Determine if the change is positive or negative
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

        // Remove the toast after 5 seconds
        setTimeout(() => {
          toast.remove();
        }, 5000);
      });
    }
  };

  return (
    <div className="fixed inset-0">
      <div className="flex flex-col h-full max-w-4xl mx-auto">
        {/* Messages area */}
        <div
          ref={messagesContainerRef}
          data-messages-container="true"
          className="flex-1 overflow-y-auto p-4 relative"
        >
          <div className="flex flex-col justify-end min-h-full">
            {messages.length === 0 ? (
              <div className="text-center text-neutral-content opacity-50">
                <h2 className="text-2xl mb-2">Welcome, brave adventurer!</h2>
                <p>
                  Start your journey by sending a message to your Dungeon
                  Master.
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                {messages.map((message) => (
                  <div
                    key={message.id}
                    className={`flex ${
                      message.sender === "user"
                        ? "justify-end"
                        : "justify-start"
                    }`}
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
                ))}
                <div ref={messagesEndRef} data-messages-end="true" />
              </div>
            )}
          </div>
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
