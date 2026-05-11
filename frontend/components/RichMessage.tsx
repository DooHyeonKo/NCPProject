"use client";

import type { HTMLAttributes } from "react";
import ReactMarkdown from "react-markdown";
import remarkMath from "remark-math";
import rehypeKatex from "rehype-katex";

type RichMessageProps = {
  content: string;
};

export function RichMessage({ content }: RichMessageProps) {
  return (
    <div className="rich-message">
      <ReactMarkdown
        remarkPlugins={[remarkMath]}
        rehypePlugins={[rehypeKatex]}
        components={{
          code(props: HTMLAttributes<HTMLElement> & { children?: React.ReactNode }) {
            const { className, children, ...rest } = props;
            const value = String(children).replace(/\n$/, "");
            const isBlock = Boolean(className);

            if (!isBlock) {
              return (
                <code className="inline-code" {...rest}>
                  {value}
                </code>
              );
            }

            return (
              <pre className="code-block">
                <code className={className} {...rest}>
                  {value}
                </code>
              </pre>
            );
          },
        }}
      >
        {content}
      </ReactMarkdown>
    </div>
  );
}
