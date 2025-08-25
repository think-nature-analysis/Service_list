// レイヤー関連の機能
let loadedLayers = {}; // 読み込まれたレイヤーを保持するオブジェクト
let activeLayers = []; // 現在アクティブなレイヤーのIDを保持する配列（最大2つ）
let colorbarElements = {}; // カラーバー要素を保持するオブジェクト

// アプリケーションの状態管理
const AppState = {
  layers: {},        // 読み込まれたレイヤーオブジェクト
  markers: {
    current: null,
    currentOpenRed: null
  },
  panels: {
    isInfoOpen: false,
    isRedInfoOpen: false
  },
  colorMaps: {},     // レイヤーごとのカラーマップ設定
  valueRange: {}     // レイヤーごとの値範囲設定
};

// レイヤー設定を読み込む関数を修正
function loadLayerConfig() {
  return fetch(AppConfig.layersConfigUrl)
      .then(response => {
          if (!response.ok) {
              throw new Error(`HTTP error! status: ${response.status}`);
          }
          return response.json();
      })
      .then(config => {
          // ラスターレイヤーのみをフィルタリング
          const rasterLayers = config.layers.filter(layer => layer.type !== 'vector');
          
          // レイヤー選択UIを構築（UIが有効な場合のみ）
          if (isFeatureEnabled('rasterLayers.layerSelectionPanel')) {
              buildLayerSelectionUI(config.layers);
          }
          
          // 初期表示レイヤーのチェック
          if (projectConfig && isFeatureEnabled('rasterLayers.initmap') && rasterLayers.length > 0) {
              // 最初のラスターレイヤーを初期表示
              const firstRasterLayer = rasterLayers[0];
              console.log('初期ラスターレイヤーを表示します:', firstRasterLayer.id);
              
              if (isFeatureEnabled('rasterLayers.layerSelectionPanel')) {
                  // UIが有効な場合：チェックボックス経由で読み込み
                  setTimeout(() => {
                      const checkbox = document.getElementById(`layer-${firstRasterLayer.id}`);
                      if (checkbox) {
                          checkbox.checked = true;
                          // チェンジイベントを発火
                          const event = new Event('change');
                          checkbox.dispatchEvent(event);
                      }
                  }, 100);
              } else {
                  // UIが無効な場合：直接レイヤーを読み込む
                  console.log('レイヤー選択UIなしで初期レイヤーを読み込みます:', firstRasterLayer.id);
                  
                  // ローディングインジケータ（必要に応じて）
                  if (typeof showLoadingIndicator === 'function') {
                      showLoadingIndicator(firstRasterLayer.id);
                  }
                  
                  // レイヤーを直接読み込む
                  loadLayer(firstRasterLayer.id)
                      .then(layer => {
                          // ローディングインジケータを非表示
                          if (typeof hideLoadingIndicator === 'function') {
                              hideLoadingIndicator(firstRasterLayer.id);
                          }
                          
                          // アクティブレイヤーリストに追加
                          if (!activeLayers.includes(firstRasterLayer.id)) {
                              activeLayers.push(firstRasterLayer.id);
                          }
                          
                          // レイヤー設定UIを更新
                          updateLayerSettingsUI();
                          
                          // カラーバーを表示（必要に応じて）
                          const georaster = layer.georasters[0];
                          const colormap = AppState.colorMaps[firstRasterLayer.id] || firstRasterLayer.defaultColormap;
                          
                          // 値範囲が未設定の場合は初期化
                          if (!AppState.valueRange[firstRasterLayer.id]) {
                              AppState.valueRange[firstRasterLayer.id] = {
                                  min: georaster.mins[0],
                                  max: georaster.maxs[0]
                              };
                          }
                          
                          // カラーバーを表示
                          addColorbar(
                              AppState.valueRange[firstRasterLayer.id].min, 
                              AppState.valueRange[firstRasterLayer.id].max, 
                              firstRasterLayer.name, 
                              colormap, 
                              firstRasterLayer.id
                          );
                      })
                      .catch(error => {
                          console.error(`初期レイヤー ${firstRasterLayer.id} の読み込みに失敗しました:`, error);
                          if (typeof hideLoadingIndicator === 'function') {
                              hideLoadingIndicator(firstRasterLayer.id);
                          }
                          if (typeof showErrorMessage === 'function') {
                              showErrorMessage(`レイヤー ${firstRasterLayer.name} の読み込みに失敗しました。`);
                          }
                      });
              }
          }
          
          return config;
      })
      .catch(error => {
          console.error('レイヤー設定の読み込みに失敗しました:', error);
          alert('レイヤー設定の読み込みに失敗しました。');
      });
}

