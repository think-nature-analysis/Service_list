// ユーティリティ関数
const Utils = {
  // 小数点第n位で四捨五入する関数
  roundTo: (num, decimal) => {
    if (num === null || num === undefined || isNaN(num)) return "N/A";
    return Math.round(num * 10 ** decimal) / 10 ** decimal;
  },
  
  // 元のArrayBufferをクローン
  cloneArrayBuffer: (original) => {
    const clone = new ArrayBuffer(original.byteLength);
    new Uint8Array(clone).set(new Uint8Array(original));
    return clone;
  },
  
  // CSVファイルを解析する関数
  parseCSV: (csvData) => {
    const lines = csvData.split('\n');
    const markers = [];
    
    if (lines.length < 2) return markers; // ヘッダー行とデータ行が最低限必要
    
    // ヘッダー行を解析して列のインデックスを特定
    const headerLine = lines[0].trim();
    const headers = headerLine.split(',').map(header => header.trim().toLowerCase());
    
    // 必要な列のインデックスを特定
    const nameIndex = headers.findIndex(header => 
      header === 'name' || header === '地点名' || header === '名称' || header === '地名' || header === '拠点名'
    );
    const latIndex = headers.findIndex(header => 
      header === 'lat' || header === '緯度' || header === 'latitude'
    );
    const lonIndex = headers.findIndex(header => 
      header === 'lon' || header === 'lng' || header === '経度' || header === 'longitude'
    );
    
    // 必要な列が見つからない場合はエラー
    if (latIndex === -1 || lonIndex === -1) {
      alert('CSVファイルに緯度・経度の列が見つかりません。\n列名には「lat/緯度」と「lon/lng/経度」を含めてください。');
      return markers;
    }
    
    // ヘッダー行をスキップして2行目から処理
    for (let i = 1; i < lines.length; i++) {
      if (lines[i].trim() === '') continue;
      
      // 単純なカンマ区切りで分割
      const parts = lines[i].split(',');
      
      // 緯度経度を取得
      const lat = parseFloat(parts[latIndex].trim());
      const lon = parseFloat(parts[lonIndex].trim());
      
      // 名称を取得（名称列が見つからない場合は緯度経度を使用）
      const name = nameIndex !== -1 ? parts[nameIndex].trim() : `地点(${lat.toFixed(4)}, ${lon.toFixed(4)})`;
      
      if (!isNaN(lat) && !isNaN(lon)) {
        markers.push({
          name: name,
          lat: lat,
          lon: lon
        });
      }
    }
    
    return markers;
  },
  
  // レイヤー設定をIDで取得する関数（キャッシュ付き）
  layerConfigCache: {},
  
  getLayerConfig: async (layerId) => {
    // キャッシュにあればそれを返す
    if (Utils.layerConfigCache[layerId]) {
      return Utils.layerConfigCache[layerId];
    }
    
    try {
      const response = await fetch(AppConfig.layersConfigUrl);
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const config = await response.json();
      const layerConfig = config.layers.find(layer => layer.id === layerId);
      
      if (layerConfig) {
        // キャッシュに保存
        Utils.layerConfigCache[layerId] = layerConfig;
        return layerConfig;
      } else {
        throw new Error(`レイヤー ${layerId} の設定が見つかりません。`);
      }
    } catch (error) {
      console.error(`レイヤー ${layerId} の設定取得に失敗しました:`, error);
      return null;
    }
  },
  
  // 全レイヤー設定を取得する関数
  getAllLayerConfigs: async () => {
    try {
      const response = await fetch(AppConfig.layersConfigUrl);
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const config = await response.json();
      return config.layers;
    } catch (error) {
      console.error('レイヤー設定の取得に失敗しました:', error);
      return [];
    }
  }
};