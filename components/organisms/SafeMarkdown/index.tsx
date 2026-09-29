import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import CustomHeader from "@/components/atoms/CustomHeader";
import CollectionDex from "@/components/organisms/CollectionDex";
import MermaidDiagram from "@/components/molecules/MermaidDiagram";
import { getMermaidSource } from "@/lib/content/markdown-mermaid";
import type { CollectionDexRecord } from "@/lib/content/types";
import { resolveRepositoryReference, type RepositoryMarkdownContext } from "@/lib/tools/readme-urls";

export type SafeMarkdownProps = {
  source: string;
  allowedEmbed?: "CollectionDex";
  collectionRecords?: CollectionDexRecord[];
  repositoryContext?: RepositoryMarkdownContext;
  /** 保存前の画像など、Markdown 上のパスを表示用 URL に差し替える対応表 */
  localImages?: Readonly<Record<string, string>>;
};

function MarkdownBlock({ source, repositoryContext, localImages }: Pick<SafeMarkdownProps, "source" | "repositoryContext" | "localImages">) {
  return (
    <ReactMarkdown
      remarkPlugins={[remarkGfm]}
      skipHtml
      components={{
        h1: ({ children }) => <CustomHeader level={2} context="prose">{children}</CustomHeader>,
        h2: ({ children }) => <CustomHeader level={2} context="prose">{children}</CustomHeader>,
        h3: ({ children }) => <CustomHeader level={3} context="prose">{children}</CustomHeader>,
        h4: ({ children }) => <CustomHeader level={4} context="prose">{children}</CustomHeader>,
        h5: ({ children }) => <CustomHeader level={5} context="prose">{children}</CustomHeader>,
        h6: ({ children }) => <CustomHeader level={6} context="prose">{children}</CustomHeader>,
        a: ({ href, children }) => {
          const resolvedHref = resolveRepositoryReference(href, repositoryContext, "link");
          const external = resolvedHref?.startsWith("http");
          return <a href={resolvedHref} target={external ? "_blank" : undefined} rel={external ? "noreferrer" : undefined}>{children}</a>;
        },
        pre: ({ node, children }) => {
          const mermaidSource = getMermaidSource(node);
          return mermaidSource === null ? <pre>{children}</pre> : <MermaidDiagram source={mermaidSource} />;
        },
        img: ({ src, alt }) => {
          const path = typeof src === "string" ? src : "";
          return (
            // Markdown画像はCMS由来で寸法が事前に不明なため、遅延読込のimgとして安全に表示する。
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={localImages?.[path] ?? resolveRepositoryReference(path, repositoryContext, "image")}
              alt={alt ?? ""}
              loading="lazy"
            />
          );
        },
      }}
    >
      {source}
    </ReactMarkdown>
  );
}

export default function SafeMarkdown({ source, allowedEmbed, collectionRecords, repositoryContext, localImages }: SafeMarkdownProps) {
  const marker = "{{CollectionDex}}";
  if (allowedEmbed !== "CollectionDex") {
    return <article className="markdown"><MarkdownBlock source={source} repositoryContext={repositoryContext} localImages={localImages} /></article>;
  }
  if (!source.includes(marker)) {
    return <article className="markdown"><MarkdownBlock source={source} repositoryContext={repositoryContext} localImages={localImages} /><CollectionDex records={collectionRecords} /></article>;
  }
  const [before, ...after] = source.split(marker);
  return (
    <article className="markdown">
      <MarkdownBlock source={before} repositoryContext={repositoryContext} localImages={localImages} />
      <CollectionDex records={collectionRecords} />
      <MarkdownBlock source={after.join(marker)} repositoryContext={repositoryContext} localImages={localImages} />
    </article>
  );
}