// レイヤー選択UIを構築
function buildLayerSelectionUI(layers) {
  // プロジェクト設定でラスターレイヤーが無効な場合は何もしない
  if (!isFeatureEnabled('rasterLayers.enabled') || !isFeatureEnabled('rasterLayers.layerSelectionPanel')) {
    return;
  }

  const layerList = document.getElementById('layerList');
  // ラスターレイヤーのみをフィルタリング
  const rasterLayers = layers.filter(layer => 
    layer.url && /\.(tif|tiff|png|jpg|jpeg|geotiff)$/i.test(layer.url)
  );
  console.log(rasterLayers)
  
  // 既存の内容をクリア
  layerList.innerHTML = '';
  
  // レイヤーリストを作成
  rasterLayers.forEach(layer => {
    // レイヤー選択項目を作成
    const layerItem = document.createElement('div');
    layerItem.className = 'layer-item';
    
    const checkbox = document.createElement('input');
    checkbox.type = 'checkbox';
    checkbox.id = `layer-${layer.id}`;
    checkbox.value = layer.id;
    checkbox.dataset.name = layer.name;
    checkbox.addEventListener('change', handleLayerSelection);
    
    const label = document.createElement('label');
    label.htmlFor = `layer-${layer.id}`;
    label.textContent = layer.name;
    
    layerItem.appendChild(checkbox);
    layerItem.appendChild(label);
    layerList.appendChild(layerItem);
    
    // 状態を初期化
    AppState.colorMaps[layer.id] = layer.defaultColormap;
    AppState.valueRange[layer.id] = { min: 0, max: 1 };
  });
}

// レイヤー選択の処理
function handleLayerSelection(e) {
  const layerId = e.target.value;
  const layerName = e.target.dataset.name;
  const isChecked = e.target.checked;
  
  if (isChecked) {
    // 現在選択されているレイヤー数を確認
    const currentSelectedLayers = document.querySelectorAll('#layerList input[type="checkbox"]:checked');
    
    // 最大選択数を超える場合は選択を解除
    if (currentSelectedLayers.length > AppConfig.maxSelectableLayers) {
      e.target.checked = false;
      alert(`レイヤーは最大${AppConfig.maxSelectableLayers}つまで選択できます。`);
      return;
    }
    
    // ローディングインジケータを表示
    showLoadingIndicator(layerId);
    
    // レイヤーを読み込み
    loadLayer(layerId)
      .then(layer => {
        // ローディングインジケータを非表示
        hideLoadingIndicator(layerId);
        
        // アクティブレイヤーリストに追加
        if (!activeLayers.includes(layerId)) {
          activeLayers.push(layerId);
        }
        
        // レイヤー設定UIを更新
        updateLayerSettingsUI();
        
        // レイヤー設定を取得してカラーバーを表示
        getLayerConfigById(layerId).then(layerConfig => {
          if (layerConfig) {
            const georaster = layer.georasters[0];
            
            // 値範囲が未設定の場合は初期化
            if (!AppState.valueRange[layerId]) {
              AppState.valueRange[layerId] = { 
                min: georaster.mins[0], 
                max: georaster.maxs[0] 
              };
            }
            
            const colormap = AppState.colorMaps[layerId] || layerConfig.defaultColormap;
            
            // カラーバーを表示
            addColorbar(AppState.valueRange[layerId].min, AppState.valueRange[layerId].max, layerConfig.name, colormap, layerId);
          }
        });
      })
      .catch(error => {
        // エラー時の処理
        console.error(`レイヤー ${layerId} の読み込みに失敗しました:`, error);
        
        // ローディングインジケータを非表示
        hideLoadingIndicator(layerId);
        
        // チェックボックスを元に戻す
        e.target.checked = false;
        
        // エラーメッセージを表示
        showErrorMessage(`レイヤー ${layerName} の読み込みに失敗しました。ファイルが存在するか確認してください。`);
      });
  } else {
    // レイヤーを非表示にする
    if (loadedLayers[layerId] && map.hasLayer(loadedLayers[layerId])) {
      map.removeLayer(loadedLayers[layerId]);
    }
    
    // カラーバーを削除
    removeAllColorbarsByLayerId(layerId);
    
    // アクティブレイヤーリストから削除
    const index = activeLayers.indexOf(layerId);
    if (index > -1) {
      activeLayers.splice(index, 1);
    }
    
    // レイヤー設定UIを更新
    updateLayerSettingsUI();
    
    // 残りのカラーバーの位置を更新
    updateColorbarPositions();
  }
}


