import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import CustomHeader from "@/components/atoms/CustomHeader";
import CollectionDex from "@/components/organisms/CollectionDex";
import type { CollectionDexRecord } from "@/lib/content/types";

export type SafeMarkdownProps = {
  source: string;
  allowedEmbed?: "CollectionDex";
  collectionRecords?: CollectionDexRecord[];
};

function MarkdownBlock({ source }: { source: string }) {
  return (
    <ReactMarkdown
      remarkPlugins={[remarkGfm]}
      skipHtml
      components={{
        h1: ({ children }) => <CustomHeader level={2}>{children}</CustomHeader>,
        h2: ({ children }) => <CustomHeader level={2}>{children}</CustomHeader>,
        h3: ({ children }) => <CustomHeader level={3}>{children}</CustomHeader>,
        h4: ({ children }) => <CustomHeader level={4}>{children}</CustomHeader>,
        h5: ({ children }) => <CustomHeader level={5}>{children}</CustomHeader>,
        h6: ({ children }) => <CustomHeader level={6}>{children}</CustomHeader>,
        a: ({ href, children }) => {
          const external = href?.startsWith("http");
          return <a href={href} target={external ? "_blank" : undefined} rel={external ? "noreferrer" : undefined}>{children}</a>;
        },
        // Markdown画像はCMS由来で寸法が事前に不明なため、遅延読込のimgとして安全に表示する。
        // eslint-disable-next-line @next/next/no-img-element
        img: ({ src, alt }) => <img src={typeof src === "string" ? src : ""} alt={alt ?? ""} loading="lazy" />,
      }}
    >
      {source}
    </ReactMarkdown>
  );
}

export default function SafeMarkdown({ source, allowedEmbed, collectionRecords }: SafeMarkdownProps) {
  const marker = "{{CollectionDex}}";
  if (allowedEmbed !== "CollectionDex") {
    return <article className="markdown"><MarkdownBlock source={source} /></article>;
  }
  if (!source.includes(marker)) {
    return <article className="markdown"><MarkdownBlock source={source} /><CollectionDex records={collectionRecords} /></article>;
  }
  const [before, ...after] = source.split(marker);
  return (
    <article className="markdown">
      <MarkdownBlock source={before} />
      <CollectionDex records={collectionRecords} />
      <MarkdownBlock source={after.join(marker)} />
    </article>
  );
}
