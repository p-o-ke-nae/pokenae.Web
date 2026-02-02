import { NextResponse } from 'next/server';

// モックデータ
const mockUsers = [
  {
    id: 1,
    name: "田中 太郎",
    email: "tanaka.taro@example.com",
    phone: "03-1234-5678",
    website: "tanaka-portfolio.jp"
  },
  {
    id: 2,
    name: "佐藤 花子",
    email: "sato.hanako@example.com",
    phone: "06-8765-4321",
    website: "hanako-blog.com"
  },
  {
    id: 3,
    name: "鈴木 一郎",
    email: "suzuki.ichiro@example.com",
    phone: "052-9876-5432",
    website: "suzuki-tech.jp"
  },
  {
    id: 4,
    name: "高橋 美咲",
    email: "takahashi.misaki@example.com",
    phone: "092-3456-7890",
    website: "misaki-design.net"
  },
  {
    id: 5,
    name: "渡辺 健",
    email: "watanabe.ken@example.com",
    phone: "011-2345-6789",
    website: "ken-dev.io"
  }
];

export async function GET(request: Request) {
  try {
    // URLからクエリパラメータを取得
    const { searchParams } = new URL(request.url);
    const userIdParam = searchParams.get('id');
    const userId = userIdParam ? parseInt(userIdParam, 10) : 1;

    // ランダムなモックユーザーを返す（1-5の範囲）
    const index = (userId - 1) % mockUsers.length;
    const user = mockUsers[index];
    
    // 実際のAPIのような遅延をシミュレート
    await new Promise(resolve => setTimeout(resolve, 300));
    
    return NextResponse.json(user);
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : '不明なエラーが発生しました' },
      { status: 500 }
    );
  }
}