// カラーバーを削除する関数
function removeColorbar(layerId) {
  const colorbar = document.getElementById(`colorbar-${layerId}`);
  if (colorbar) {
    colorbar.remove();
  }
  
  // colorbarElementsからも削除
  if (colorbarElements[layerId]) {
    delete colorbarElements[layerId];
  }
}

// レイヤー設定UIを更新
function updateLayerSettingsUI() {
  // プロジェクト設定でレイヤー設定UIが無効な場合は何もしない
  if (!isFeatureEnabled('rasterLayers.enabled') || !isFeatureEnabled('rasterLayers.layerSettingsUI')) {
    return;
  }

  // レイヤー1の設定パネル
  const layer1Settings = document.getElementById('layer1Settings');
  const layer1Name = document.getElementById('layer1Name');
  
  // レイヤー2の設定パネル
  const layer2Settings = document.getElementById('layer2Settings');
  const layer2Name = document.getElementById('layer2Name');
  
  // 両方のパネルを一旦非表示
  layer1Settings.style.display = 'none';
  layer2Settings.style.display = 'none';
  
  // アクティブなレイヤーがある場合、設定パネルを表示
  if (activeLayers.length > 0) {
    const layer1Id = activeLayers[0];
    layer1Name.textContent = document.querySelector(`#layer-${layer1Id}`).dataset.name;
    layer1Settings.style.display = 'block';
    
    // レイヤー1のスライダー設定を更新
    updateLayerSliders(layer1Id, 1);
    
    // レイヤー1のカラーマップ設定を更新
    updateLayerColormap(layer1Id, 1);
  }
  
  if (activeLayers.length > 1) {
    const layer2Id = activeLayers[1];
    layer2Name.textContent = document.querySelector(`#layer-${layer2Id}`).dataset.name;
    layer2Settings.style.display = 'block';
    
    // レイヤー2のスライダー設定を更新
    updateLayerSliders(layer2Id, 2);
    
    // レイヤー2のカラーマップ設定を更新
    updateLayerColormap(layer2Id, 2);
  }
}

// レイヤーのスライダー設定を更新
function updateLayerSliders(layerId, panelIndex) {
  const layer = loadedLayers[layerId];
  if (!layer || !layer.georasters) return;
  
  const georaster = layer.georasters[0];
  const min = georaster.mins[0];
  const max = georaster.maxs[0];
  
  // スライダー要素の取得
  const minSlider = document.getElementById(`layer${panelIndex}Min`);
  const maxSlider = document.getElementById(`layer${panelIndex}Max`);
  const minDisplay = document.getElementById(`layer${panelIndex}MinDisplay`);
  const maxDisplay = document.getElementById(`layer${panelIndex}MaxDisplay`);
  
  // スライダーの範囲を設定
  minSlider.min = min;
  minSlider.max = max;
  maxSlider.min = min;
  maxSlider.max = max;
  
  // 値範囲が未設定の場合は初期化
  if (!AppState.valueRange[layerId]) {
    // レイヤーの実際の最小値と最大値を使用
    AppState.valueRange[layerId] = { min: min, max: max };
  }
  
  // スライダーの値を設定
  minSlider.value = AppState.valueRange[layerId].min;
  maxSlider.value = AppState.valueRange[layerId].max;
  
  // 表示値を更新
  minDisplay.textContent = AppState.valueRange[layerId].min.toFixed(2);
  maxDisplay.textContent = AppState.valueRange[layerId].max.toFixed(2);
  
  // データ属性にレイヤーIDを設定
  minSlider.dataset.layerId = layerId;
  maxSlider.dataset.layerId = layerId;
}

// レイヤーのカラーマップ設定を更新
function updateLayerColormap(layerId, panelIndex) {
  // カラーマップ選択要素の取得
  const colorMapSelect = document.getElementById(`layer${panelIndex}Colormap`);
  const reverseCheckbox = document.getElementById(`layer${panelIndex}Reverse`);
  
  // レイヤー設定を取得
  getLayerConfigById(layerId).then(layerConfig => {
    if (!layerConfig) return;
    
    // カラーマップを設定
    colorMapSelect.value = AppState.colorMaps[layerId] || layerConfig.defaultColormap;
    reverseCheckbox.checked = false; // デフォルトは反転なし
    
    // データ属性にレイヤーIDを設定
    colorMapSelect.dataset.layerId = layerId;
    reverseCheckbox.dataset.layerId = layerId;
    
    // 透明度スライダーの設定
    const opacitySlider = document.getElementById(`layer${panelIndex}Opacity`);
    opacitySlider.value = loadedLayers[layerId].options.opacity;
    opacitySlider.dataset.layerId = layerId;
  });
}

