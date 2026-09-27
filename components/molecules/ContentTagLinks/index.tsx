import Link from "next/link";
import type { TagDefinition } from "@/lib/content/types";

export default function ContentTagLinks({
  tagIds,
  tagDefinitions,
  listPath,
}: {
  tagIds: readonly string[];
  tagDefinitions: readonly TagDefinition[];
  listPath: "/blog" | "/tools" | "/apps";
}) {
  if (!tagIds.length) return null;
  const labels = new Map(tagDefinitions.map((tag) => [tag.id, tag.label]));
  return <footer className="content-tags">
    <h2>タグ</h2>
    <ul>
      {tagIds.map((id) => <li key={id}>
        <Link href={`${listPath}?tags=${encodeURIComponent(id)}`}>{labels.get(id) ?? id}</Link>
      </li>)}
    </ul>
  </footer>;
}
