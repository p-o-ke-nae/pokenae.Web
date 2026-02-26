import Link from 'next/link';

export default function Footer() {
  return (
    <footer className="w-full bg-white dark:bg-zinc-900 border-t border-zinc-200 dark:border-zinc-800">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
        <div className="flex justify-center items-center gap-6 text-sm text-zinc-500 dark:text-zinc-400">
          <Link
            href="/privacy-policy"
            className="hover:text-zinc-700 dark:hover:text-zinc-200 transition-colors"
          >
            プライバシーポリシー
          </Link>
        </div>
      </div>
    </footer>
  );
}