// レイヤーを読み込む関数
function loadLayer(layerId) {
  // 既に読み込まれている場合はそれを使用
  if (loadedLayers[layerId]) {
    if (!map.hasLayer(loadedLayers[layerId])) {
      loadedLayers[layerId].addTo(map);
      
      // レイヤー設定を取得してカラーバーを表示
      getLayerConfigById(layerId).then(layerConfig => {
        if (layerConfig) {
          const georaster = loadedLayers[layerId].georasters[0];
          const min = georaster.mins[0];
          const max = georaster.maxs[0];
          
          // 値範囲が未設定の場合のみ初期化
          if (!AppState.valueRange[layerId]) {
            AppState.valueRange[layerId] = { min: min, max: max };
          }
          
          const colormap = AppState.colorMaps[layerId] || layerConfig.defaultColormap;
          
          // カラーバーを表示
          addColorbar(AppState.valueRange[layerId].min, AppState.valueRange[layerId].max, layerConfig.name, colormap, layerId);
        }
      });
    }
    return Promise.resolve(loadedLayers[layerId]);
  }
  
  // レイヤー設定を取得
  return fetch(AppConfig.layersConfigUrl)
    .then(response => {
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      return response.json();
    })
    .then(config => {
      const layerConfig = config.layers.find(layer => layer.id === layerId);
      if (!layerConfig) {
        throw new Error(`レイヤー ${layerId} の設定が見つかりません。`);
      }
      
      // レイヤーを読み込む
      return fetch(layerConfig.url)
        .then(response => {
          if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
          }
          return response.arrayBuffer();
        })
        .then(arrayBuffer => {
          return parseGeoraster(arrayBuffer).then(georaster => {
            const min = georaster.mins[0];
            const max = georaster.maxs[0];
            
            // 値範囲を初期化（レイヤーの実際の最小値と最大値を使用）
            if (!AppState.colorMaps[layerId]) {
              AppState.colorMaps[layerId] = layerConfig.defaultColormap;
            }
            
            // 常にレイヤーの実際の最小値と最大値を初期値として設定
            AppState.valueRange[layerId] = { min: min, max: max };
            
            // ピクセル値から色への変換関数
            const pixelValuesToColorFn = function(pixelValues) {
              const pixelValue = pixelValues[0];
              if (pixelValue === null || pixelValue === undefined || isNaN(pixelValue)) return null;
              
              // 現在の値範囲を使用
              const currentMin = AppState.valueRange[layerId].min;
              const currentMax = AppState.valueRange[layerId].max;
              const currentRange = currentMax - currentMin;
              
              // 値がカスタムレンジ内かチェック
              if (pixelValue < currentMin) {
                // 最小値未満はカラーマップの最小値側の色を使用
                const [r, g, b] = evaluate_cmap(0, AppState.colorMaps[layerId], true);
                return `rgb(${r}, ${g}, ${b})`;
              }
              if (pixelValue > currentMax) {
                // 最大値超過はカラーマップの最大値側の色を使用
                const [r, g, b] = evaluate_cmap(1, AppState.colorMaps[layerId], true);
                return `rgb(${r}, ${g}, ${b})`;
              }
              
              // カスタムレンジ内の値をスケーリング
              const scaledValue = (pixelValue - currentMin) / currentRange;
              const [r, g, b] = evaluate_cmap(scaledValue, AppState.colorMaps[layerId], true);
              return `rgb(${r}, ${g}, ${b})`;
            };
            
            const layer = new GeoRasterLayer({
              georaster: georaster,
              opacity: layerConfig.defaultOpacity,
              pixelValuesToColorFn: pixelValuesToColorFn,
              resolution: 256
            });
            
            // レイヤーをマップに追加
            layer.addTo(map);
            
            // 読み込まれたレイヤーを保存
            loadedLayers[layerId] = layer;
            AppState.layers[layerId] = layer;
            
            return layer;
          });
        });
    });
}


