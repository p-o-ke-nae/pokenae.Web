// デモデータとフォールバック機能
export const demoData = {
  collections: [
    {
      id: 'f1dbf3a5-3b86-4939-99e8-d564a11b4326',
      name: '読書記録',
      description: '読んだ本や読みたい本を管理するコレクション',
      itemCount: 25,
      completionRate: 80,
      lastUpdated: '2025-07-10',
      category: 'Books',
      ownerId: '11111111-1111-1111-1111-111111111111',
      createdAt: '2024-01-01T21:00:00+09:00',
      columnIds: ['cd2489c5-1450-4adf-8b87-5a3391698e20', '67658541-811b-43bb-ad04-6be9e4524743', 'c17b598a-7132-4c3d-9dec-2dbf8886bd94', 'e4af5dd5-fd0c-4b03-bfe6-04e7aba576dc', 'b2a3c709-da83-4dea-8143-736f231de357']
    },
    {
      id: 'a2c4e6f8-1234-5678-9abc-def123456789',
      name: 'フィギュア',
      description: 'アニメフィギュアコレクション',
      itemCount: 45,
      completionRate: 60,
      lastUpdated: '2024-01-10',
      category: 'Figures'
    },
    {
      id: 'b3d5f7e9-2345-6789-abcd-ef1234567890',
      name: '本・漫画',
      description: '書籍・漫画コレクション',
      itemCount: 230,
      completionRate: 85,
      lastUpdated: '2024-01-20',
      category: 'Books'
    }
  ],

  collectionItems: {
    'f1dbf3a5-3b86-4939-99e8-d564a11b4326': [
      {
        id: 'demo-book-1',
        title: 'Book Title',
        author: 'Author Name',
        year: 1905,
        completed: '読了',
        notes: 'ok'
      },
      {
        id: 'demo-book-2',
        title: 'BLACK・CAT',
        author: '新井素子',
        year: 1996,
        completed: '読了',
        notes: 'GOD'
      },
      {
        id: 'demo-book-3',
        title: 'ポケットモンスター',
        author: 'ゲームフリーク',
        year: 1905,
        completed: '未読',
        notes: ''
      },
      {
        id: 'demo-book-4',
        title: 'ハリー・ポッターと賢者の石',
        author: 'J.K.ローリング',
        year: 1997,
        completed: '読了',
        notes: '素晴らしいファンタジー'
      },
      {
        id: 'demo-book-5',
        title: '1984年',
        author: 'ジョージ・オーウェル',
        year: 1949,
        completed: '未読',
        notes: 'ディストピア小説の名作'
      }
    ],
    'a2c4e6f8-1234-5678-9abc-def123456789': [
      {
        id: 1,
        name: '初音ミク フィギュア',
        series: 'Racing Miku',
        scale: '1/8',
        manufacturer: 'グッドスマイルカンパニー',
        condition: 'New',
        quantity: 1,
        obtainedDate: '2024-01-03',
        value: 15000
      }
    ],
    'b3d5f7e9-2345-6789-abcd-ef1234567890': [
      {
        id: 1,
        name: 'ワンピース',
        volume: '第1巻',
        author: '尾田栄一郎',
        publisher: '集英社',
        condition: 'Good',
        quantity: 1,
        obtainedDate: '2023-12-01',
        value: 500
      }
    ]
  },

  columns: {
    'f1dbf3a5-3b86-4939-99e8-d564a11b4326': [
      { name: 'title', displayName: 'タイトル', type: 'string', required: true },
      { name: 'author', displayName: '著者', type: 'string', required: false },
      { name: 'year', displayName: '出版年', type: 'number', required: false },
      { name: 'completed', displayName: '読書完了', type: 'boolean', required: false },
      { name: 'notes', displayName: 'メモ', type: 'string', required: false }
    ],
    'a2c4e6f8-1234-5678-9abc-def123456789': [
      { name: 'name', displayName: 'フィギュア名', type: 'string', required: true },
      { name: 'series', displayName: 'シリーズ', type: 'string', required: false },
      { name: 'scale', displayName: 'スケール', type: 'string', required: false },
      { name: 'manufacturer', displayName: 'メーカー', type: 'string', required: false },
      { name: 'condition', displayName: '状態', type: 'string', required: false },
      { name: 'quantity', displayName: '数量', type: 'number', required: true },
      { name: 'obtainedDate', displayName: '取得日', type: 'date', required: false },
      { name: 'value', displayName: '価値（円）', type: 'number', required: false }
    ],
    'b3d5f7e9-2345-6789-abcd-ef1234567890': [
      { name: 'name', displayName: 'タイトル', type: 'string', required: true },
      { name: 'volume', displayName: '巻数', type: 'string', required: false },
      { name: 'author', displayName: '著者', type: 'string', required: false },
      { name: 'publisher', displayName: '出版社', type: 'string', required: false },
      { name: 'condition', displayName: '状態', type: 'string', required: false },
      { name: 'quantity', displayName: '数量', type: 'number', required: true },
      { name: 'obtainedDate', displayName: '取得日', type: 'date', required: false },
      { name: 'value', displayName: '価値（円）', type: 'number', required: false }
    ]
  }
};

