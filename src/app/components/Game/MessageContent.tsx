import ReactMarkdown from "react-markdown";

// Separate component for rendering message content with markdown
interface MessageContentProps {
  content: string;
}

// Helper function to format text nodes
const formatTextNodes = (children: React.ReactNode): React.ReactNode => {
  if (typeof children === "string") {
    return children;
  }

  if (Array.isArray(children)) {
    return children.map((child, index) => {
      if (typeof child === "string") {
        return <span key={index}>{child}</span>;
      }
      return child;
    });
  }

  return children;
};

const MessageContent: React.FC<MessageContentProps> = ({ content }) => {
  return (
    <ReactMarkdown
      components={{
        p: ({ children, ...props }) => {
          const formattedChildren = formatTextNodes(children);
          return (
            <p className={`font-normal my-2 text-md`} {...props}>
              {formattedChildren}
            </p>
          );
        },
        h1: (props) => <h1 className="mb-2 text-2xl font-bold" {...props} />,
        h2: (props) => <h2 className="mb-1 text-xl font-bold" {...props} />,
        h3: (props) => <h3 className="text-lg font-bold" {...props} />,
        ul: (props) => <ul className="list-disc pl-3 sm:pl-3" {...props} />,
        ol: (props) => <ol className="list-decimal pl-3 sm:pl-3" {...props} />,
        li: (props) => <li className="ml-4" {...props} />,
        em: (props) => <em className="italic" {...props} />,
        strong: (props) => <strong className="font-bold" {...props} />,
        a: (props) => <a {...props} />,
        blockquote: (props) => (
          <blockquote
            className="border-gray-200 my-2 border-l-4 pl-4 italic"
            {...props}
          />
        ),
      }}
    >
      {content}
    </ReactMarkdown>
  );
};

export default MessageContent;