// ローディングインジケータを表示する関数
function showLoadingIndicator(layerId) {
  const checkbox = document.getElementById(`layer-${layerId}`);
  if (!checkbox) return;
  
  const layerItem = checkbox.closest('.layer-item');
  if (!layerItem) return;
  
  // 既存のローディングインジケータを削除
  const existingIndicator = layerItem.querySelector('.loading-indicator');
  if (existingIndicator) existingIndicator.remove();
  
  // ローディングインジケータを作成
  const loadingIndicator = document.createElement('span');
  loadingIndicator.className = 'loading-indicator';
  loadingIndicator.textContent = ' 読み込み中...';
  loadingIndicator.style.marginLeft = '5px';
  loadingIndicator.style.color = '#666';
  loadingIndicator.style.fontSize = '12px';
  
  layerItem.appendChild(loadingIndicator);
}


// ローディングインジケータを非表示にする関数
function hideLoadingIndicator(layerId) {
  const checkbox = document.getElementById(`layer-${layerId}`);
  if (!checkbox) return;
  
  const layerItem = checkbox.closest('.layer-item');
  if (!layerItem) return;
  
  // ローディングインジケータを削除
  const loadingIndicator = layerItem.querySelector('.loading-indicator');
  if (loadingIndicator) loadingIndicator.remove();
}

// エラーメッセージを表示する関数
function showErrorMessage(message) {
  // 既存のエラーメッセージを削除
  const existingError = document.getElementById('error-message');
  if (existingError) existingError.remove();
  
  // エラーメッセージ要素を作成
  const errorElement = document.createElement('div');
  errorElement.id = 'error-message';
  errorElement.className = 'error-message';
  errorElement.textContent = message;
  errorElement.style.position = 'absolute';
  errorElement.style.top = '10px';
  errorElement.style.right = '10px';
  errorElement.style.backgroundColor = '#f8d7da';
  errorElement.style.color = '#721c24';
  errorElement.style.padding = '10px 15px';
  errorElement.style.borderRadius = '4px';
  errorElement.style.boxShadow = '0 2px 5px rgba(0,0,0,0.2)';
  errorElement.style.zIndex = '2000';
  
  // 閉じるボタンを追加
  const closeButton = document.createElement('span');
  closeButton.textContent = '×';
  closeButton.style.marginLeft = '10px';
  closeButton.style.cursor = 'pointer';
  closeButton.style.fontWeight = 'bold';
  closeButton.addEventListener('click', () => errorElement.remove());
  
  errorElement.appendChild(closeButton);
  document.body.appendChild(errorElement);
  
  // 5秒後に自動的に消える
  setTimeout(() => {
    if (document.body.contains(errorElement)) {
      errorElement.remove();
    }
  }, 5000);
}

// レイヤーのスタイルを更新する関数
function updateLayerStyle(layer, colormap, reverse, minValue, maxValue, layerId) {
  if (!layer) return;
  
  // 既存のレイヤーを使用して新しいピクセル値→色の変換関数を設定
  const georaster = layer.georasters[0];
  const opacity = layer.options.opacity;
  
  // 新しいレイヤーを作成
  const newLayer = new GeoRasterLayer({
    georaster: georaster,
    opacity: opacity,
    pixelValuesToColorFn: function(pixelValues) {
      const pixelValue = pixelValues[0];
      if (pixelValue === null || pixelValue === undefined || isNaN(pixelValue)) return null;
      
      // 値がカスタムレンジ外の場合
      if (pixelValue < minValue) {
        // 最小値未満はカラーマップの最小値側の色を使用
        const [r, g, b] = reverse ? evaluate_cmap(0, colormap, false) : evaluate_cmap(0, colormap, true);
        return `rgb(${r}, ${g}, ${b})`;
      }
      if (pixelValue > maxValue) {
        // 最大値超過はカラーマップの最大値側の色を使用
        const [r, g, b] = reverse ? evaluate_cmap(1, colormap, false) : evaluate_cmap(1, colormap, true);
        return `rgb(${r}, ${g}, ${b})`;
      }
      
      // カスタムレンジ内の値をスケーリング
      const scaledPixelValue = (pixelValue - minValue) / (maxValue - minValue);
      const [r, g, b] = reverse ? evaluate_cmap(scaledPixelValue, colormap, false) : evaluate_cmap(scaledPixelValue, colormap, true);
      return `rgb(${r}, ${g}, ${b})`;
    },
    resolution: 256
  });
  
  // 新しいレイヤーをマップに追加
  newLayer.addTo(map);
  
  // 古いレイヤーを削除
  map.removeLayer(layer);
  
  // レイヤーを更新
  loadedLayers[layerId] = newLayer;
  
  // 古いカラーバーを削除してから新しいカラーバーを追加
  removeAllColorbarsByLayerId(layerId);
  
  // レイヤーがアクティブな場合のみカラーバーを更新
  if (activeLayers.includes(layerId)) {
    updateColorbar(minValue, maxValue, layerId, colormap, reverse);
  }
  
  return newLayer;
}


