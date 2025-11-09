const getAuthToken = () => {
  return localStorage.getItem('auth_token');
};

export const fetchPageTitle = async () => {
  // APIからページタイトルを取得するロジックを実装
  // ここでは仮のデータを返します
  return 'ページタイトル';
};

export const fetchPageList = async () => {
  // APIからページ一覧を取得するロジックを実装
  // ここでは仮のデータを返します
  return [
    { id: 1, name: 'ページ1' },
    { id: 2, name: 'ページ2' },
    { id: 3, name: 'ページ3' },
  ];
};

export const fetchCategories = async () => {
  // 現在のコードをコメントアウト
  /*
  const token = getAuthToken();
  try {
    const response = await fetch('https://pokenaewebsystem-exh8gegsfvajg8dr.japaneast-01.azurewebsites.net/api/Pages/headers', {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });
    if (!response.ok) {
      throw new Error('Network response was not ok');
    }
    const data = await response.json();

    return data.map(item => ({
      id: item.id,
      name: item.title,
      url: `/${item.route}`
    }));
  } catch (error) {
    console.error('Fetching categories failed:', error);
    return [];
  }
  */

  // モックデータを返すコードに置き換え
  return [
    { id: 1, name: 'カテゴリー1', url: '/category1' },
    { id: 2, name: 'カテゴリー2', url: '/category2' },
    { id: 3, name: 'カテゴリー3', url: '/category3' },
  ];
};

export const fetchCollectionData = async (tableId) => {
  // APIからコレクションデータを取得するロジック
  // 現在はモックデータを返します
  const token = getAuthToken();
  
  try {
    // 実際のAPIエンドポイントに置き換えてください
    /*
    const response = await fetch(`https://pokenaewebsystem-exh8gegsfvajg8dr.japaneast-01.azurewebsites.net/api/Collection/${tableId}`, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });
    
    if (!response.ok) {
      throw new Error('データの取得に失敗しました');
    }
    
    const data = await response.json();
    return data;
    */
    
    // モックデータ
    return {
      tableId: tableId,
      tableName: `テーブル ${tableId}`,
      items: [
        { id: 1, name: 'ポケモン図鑑001', category: 'フシギダネ', status: '収集済み', rarity: 'ノーマル' },
        { id: 2, name: 'ポケモン図鑑002', category: 'フシギソウ', status: '未収集', rarity: 'レア' },
        { id: 3, name: 'ポケモン図鑑003', category: 'フシギバナ', status: '収集済み', rarity: 'スーパーレア' },
        { id: 4, name: 'ポケモン図鑑004', category: 'ヒトカゲ', status: '収集済み', rarity: 'ノーマル' },
        { id: 5, name: 'ポケモン図鑑005', category: 'リザード', status: '未収集', rarity: 'レア' },
      ]
    };
  } catch (error) {
    console.error('Fetching collection data failed:', error);
    throw error;
  }
};

export const updateCollectionItem = async (tableId, itemId, updatedData) => {
  // コレクションアイテムを更新するAPI
  const token = getAuthToken();
  
  try {
    /*
    const response = await fetch(`https://pokenaewebsystem-exh8gegsfvajg8dr.japaneast-01.azurewebsites.net/api/Collection/${tableId}/item/${itemId}`, {
      method: 'PUT',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(updatedData)
    });
    
    if (!response.ok) {
      throw new Error('アイテムの更新に失敗しました');
    }
    
    const data = await response.json();
    return data;
    */
    
    // モックレスポンス
    return {
      success: true,
      message: 'アイテムが正常に更新されました',
      item: { ...updatedData, id: itemId }
    };
  } catch (error) {
    console.error('Updating collection item failed:', error);
    throw error;
  }
};