// APIクライアントと統合されたフォールバック機能付きの関数群
export const collectionApiWithFallback = {
  // コレクション一覧取得（フォールバック付き）
  getCollections: async () => {
    try {
      // 元のAPIクライアントをインポートして使用
      const { collectionApi } = await import('./collectionApi');
      return await collectionApi.getCollections();
    } catch (error) {
      console.warn('API error, using demo data:', error.message);
      return {
        success: true,
        data: demoData.collections,
        isDemo: true,
        message: 'APIに接続できないため、デモデータを表示しています。'
      };
    }
  },

  // コレクション詳細取得（フォールバック付き）
  getCollectionById: async (tableId) => {
    try {
      const { collectionApi } = await import('./collectionApi');
      const collectionData = await collectionApi.getCollectionById(tableId);
      
      // レコード情報も取得
      const recordsData = await collectionApi.getRecords(tableId);
      
      return {
        success: true,
        data: {
          ...collectionData,
          items: recordsData
        },
        isDemo: false
      };
    } catch (error) {
      console.warn('API error, using demo data:', error.message);
      const collection = demoData.collections.find(c => c.id === tableId);
      const items = demoData.collectionItems[tableId] || [];
      
      if (collection) {
        return {
          success: true,
          data: {
            ...collection,
            items
          },
          isDemo: true,
          message: 'APIに接続できないため、デモデータを表示しています。'
        };
      } else {
        throw new Error('コレクションが見つかりません');
      }
    }
  },

  // カラム情報取得（フォールバック付き）
  getColumns: async (tableId) => {
    try {
      // 直接APIクライアントを使用してテーブル情報を取得
      const { collectionApi } = await import('./collectionApi');
      const tableData = await collectionApi.getCollectionById(tableId);
      
      // テーブル情報にカラム情報が含まれている場合はそれを使用
      if (tableData && tableData.columns) {
        return {
          success: true,
          data: tableData.columns,
          isDemo: false
        };
      } else {
        // カラム情報がない場合はデモデータにフォールバック
        console.warn('カラム情報がテーブルデータに含まれていません');
        throw new Error('カラム情報がテーブルデータに含まれていません');
      }
    } catch (error) {
      console.warn('API error, using demo data:', error.message);
      const columns = demoData.columns[tableId] || demoData.columns['f1dbf3a5-3b86-4939-99e8-d564a11b4326'];
      
      return {
        success: true,
        data: columns,
        isDemo: true,
        message: 'APIに接続できないため、デモデータを表示しています。'
      };
    }
  }
};

export default demoData;
