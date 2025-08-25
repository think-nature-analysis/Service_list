// マーカー関連の機能
let redIcon;

// 赤色のマーカーアイコンを初期化
function initMarkerIcons() {
  redIcon = L.icon({
    iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-red.png',
    shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/0.7.7/images/marker-shadow.png',
    iconSize: [25, 41],
    iconAnchor: [12, 41],
    popupAnchor: [1, -34],
    shadowSize: [41, 41]
  });
}

// マーカーを作成する関数
function createMarker(lat, lon, name, isRedMarker = false) {
  // マーカー情報を取得
  const markerInfo = getMarkerInfo(lat, lon, name);
  
  // マーカーを作成
  const markerIcon = isRedMarker ? redIcon : L.Icon.Default.prototype;
  const marker = L.marker([lat, lon], {icon: markerIcon})
      .addTo(map)
      .bindPopup(markerInfo.popupContent);
  
  // クリックイベントを設定
  if (isRedMarker) {
      // 赤マーカーの場合
      marker.on('click', function(e) {
          handleRedMarkerClick(e, marker, markerInfo);
      });
      
      // ポップアップ表示時にも内容を更新
      marker.on('popupopen', function() {
          // 最新のマーカー情報を取得
          const updatedMarkerInfo = getMarkerInfo(lat, lon, name);
          marker.setPopupContent(updatedMarkerInfo.popupContent);
      });
  } else {
      // 青マーカーの場合
      marker.on('click', function(e) {
          handleMarkerClick(e, marker);
      });
      // 青ピンの場合はポップアップを開く
      marker.openPopup();
  }
  
  return marker;
}



// ポイントがポリゴン内にあるかをチェックする関数（射線アルゴリズム）
function isPointInPolygon(point, polygon) {
  // ポイントの座標
  const x = point[0], y = point[1];
  
  // 射線アルゴリズムの実装
  let inside = false;
  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
      const xi = polygon[i][0], yi = polygon[i][1];
      const xj = polygon[j][0], yj = polygon[j][1];
      
      // 緯度の範囲内にポイントがあり、経度方向の射線が多角形の辺と交差するかチェック
      const intersect = ((yi > y) !== (yj > y)) &&
          (x < (xj - xi) * (y - yi) / (yj - yi) + xi);
      if (intersect) inside = !inside;
  }
  
  return inside;
}



// マーカー情報を取得する関数
function getMarkerInfo(lat, lon, name) {
  // 選択されているレイヤーの値を取得
  const layerValues = {};
  
  // アクティブなラスターレイヤーの値を取得
  activeLayers.forEach(layerId => {
      if (loadedLayers[layerId] && loadedLayers[layerId].georasters) {
          const value = geoblaze.identify(loadedLayers[layerId].georasters[0], [lon, lat]);
          layerValues[layerId] = value;
      }
  });
  
  // ベクターレイヤーのデータを取得
  const vectorFeatures = {};
  
  // アクティブなベクターレイヤーをチェック
  if (typeof activeVectorLayers !== 'undefined' && typeof vectorLayers !== 'undefined') {
      activeVectorLayers.forEach(vectorLayerId => {
          const vectorLayer = vectorLayers[vectorLayerId];
          if (vectorLayer) {
              // クリックした座標を含むフィーチャーを探す
              let foundFeature = null;
              
              // 各フィーチャーをチェック
              vectorLayer.eachLayer(function(layer) {
                  if (layer.feature) {
                      // ポイントの場合は距離をチェック
                      if (layer.feature.geometry.type === 'Point') {
                          const coords = layer.feature.geometry.coordinates;
                          const featureLat = coords[1];
                          const featureLon = coords[0];
                          const distance = L.latLng(lat, lon).distanceTo(L.latLng(featureLat, featureLon));
                          if (distance < 100) { // 100メートル以内なら選択
                              foundFeature = layer.feature;
                          }
                      } 
                      // ポリゴンやラインの場合の正確な判定
                      else if (layer.feature.geometry.type === 'Polygon' || layer.feature.geometry.type === 'MultiPolygon') {
                        // 正確なポイント・イン・ポリゴン判定
                        let isInPolygon = false;
                        
                        try {
                            // GeoJSON形式のポリゴンデータを取得
                            const polygonGeoJSON = layer.feature.geometry;
                            const point = [lon, lat]; // 注意: GeoJSONでは[経度, 緯度]の順
                            
                            // ポリゴンタイプに応じた判定
                            if (polygonGeoJSON.type === 'Polygon') {
                                // Leaflet-PIPなどが使用可能な場合はそれを使用
                                // このサンプルでは簡易判定
                                isInPolygon = isPointInPolygon(point, polygonGeoJSON.coordinates[0]);
                            } 
                            else if (polygonGeoJSON.type === 'MultiPolygon') {
                                // 全てのポリゴンをチェック
                                isInPolygon = polygonGeoJSON.coordinates.some(polygonCoords => {
                                    return isPointInPolygon(point, polygonCoords[0]);
                                });
                            }
                            
                            // ポリゴン内の場合のみフィーチャーを設定
                            if (isInPolygon) {
                                foundFeature = layer.feature;
                                console.log('ポリゴン内: 経度=' + lon + ', 緯度=' + lat);
                            } else {
                                console.log('ポリゴン外: 経度=' + lon + ', 緯度=' + lat);
                            }
                        } catch (e) {
                            console.error('ポリゴン判定中にエラーが発生しました:', e);
                            // エラー時のフォールバック: 従来の方法を使用
                            if (layer.getBounds && layer.getBounds().contains([lat, lon])) {
                                console.warn('バウンディングボックス内ですが、正確なポリゴン判定は失敗しました');
                                // フォールバックの場合は警告表示する
                                foundFeature = layer.feature;
                            }
                        }
                      }
                  }
              });
              
              if (foundFeature) {
                  vectorFeatures[vectorLayerId] = foundFeature;
                  
                  // ベクターレイヤーの値をlayerValuesにも追加
                  if (foundFeature.properties && typeof VectorState !== 'undefined') {
                      const propertyName = VectorState.propertyField[vectorLayerId];
                      if (propertyName && foundFeature.properties[propertyName] !== undefined) {
                          layerValues[vectorLayerId] = foundFeature.properties[propertyName];
                      }
                  }
              }
          }
      });
  }
  
  // ポップアップ内容を作成（同期的に作成するよう修正）
  let popupContent = name
  ? `${name}<br><strong>(LAT, LON) =</strong> (${lat.toFixed(4)}, ${lon.toFixed(4)})`
  : `<strong>(LAT, LON) =</strong> (${lat.toFixed(4)}, ${lon.toFixed(4)})`;

  // 各レイヤーの値を直接追加（同期的に）
  Object.keys(layerValues).forEach(layerId => {
  if (layerValues[layerId] !== undefined && layerValues[layerId] !== null) {
    // ラスターレイヤーの場合
    if (loadedLayers[layerId] && loadedLayers[layerId].georasters) {
      popupContent += `<br><strong>${layerId}:</strong> ${Utils.roundTo(layerValues[layerId], 4)}`;
    }
    // ベクターレイヤーの場合
    else if (vectorFeatures[layerId]) {
      const propertyName = VectorState.propertyField[layerId];
      popupContent += `<br><strong>${layerId} > ${propertyName}:</strong> ${layerValues[layerId]}`;
    }
  }
  });
  
  return {
      lat,
      lon,
      name: name || `地点(${lat.toFixed(4)}, ${lon.toFixed(4)})`,
      layerValues,
      vectorFeatures,
      popupContent
  };
}

