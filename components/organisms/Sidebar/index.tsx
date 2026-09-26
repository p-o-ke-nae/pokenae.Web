import Link from "next/link";
import CustomHeader from "@/components/atoms/CustomHeader";
import { primaryNavigation, socialLinks } from "@/lib/config/site";

export default function Sidebar() {
  return (
    <aside className="sidebar" aria-label="サイト案内">
      <section className="sidebar__section">
        <CustomHeader level={2} variant="subtle">MENU</CustomHeader>
        <nav aria-label="サイドメニュー">
          <ul className="sidebar__links">
            {primaryNavigation.map((item) => (
              <li key={item.href}><Link href={item.href}>{item.label}</Link></li>
            ))}
          </ul>
        </nav>
      </section>
      <section className="sidebar__section">
        <CustomHeader level={2} variant="subtle">SNS</CustomHeader>
        <ul className="sidebar__links">
          {socialLinks.map((item) => (
            <li key={item.label}>
              <a href={item.href} target="_blank" rel="noreferrer">{item.label}</a>
            </li>
          ))}
        </ul>
      </section>
      <style>{`
        .sidebar { display:grid; gap:1rem; }
        .sidebar__section { border:1px solid var(--color-base-70); border-top:5px solid var(--color-accent-25); padding:1rem; background:#fff; box-shadow:var(--shadow-card); }
        .sidebar__section .custom-header { margin:0 0 .75rem; }
        .sidebar__links { list-style:none; padding:0; margin:0; display:grid; }
        .sidebar__links li + li { border-top:1px dotted var(--color-base-70-dark); }
        .sidebar__links a { display:block; padding:.65rem .25rem; color:var(--color-text-strong); text-decoration:none; font-weight:650; }
        .sidebar__links a:hover { color:var(--color-accent-25-strong); }
      `}</style>
    </aside>
  );
}