// 特定のレイヤーIDに関連するすべてのカラーバーを削除する関数
function removeAllColorbarsByLayerId(layerId) {
  // クラス名に基づいて要素を検索
  const colorbarElements = document.querySelectorAll(`.colorbar-${layerId}`);
  colorbarElements.forEach(element => {
    element.remove();
  });
  
  // ID属性に基づいて要素を検索
  const colorbarById = document.getElementById(`colorbar-${layerId}`);
  if (colorbarById) {
    colorbarById.remove();
  }
  
  // グローバルオブジェクトからも削除
  if (colorbarElements[layerId]) {
    delete colorbarElements[layerId];
  }
}

// レイヤーの透明度を更新する関数
function updateOpacity(e) {
  const layerId = e.target.dataset.layerId;
  const opacity = parseFloat(e.target.value);
  
  if (loadedLayers[layerId]) {
    loadedLayers[layerId].setOpacity(opacity);
  }
}

// スライダー値変更の処理
function handleSliderChange(e) {
  const layerId = e.target.dataset.layerId;
  const panelIndex = activeLayers.indexOf(layerId) + 1;
  const sliderId = e.target.id;
  const value = parseFloat(e.target.value);
  
  // 値表示を更新
  document.getElementById(`layer${panelIndex}${sliderId.includes('Min') ? 'Min' : 'Max'}Display`).textContent = value.toFixed(2);
  
  // 値範囲を更新
  if (!AppState.valueRange[layerId]) {
    AppState.valueRange[layerId] = { min: 0, max: 1 };
  }
  
  if (sliderId.includes('Min')) {
    AppState.valueRange[layerId].min = value;
  } else {
    AppState.valueRange[layerId].max = value;
  }
  
  // レイヤー更新
  const colorMapSelect = document.getElementById(`layer${panelIndex}Colormap`);
  const reverseCheckbox = document.getElementById(`layer${panelIndex}Reverse`);
  
  const selectedColorMap = colorMapSelect.value;
  const reverseColorMap = reverseCheckbox.checked;
  const minValue = AppState.valueRange[layerId].min;
  const maxValue = AppState.valueRange[layerId].max;
  
  // レイヤーがアクティブな場合のみスタイルを更新
  if (activeLayers.includes(layerId)) {
    updateLayerStyle(loadedLayers[layerId], selectedColorMap, reverseColorMap, minValue, maxValue, layerId);
  }
}

// カラーバーを追加する関数
function addColorbar(min, max, layerName, colormap, layerId) {
  // 既存のカラーバーを削除
  removeAllColorbarsByLayerId(layerId);
  
  const panelIndex = activeLayers.indexOf(layerId) + 1;
  const reverseCheckbox = document.getElementById(`layer${panelIndex}Reverse`);
  const reverse = reverseCheckbox ? reverseCheckbox.checked : false;
  
  const colorbarCanvas = document.createElement('canvas');
  colorbarCanvas.width = 140;
  colorbarCanvas.height = 20;
  const ctx = colorbarCanvas.getContext('2d');
  
  for (let i = 0; i < 140; i++) {
    const [r, g, b] = reverse ? evaluate_cmap(i / 139, colormap, false) : evaluate_cmap(i / 139, colormap, true);
    ctx.fillStyle = `rgb(${r}, ${g}, ${b})`;
    ctx.fillRect(i, 0, 1, 20);
  }
  
  // コントロールパネルの位置とサイズを取得
  const controlsElement = document.getElementById('controls');
  const controlsRect = controlsElement.getBoundingClientRect();
  
  // レイヤーの位置インデックスを決定（activeLayers配列内の位置ではなく、固定位置）
  // 常に最初のレイヤーは上、2番目のレイヤーは下に表示
  const positionIndex = activeLayers.length === 1 ? 0 : (activeLayers[0] === layerId ? 0 : 1);
  
  // カラーバーをコントロールパネルの右側に配置
  const colorbarContainer = document.createElement('div');
  colorbarContainer.className = `colorbar-${layerId}`;
  colorbarContainer.id = `colorbar-${layerId}`;
  colorbarContainer.dataset.position = positionIndex.toString(); // 位置情報を保存
  colorbarContainer.style.position = 'absolute';
  colorbarContainer.style.top = `${controlsRect.top + (positionIndex * 115)}px`; // 位置に基づいて配置
  colorbarContainer.style.left = `${controlsRect.right + 10}px`;
  colorbarContainer.style.padding = '5px';
  colorbarContainer.style.borderRadius = '5px';
  colorbarContainer.style.boxShadow = '0 0 10px rgba(0,0,0,0.1)';
  colorbarContainer.style.width = '140px';
  colorbarContainer.style.backgroundColor = 'white';
  colorbarContainer.style.zIndex = '1000';
  
  colorbarContainer.innerHTML = `
    <div style="font-weight: bold; margin-bottom: 5px;">${layerName}</div>
    <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 5px;">
      <span>${min.toFixed(2)}</span>
      <span>${max.toFixed(2)}</span>
    </div>
  `;
  
  colorbarContainer.appendChild(colorbarCanvas);
  document.body.appendChild(colorbarContainer);
  
  // カラーバー要素を保存
  colorbarElements[layerId] = colorbarContainer;
  
  // カラーバーの位置を更新
  updateColorbarPositions();
}

