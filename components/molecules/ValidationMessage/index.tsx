export default function ValidationMessage({ children, id }: { children?: string; id?: string }) {
  if (!children) return null;
  return <span id={id} className="validation-message">{children}</span>;
}