// 通常マーカーのクリックイベント処理
function handleMarkerClick(e, marker) {
  // イベントの伝播を停止
  L.DomEvent.stopPropagation(e);
  
  // マーカーを削除
  map.removeLayer(marker);
  AppState.markers.current = null;
  
  // 情報パネルを非表示
  closeInfoPanel();
}

// 赤マーカーのクリックイベント処理
function handleRedMarkerClick(e, marker, markerInfo) {
  // イベントの伝播を停止
  L.DomEvent.stopPropagation(e);
  
  // 現在のマーカーが同じマーカーの場合
  if (AppState.markers.currentOpenRed === marker && AppState.panels.isRedInfoOpen) {
      // 情報パネルを閉じる
      closeInfoPanel();
      marker.closePopup();
      return;
  }
  
  // 通常マーカーが開いている場合は削除
  if (AppState.panels.isInfoOpen && AppState.markers.current) {
      map.removeLayer(AppState.markers.current);
      AppState.markers.current = null;
  }
  
  // マーカー情報を更新（クリック時に最新情報を取得）
  const updatedMarkerInfo = getMarkerInfo(markerInfo.lat, markerInfo.lon, markerInfo.name);
    
  // ポップアップ内容を更新
  marker.setPopupContent(updatedMarkerInfo.popupContent);
  
  // ポップアップを開く
  marker.openPopup();
  
  // 情報パネルを表示
  showInfoPanel(updatedMarkerInfo);
  
  // 状態を更新
  AppState.panels.isRedInfoOpen = true;
  AppState.panels.isInfoOpen = false;
  AppState.markers.currentOpenRed = marker;
}

// CSVファイルからマーカーを読み込む関数
function loadCSVMarkers() {
  // マーカー機能またはCSVインポート機能が無効な場合は何もしない
  if (!isFeatureEnabled('markers.enabled') || !isFeatureEnabled('markers.csvImport')) {
    return;
  }
  
  // ファイル選択用の入力要素を作成
  const fileInput = document.createElement('input');
  fileInput.type = 'file';
  fileInput.accept = '.csv';
  fileInput.style.display = 'none';
  document.body.appendChild(fileInput);
  
  fileInput.addEventListener('change', function(e) {
    const file = e.target.files[0];
    if (!file) return;
    
    const reader = new FileReader();
    reader.onload = function(e) {
      const csvData = e.target.result;
      const markers = Utils.parseCSV(csvData);
      addMarkersToMap(markers);
    };
    reader.readAsText(file);
  });
  
  fileInput.click();
}

// マーカーをマップに追加する関数
function addMarkersToMap(markers) {
  markers.forEach(function(markerData) {
    createMarker(markerData.lat, markerData.lon, markerData.name, true);
  });
}