// カラーバーを更新する関数
function updateColorbar(min, max, layerId, colormap, reverse) {
  // 既存のカラーバーを削除
  removeAllColorbarsByLayerId(layerId);
  
  // レイヤー設定を取得
  getLayerConfigById(layerId).then(layerConfig => {
    if (!layerConfig) return;
    
    const colorbarCanvas = document.createElement('canvas');
    colorbarCanvas.width = 140;
    colorbarCanvas.height = 20;
    const ctx = colorbarCanvas.getContext('2d');
    
    for (let i = 0; i < 140; i++) {
      const [r, g, b] = reverse ? evaluate_cmap(i / 139, colormap, false) : evaluate_cmap(i / 139, colormap, true);
      ctx.fillStyle = `rgb(${r}, ${g}, ${b})`;
      ctx.fillRect(i, 0, 1, 20);
    }
    
    // コントロールパネルの位置とサイズを取得
    const controlsElement = document.getElementById('controls');
    const controlsRect = controlsElement.getBoundingClientRect();
    
    // レイヤーの位置インデックスを決定（activeLayers配列内の位置ではなく、固定位置）
    // 常に最初のレイヤーは上、2番目のレイヤーは下に表示
    const positionIndex = activeLayers.length === 1 ? 0 : (activeLayers[0] === layerId ? 0 : 1);
    
    // カラーバーをコントロールパネルの右側に配置
    const colorbarContainer = document.createElement('div');
    colorbarContainer.className = `colorbar-${layerId}`;
    colorbarContainer.id = `colorbar-${layerId}`;
    colorbarContainer.dataset.position = positionIndex.toString(); // 位置情報を保存
    colorbarContainer.style.position = 'absolute';
    colorbarContainer.style.top = `${controlsRect.top + (positionIndex * 115)}px`; // 位置に基づいて配置
    colorbarContainer.style.left = `${controlsRect.right + 10}px`;
    colorbarContainer.style.padding = '5px';
    colorbarContainer.style.borderRadius = '5px';
    colorbarContainer.style.boxShadow = '0 0 10px rgba(0,0,0,0.1)';
    colorbarContainer.style.width = '140px';
    colorbarContainer.style.backgroundColor = 'white';
    colorbarContainer.style.zIndex = '1000';
    
    colorbarContainer.innerHTML = `
      <div style="font-weight: bold; margin-bottom: 5px;">${layerConfig.name}</div>
      <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 5px;">
        <span>${min.toFixed(2)}</span>
        <span>${max.toFixed(2)}</span>
      </div>
    `;
    
    colorbarContainer.appendChild(colorbarCanvas);
    document.body.appendChild(colorbarContainer);
    
    // カラーバー要素を保存
    colorbarElements[layerId] = colorbarContainer;
    
    // カラーバーの位置を更新
    updateColorbarPositions();
  });
}


