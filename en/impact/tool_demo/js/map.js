// マップ関連の機能
let map, tileLayer;

// マップの初期化
function initMap() {
  // 世界の経度範囲を設定
  const worldBounds = AppConfig.map.bounds;
  
  map = L.map('mapcontainer', {
    minZoom: 2, // 最小ズームレベル
    maxBounds: worldBounds,
    maxBoundsViscosity: AppConfig.map.maxBoundsViscosity,
    zoomControl: false  // ズームコントロールを非表示に設定
  });
  
  map.setView(AppConfig.map.center, AppConfig.map.zoom);
  
  tileLayer = L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '© OpenStreetMap contributors'
  }).addTo(map);
  
  // マップのクリックイベント
  map.on('click', function(e) {
    // 既存のマーカーを削除
    if (AppState.markers.current) map.removeLayer(AppState.markers.current);
    
    const lat = e.latlng.lat;
    const lng = e.latlng.lng;
    
    // マーカー情報を取得（ベクターレイヤーのチェックを含む）
    const markerInfo = getMarkerInfo(lat, lng);
    
    // マーカーを作成
    AppState.markers.current = createMarker(lat, lng);
    
    // 情報パネルを表示
    showInfoPanel(markerInfo);
    AppState.panels.isInfoOpen = true;
    AppState.panels.isRedInfoOpen = false;
  });
}


// 経度の範囲を示す縦線を追加する関数
function addLongitudeLines() {
  // -179.9999の経度に縦線を引く（西側の境界）
  const westLine = L.polyline([
    [-90, -179.9999], // 南端
    [90, -179.9999]   // 北端
  ], {
    color: 'black',
    weight: 1.5,
    opacity: 0.7,
    dashArray: '5, 5' // 破線パターン
  }).addTo(map);
  
  // 179.9999の経度に縦線を引く（東側の境界）
  const eastLine = L.polyline([
    [-90, 179.9999], // 南端
    [90, 179.9999]   // 北端
  ], {
    color: 'black',
    weight: 1.5,
    opacity: 0.7,
    dashArray: '5, 5' // 破線パターン
  }).addTo(map);
  
  // 線にラベルを追加（オプション）
  const westLabel = L.marker([-58, -179.9999], {
    icon: L.divIcon({
      className: 'longitude-label',
      html: '-180°',
      iconSize: [30, 20],
      // iconAnchor: [20, 0]
    })
  }).addTo(map);
  
  const eastLabel = L.marker([-58, 179.9999], {
    icon: L.divIcon({
      className: 'longitude-label',
      html: '180°',
      iconSize: [30, 20],
      // iconAnchor: [20, 0]
    })
  }).addTo(map);
  
  // 線とラベルを保存（後で参照・削除できるように）
  return {
    lines: [westLine, eastLine],
    labels: [westLabel, eastLabel]
  };
}

// 地図を初期状態に戻す関数
function resetMapToInitialState(resetSettings = false) {
  // 1. マップの中心とズームを初期値に戻す
  map.setView(AppConfig.map.center, AppConfig.map.zoom);
  
  // 2. すべてのマーカーを削除
  if (AppState.markers.current) {
    map.removeLayer(AppState.markers.current);
    AppState.markers.current = null;
  }
  
  // 3. 赤マーカーもすべて削除
  if (map.hasLayer) {
    map.eachLayer(function(layer) {
      if (layer instanceof L.Marker) {
        // デフォルトマーカー以外を削除
        if (layer !== AppState.markers.current) {
          map.removeLayer(layer);
        }
      }
    });
  }
  
  // 4. すべてのアクティブレイヤーを非表示にする
  activeLayers.forEach(layerId => {
    if (loadedLayers[layerId] && map.hasLayer(loadedLayers[layerId])) {
      map.removeLayer(loadedLayers[layerId]);
    }
  });

  // ベクターレイヤーをリセット
  if (typeof resetVectorLayers === 'function') {
    resetVectorLayers();
  }

  // レイヤー設定値をリセットするオプション
  if (resetSettings) {
    // すべてのレイヤー設定をリセット
    activeLayers.forEach(layerId => {
      const layer = loadedLayers[layerId];
      if (layer && layer.georasters) {
        const georaster = layer.georasters[0];
        AppState.valueRange[layerId] = { min: georaster.mins[0], max: georaster.maxs[0] };
      }
    });
  }
  
  // 5. レイヤー選択をリセット
  document.querySelectorAll('#layerList input[type="checkbox"]').forEach(checkbox => {
    checkbox.checked = false;
  });
  
  // 6. アクティブレイヤーをクリア
  activeLayers = [];
  
  // 7. レイヤー設定UIを更新
  updateLayerSettingsUI();
  
  // 8. カラーバーを削除
  // すべてのカラーバー要素を検索して削除
  const allColorbars = document.querySelectorAll('[class^="colorbar-"]');
  allColorbars.forEach(element => {
    element.remove();
  });
  colorbarElements = {};
  
  // 9. 情報パネルを閉じる
  closeInfoPanel();
  
  // 10. 状態をリセット
  AppState.panels.isInfoOpen = false;
  AppState.panels.isRedInfoOpen = false;
  AppState.markers.currentOpenRed = null;
  
  console.log('地図を初期状態に戻しました');
}