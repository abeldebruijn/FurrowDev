"use client";

import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

type MarkdownContentProps = {
  className?: string;
  text: string;
  tone?: "default" | "inverse";
};

const toneClasses = {
  default: {
    blockquote: "border-l-2 border-border pl-4 text-muted-foreground italic",
    code: "rounded bg-background px-1.5 py-0.5 text-sm text-foreground",
    h1: "text-xl font-semibold tracking-tight text-foreground",
    h2: "text-lg font-semibold tracking-tight text-foreground",
    h3: "text-base font-semibold text-foreground",
    pre: "overflow-x-auto rounded-xl border border-border bg-background px-4 py-3 text-foreground",
    td: "border px-3 py-2 align-top text-muted-foreground",
  },
  inverse: {
    blockquote: "border-l-2 border-background/30 pl-4 text-background/80 italic",
    code: "rounded bg-background/15 px-1.5 py-0.5 text-sm text-background",
    h1: "text-xl font-semibold tracking-tight text-background",
    h2: "text-lg font-semibold tracking-tight text-background",
    h3: "text-base font-semibold text-background",
    pre: "overflow-x-auto rounded-xl border border-background/20 bg-background/10 px-4 py-3 text-background",
    td: "border px-3 py-2 align-top text-background/80",
  },
} as const;

export function MarkdownContent({ className, text, tone = "default" }: MarkdownContentProps) {
  const classes = toneClasses[tone];

  return (
    <div className={className}>
      <ReactMarkdown
        disallowedElements={["img"]}
        unwrapDisallowed
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
            <blockquote {...props} className={classes.blockquote} />
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
              <code {...props} className={classes.code}>
                {children}
              </code>
            );
          },
          em: ({ node: _node, ...props }) => <em {...props} className="italic" />,
          h1: ({ node: _node, ...props }) => <h1 {...props} className={classes.h1} />,
          h2: ({ node: _node, ...props }) => <h2 {...props} className={classes.h2} />,
          h3: ({ node: _node, ...props }) => <h3 {...props} className={classes.h3} />,
          hr: ({ node: _node, ...props }) => <hr {...props} className="my-4" />,
          li: ({ node: _node, ...props }) => <li {...props} className="ml-5 pl-1" />,
          ol: ({ node: _node, ...props }) => <ol {...props} className="list-decimal space-y-1" />,
          p: ({ node: _node, ...props }) => <p {...props} className="my-0" />,
          pre: ({ node: _node, ...props }) => <pre {...props} className={classes.pre} />,
          strong: ({ node: _node, ...props }) => <strong {...props} className="font-semibold" />,
          table: ({ node: _node, ...props }) => (
            <div className="overflow-x-auto">
              <table {...props} className="w-full border-collapse text-left text-sm" />
            </div>
          ),
          td: ({ node: _node, ...props }) => <td {...props} className={classes.td} />,
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