// すべてのカラーバーの位置を更新する関数
function updateColorbarPositions() {
  // コントロールパネルの位置とサイズを取得
  const controlsElement = document.getElementById('controls');
  const controlsRect = controlsElement.getBoundingClientRect();
  
  // アクティブなレイヤーごとにカラーバーの位置を更新
  activeLayers.forEach((layerId, index) => {
    const colorbar = document.getElementById(`colorbar-${layerId}`);
    if (colorbar) {
      // 位置インデックスを取得（固定位置を維持）
      const positionIndex = index; // activeLayers内の順序を使用
      
      // 位置を更新
      colorbar.style.top = `${controlsRect.top + (positionIndex * 115)}px`;
      colorbar.dataset.position = positionIndex.toString();
    }
  });
}

// レイヤー設定をIDで取得する関数
function getLayerConfigById(layerId) {
  return fetch(AppConfig.layersConfigUrl)
    .then(response => {
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      return response.json();
    })
    .then(config => {
      return config.layers.find(layer => layer.id === layerId);
    })
    .catch(error => {
      console.error(`レイヤー ${layerId} の設定取得に失敗しました:`, error);
      return null;
    });
}

// 初期化関数 - main.jsから呼び出される
function initLayers() {
  // レイヤー設定を読み込み
  loadLayerConfig();
  
  // レイヤー設定UIのイベントリスナーを設定
  document.getElementById('layer1Colormap').addEventListener('change', function(e) {
    const layerId = e.target.dataset.layerId;
    if (!layerId) return;
    
    const reverseCheckbox = document.getElementById('layer1Reverse');
    const minSlider = document.getElementById('layer1Min');
    const maxSlider = document.getElementById('layer1Max');
    
    const selectedColorMap = e.target.value;
    const reverseColorMap = reverseCheckbox.checked;
    const minValue = parseFloat(minSlider.value);
    const maxValue = parseFloat(maxSlider.value);
    
    AppState.colorMaps[layerId] = selectedColorMap;
    
    updateLayerStyle(loadedLayers[layerId], selectedColorMap, reverseColorMap, minValue, maxValue, layerId);
  });
  
  document.getElementById('layer2Colormap').addEventListener('change', function(e) {
    const layerId = e.target.dataset.layerId;
    if (!layerId) return;
    
    const reverseCheckbox = document.getElementById('layer2Reverse');
    const minSlider = document.getElementById('layer2Min');
    const maxSlider = document.getElementById('layer2Max');
    
    const selectedColorMap = e.target.value;
    const reverseColorMap = reverseCheckbox.checked;
    const minValue = parseFloat(minSlider.value);
    const maxValue = parseFloat(maxSlider.value);
    
    AppState.colorMaps[layerId] = selectedColorMap;
    
    updateLayerStyle(loadedLayers[layerId], selectedColorMap, reverseColorMap, minValue, maxValue, layerId);
  });
  
  document.getElementById('layer1Reverse').addEventListener('change', function(e) {
    const layerId = e.target.dataset.layerId;
    if (!layerId) return;
    
    const colorMapSelect = document.getElementById('layer1Colormap');
    const minSlider = document.getElementById('layer1Min');
    const maxSlider = document.getElementById('layer1Max');
    
    const selectedColorMap = colorMapSelect.value;
    const reverseColorMap = e.target.checked;
    const minValue = parseFloat(minSlider.value);
    const maxValue = parseFloat(maxSlider.value);
    
    updateLayerStyle(loadedLayers[layerId], selectedColorMap, reverseColorMap, minValue, maxValue, layerId);
  });
  
  document.getElementById('layer2Reverse').addEventListener('change', function(e) {
    const layerId = e.target.dataset.layerId;
    if (!layerId) return;
    
    const colorMapSelect = document.getElementById('layer2Colormap');
    const minSlider = document.getElementById('layer2Min');
    const maxSlider = document.getElementById('layer2Max');
    
    const selectedColorMap = colorMapSelect.value;
    const reverseColorMap = e.target.checked;
    const minValue = parseFloat(minSlider.value);
    const maxValue = parseFloat(maxSlider.value);
    
    updateLayerStyle(loadedLayers[layerId], selectedColorMap, reverseColorMap, minValue, maxValue, layerId);
  });
  
  document.getElementById('layer1Opacity').addEventListener('input', updateOpacity);
  document.getElementById('layer2Opacity').addEventListener('input', updateOpacity);
  
  document.getElementById('layer1Min').addEventListener('input', handleSliderChange);
  document.getElementById('layer1Max').addEventListener('input', handleSliderChange);
  document.getElementById('layer2Min').addEventListener('input', handleSliderChange);
  document.getElementById('layer2Max').addEventListener('input', handleSliderChange);
}