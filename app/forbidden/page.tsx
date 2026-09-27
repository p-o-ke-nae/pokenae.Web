import CustomHeader from "@/components/atoms/CustomHeader";

export default function ForbiddenPage() {
  return <main className="page-container"><CustomHeader>アクセスできません</CustomHeader><p className="notice notice--error">このページには管理者権限が必要です。</p></main>;
}
