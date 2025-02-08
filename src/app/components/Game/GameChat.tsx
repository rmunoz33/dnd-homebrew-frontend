import { useState, useRef, useEffect } from "react";
import { medievalFont } from "@/app/components/medievalFont";
import { Send } from "lucide-react";
import { useDnDStore, Message, Character } from "@/stores/useStore";

const GameChat = () => {
  const { character, messages, addMessage, updateLastMessage, setCharacter } =
    useDnDStore();
  const [inputMessage, setInputMessage] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

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
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          message: inputMessage,
          character,
          messages: messages,
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to get response");
      }

      if (!response.body) {
        throw new Error("No response body");
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let fullContent = "";
      let buffer = "";

      while (true) {
        const { value, done } = await reader.read();
        if (done) break;

        const text = decoder.decode(value);
        buffer += text;

        // Check for complete update blocks
        while (
          buffer.includes("---UPDATE---") &&
          buffer.includes("---END_UPDATE---")
        ) {
          const updateStart = buffer.indexOf("---UPDATE---");
          const updateEnd =
            buffer.indexOf("---END_UPDATE---") + "---END_UPDATE---".length;
          const updateBlock = buffer.slice(updateStart, updateEnd);

          // Remove the update block from the buffer
          buffer = buffer.slice(0, updateStart) + buffer.slice(updateEnd);

          // Process the update
          try {
            const updateJson = JSON.parse(
              updateBlock
                .replace("---UPDATE---", "")
                .replace("---END_UPDATE---", "")
                .trim()
            );

            if (updateJson.type === "character_update") {
              // Merge the updates with the current character state
              setCharacter({
                ...character,
                ...updateJson.content,
                // Special handling for nested objects
                equipment: updateJson.content.equipment
                  ? {
                      ...character.equipment,
                      ...updateJson.content.equipment,
                    }
                  : character.equipment,
                money: updateJson.content.money
                  ? {
                      ...character.money,
                      ...updateJson.content.money,
                    }
                  : character.money,
              });
            }
          } catch (e) {
            console.error("Failed to process character update:", e);
          }
        }

        // Update the visible message content
        fullContent = buffer;
        updateLastMessage(fullContent);
      }
    } catch (error) {
      console.error("Error sending message:", error);
      updateLastMessage("Sorry, I encountered an error. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0">
      <div className="flex flex-col h-full max-w-4xl mx-auto">
        {/* Messages area */}
        <div className="flex-1 overflow-y-auto p-4">
          <div className="flex flex-col justify-end min-h-full">
            {messages.length === 0 ? (
              <div className="text-center text-neutral-content opacity-50">
                <h2 className={`${medievalFont.className} text-2xl mb-2`}>
                  Welcome, brave adventurer!
                </h2>
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
                        <p className="break-words whitespace-pre-wrap text-sm sm:text-base">
                          {message.content}
                        </p>
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
                <div ref={messagesEndRef} />
              </div>
            )}
          </div>
        </div>

        {/* Input area */}
        <div className="border-t border-gray-700">
          <div className="max-w-4xl mx-auto px-4 py-2">
            <div className="flex gap-2">
              <input
                type="text"
                value={inputMessage}
                onChange={(e) => setInputMessage(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    handleSendMessage();
                  }
                }}
                placeholder="Type your message..."
                className="input input-bordered flex-1 text-sm sm:text-base h-10 sm:h-12 bg-gray-500 text-white placeholder-gray-400 disabled:text-gray-500 disabled:bg-gray-600"
                disabled={isLoading}
              />
              <button
                onClick={handleSendMessage}
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
