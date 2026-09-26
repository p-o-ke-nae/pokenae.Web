import type { Metadata } from "next";
import { notFound } from "next/navigation";
import CustomHeader from "@/components/atoms/CustomHeader";
import SafeMarkdown from "@/components/organisms/SafeMarkdown";
import { getContentSnapshot } from "@/lib/content/repository";
import { getRepositoryReadme, getValidatedToolRelease } from "@/lib/tools/releases";

type Props = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const tool = (await getContentSnapshot()).tools.find((item) => item.slug === slug);
  return tool ? { title: tool.name, description: tool.summary } : {};
}

export default async function ToolDetailPage({ params }: Props) {
  const { slug } = await params;
  const tool = (await getContentSnapshot()).tools.find((item) => item.slug === slug);
  if (!tool) notFound();
  const [readme, release] = await Promise.all([getRepositoryReadme(tool.repository), getValidatedToolRelease(tool)]);
  return <main className="page-container"><header className="page-header"><CustomHeader>{tool.name}</CustomHeader><p className="page-lead">{tool.summary}</p><p><span className="pill">{tool.kind === "library" ? "開発者向けライブラリ" : "Windows アプリ"}</span></p></header>
    <section className="stack" aria-labelledby="distribution"><CustomHeader id="distribution" level={2}>配布</CustomHeader>
      {tool.kind === "library" ? <div className="notice"><p>この製品はライブラリです。MSI インストーラーは提供しません。</p><p><a className="button-link" href={tool.packageUrl ?? `https://github.com/${tool.repository}/packages`} target="_blank" rel="noreferrer">NuGet / Package を開く</a></p></div>
      : release.available ? <div className="notice"><p>version {release.manifest.version} / {release.manifest.architecture} / Windows {release.manifest.minimumWindowsVersion} 以降</p><p><a className="button-link" href={release.installerUrl}>検証済み MSI をダウンロード</a> <a href={release.checksumUrl}>SHA-256</a></p><p>現在の MSI は未署名です。ダウンロード後に SHA-256 を確認してください。</p></div>
      : <div className="notice notice--error"><p>{release.reason}</p>{release.releaseUrl && <a href={release.releaseUrl} target="_blank" rel="noreferrer">GitHub Release を確認</a>}</div>}
    </section>
    {readme && <section aria-labelledby="readme"><CustomHeader id="readme" level={2}>README</CustomHeader><SafeMarkdown source={readme} /></section>}
  </main>;
}
