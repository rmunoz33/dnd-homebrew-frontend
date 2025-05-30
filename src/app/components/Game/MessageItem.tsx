import React from "react";
import { Message } from "@/stores/useStore";
import MessageContent from "./MessageContent";

interface MessageItemProps {
  index: number;
  style: React.CSSProperties;
  data: Message[];
}

const MessageItem: React.FC<MessageItemProps> = React.memo(({ index, style, data }) => {
  const message = data[index];
  
  if (!message) {
    return <div style={style} />;
  }

  return (
    <div style={style} className="px-4">
      <div className="py-2">
        <div
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
      </div>
    </div>
  );
});

MessageItem.displayName = 'MessageItem';

export default MessageItem;