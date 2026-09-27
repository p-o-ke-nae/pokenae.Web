import { groupContentUpdatesByDate } from "@/lib/content/presentation";
import type { ContentUpdate } from "@/lib/content/types";

export default function InfoList({ updates }: { updates: ContentUpdate[] }) {
  const groups = groupContentUpdatesByDate(updates);

  return <ul className="info-list">
    {groups.map((group) => <li className="info-list__group" key={group.date}>
      <time dateTime={group.date}>{group.date}</time>
      <div className="info-list__items">
        {group.updates.map((item) => item.href
          ? <a className="info-list__item" href={item.href} key={item.id}>{item.summary}</a>
          : <span className="info-list__item" key={item.id}>{item.summary}</span>)}
      </div>
    </li>)}
  </ul>;
}
