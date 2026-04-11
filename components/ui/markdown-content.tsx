"use client";

import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

type MarkdownContentProps = {
  className?: string;
  text: string;
};

export function MarkdownContent({ className, text }: MarkdownContentProps) {
  return (
    <div className={className}>
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          a: ({ node: _node, ...props }) => (
            <a
              {...props}
              className="underline underline-offset-4"
              rel="noreferrer"
              target="_blank"
            />
          ),
          blockquote: ({ node: _node, ...props }) => (
            <blockquote
              {...props}
              className="border-l-2 border-border pl-4 text-muted-foreground italic"
            />
          ),
          code: ({ children, className: codeClassName, node: _node, ...props }) => {
            const isBlock = Boolean(codeClassName);

            if (isBlock) {
              return (
                <code {...props} className={codeClassName}>
                  {children}
                </code>
              );
            }

            return (
              <code
                {...props}
                className="rounded bg-background px-1.5 py-0.5 text-sm text-foreground"
              >
                {children}
              </code>
            );
          },
          em: ({ node: _node, ...props }) => <em {...props} className="italic" />,
          h1: ({ node: _node, ...props }) => (
            <h1 {...props} className="text-xl font-semibold tracking-tight text-foreground" />
          ),
          h2: ({ node: _node, ...props }) => (
            <h2 {...props} className="text-lg font-semibold tracking-tight text-foreground" />
          ),
          h3: ({ node: _node, ...props }) => (
            <h3 {...props} className="text-base font-semibold text-foreground" />
          ),
          hr: ({ node: _node, ...props }) => <hr {...props} className="my-4" />,
          li: ({ node: _node, ...props }) => <li {...props} className="ml-5 pl-1" />,
          ol: ({ node: _node, ...props }) => <ol {...props} className="list-decimal space-y-1" />,
          p: ({ node: _node, ...props }) => <p {...props} className="my-0" />,
          pre: ({ node: _node, ...props }) => (
            <pre
              {...props}
              className="overflow-x-auto rounded-xl border border-border bg-background px-4 py-3 text-foreground"
            />
          ),
          strong: ({ node: _node, ...props }) => <strong {...props} className="font-semibold" />,
          table: ({ node: _node, ...props }) => (
            <div className="overflow-x-auto">
              <table {...props} className="w-full border-collapse text-left text-sm" />
            </div>
          ),
          td: ({ node: _node, ...props }) => (
            <td {...props} className="border px-3 py-2 align-top text-muted-foreground" />
          ),
          th: ({ node: _node, ...props }) => (
            <th {...props} className="border px-3 py-2 font-semibold" />
          ),
          ul: ({ node: _node, ...props }) => <ul {...props} className="list-disc space-y-1" />,
        }}
      >
        {text}
      </ReactMarkdown>
    </div>
  );
}
