// ベクターレイヤー関連の機能

// ベクターレイヤーを管理するためのグローバル変数
let vectorLayers = {}; // 読み込まれたベクターレイヤーを保持するオブジェクト
let activeVectorLayers = []; // 現在アクティブなベクターレイヤーのIDを保持する配列
let vectorLayerConfigs = []; // 利用可能なベクターレイヤーの設定

// ベクターレイヤーの状態管理を拡張
const VectorState = {
    colorMaps: {}, // レイヤーごとのカラーマップ設定
    valueRange: {}, // レイヤーごとの値範囲設定
    propertyField: {}, // 表示するプロパティフィールド
    opacity: {}, // レイヤーごとの透明度
    propertyTypes: {}, // プロパティのデータタイプ（"numeric" または "categorical"）
    categoryColors: {}, // カテゴリごとの色マッピング
    categoryPalettes: {} // カテゴリデータ用のパレット名
};

// ベクターレイヤーのUIを初期化する関数
function initVectorLayers() {
    // プロジェクト設定でベクターレイヤーが無効な場合は何もしない
    if (!isFeatureEnabled('vectorLayers.enabled')) {
        return;
    }

    // ベクターレイヤーコントロールパネルをUIに追加
    if (isFeatureEnabled('vectorLayers.layerPanel')) {
        addVectorControlPanel();
    }
    
    // イベントリスナーのセットアップ
    setupVectorEventListeners();
    
    // data_list.jsonからベクターレイヤーを読み込む
    loadVectorLayersFromConfig();
}

// ベクターコントロールパネルをUIに追加する関数
function addVectorControlPanel() {
    console.log(`ベクターコントロールパネルをUIに追加`);
    const controlsElement = document.getElementById('controls');
    
    // ベクターコントロールセクションを作成
    const vectorControlSection = document.createElement('div');
    vectorControlSection.id = 'vectorControlSection';
    vectorControlSection.className = 'vector-control-section';
    
    // GeoJSON読み込みボタンの表示制御とプロパティ選択機能の表示制御を分離
    let htmlContent = `
        <h3>Vector layers</h3>
        <div id="vectorLayerListContainer">
            <div id="vectorLayerList" class="vector-layer-list"></div>
        </div>
    `;
    
    // GeoJSON読み込みボタンを追加（設定に基づいて）
    if (isFeatureEnabled('vectorLayers.loadGeojson')) {
        htmlContent += `
        <div class="vector-controls">
            <button id="loadGeoJSONButton" class="btn-small">GeoJSONファイルを読み込む</button>
        </div>
        `;
    }
    
    // プロパティ選択機能を追加（設定に基づいて）
    if (isFeatureEnabled('vectorLayers.propertySelection')) {
        htmlContent += `
        <div id="vectorLayerSettings" class="vector-layer-settings" style="display: none;">
            <h4 id="activeVectorLayerName">レイヤー設定</h4>
            <div class="settings-group">
                <label for="vectorPropertySelect">表示プロパティ:</label>
                <select id="vectorPropertySelect" class="colormap-select"></select>
            </div>
            <div id="numericControls" style="display: none;">
                <div class="settings-group">
                    <label for="vectorColormap">カラーマップ:</label>
                    <select id="vectorColormap" class="colormap-select"></select>
                </div>
                <div class="settings-group">
                    <label for="vectorOpacity">透明度:</label>
                    <input type="range" id="vectorOpacity" min="0" max="1" step="0.1" value="0.7" class="opacitySlider">
                </div>
                <div class="settings-group">
                    <label for="vectorReverseColormap">
                        <input type="checkbox" id="vectorReverseColormap">
                        カラーマップを反転
                    </label>
                </div>
                <div class="settings-group">
                    <label>値範囲:</label>
                    <div class="range-inputs">
                        <input type="number" id="vectorMinValue" class="vector-range-input" placeholder="最小値">
                        <input type="number" id="vectorMaxValue" class="vector-range-input" placeholder="最大値">
                    </div>
                    <button id="vectorApplyRange" class="btn-small">適用</button>
                    <button id="vectorResetRange" class="btn-small">リセット</button>
                </div>
            </div>
            <div id="categoricalControls" style="display: none;">
                <div class="settings-group">
                    <label for="vectorCategoryPalette">カラーパレット:</label>
                    <select id="vectorCategoryPalette" class="colormap-select"></select>
                </div>
                <div class="settings-group">
                    <label for="vectorCategoryOpacity">透明度:</label>
                    <input type="range" id="vectorCategoryOpacity" min="0" max="1" step="0.1" value="0.7" class="opacitySlider">
                </div>
            </div>
            <div class="settings-group">
                <button id="closeVectorSettings" class="btn-small">閉じる</button>
            </div>
        </div>
        `;
    }
    
    vectorControlSection.innerHTML = htmlContent;
    controlsElement.appendChild(vectorControlSection);
}

// ベクターレイヤーのイベントリスナーを設定する関数
function setupVectorEventListeners() {
    console.log(`ベクターレイヤーのイベントリスナーを設定`);
    // GeoJSONファイル読み込みボタンの処理（設定が有効な場合のみ）
    if (isFeatureEnabled('vectorLayers.loadGeojson')) {
        // GeoJSONファイル読み込みボタン
        document.getElementById('loadGeoJSONButton').addEventListener('click', loadGeoJSONFile);
    }
    
    // プロパティ選択関連のイベントリスナー（設定が有効な場合のみ）
    if (isFeatureEnabled('vectorLayers.propertySelection')) {
        // 値範囲適用ボタン
        document.getElementById('vectorApplyRange').addEventListener('click', applyVectorValueRange);

        // 値範囲リセットボタン
        document.getElementById('vectorResetRange').addEventListener('click', resetVectorValueRange);
    }

    // プロパティ選択変更時のイベントリスナーは updateVectorSettingsUI 内で設定
    
    // プロパティ選択関連のイベントリスナー（設定が有効な場合のみ）
    if (isFeatureEnabled('vectorLayers.propertySelection')) {
        // カラーマップ変更時
        document.getElementById('vectorColormap').addEventListener('change', changeVectorColormap);

        // 透明度変更時
        document.getElementById('vectorOpacity').addEventListener('input', changeVectorOpacity);
        
        // カラーマップ反転変更時
        document.getElementById('vectorReverseColormap').addEventListener('change', changeVectorReverse);
        
        // カテゴリーパレット選択変更時
        document.getElementById('vectorCategoryPalette').addEventListener('change', changeCategoryPalette);
        
        // カテゴリー透明度変更時
        document.getElementById('vectorCategoryOpacity').addEventListener('input', changeCategoryOpacity);
    }
}

// GeoJSONファイルを読み込む関数
function loadGeoJSONFile() {
    console.log(`GeoJSONファイルを読み込む`);
    // ファイル選択ダイアログを表示
    const fileInput = document.createElement('input');
    fileInput.type = 'file';
    fileInput.accept = '.geojson, .json';
    fileInput.style.display = 'none';
    
    fileInput.addEventListener('change', function(e) {
        const file = e.target.files[0];
        if (!file) return;
        
        const reader = new FileReader();
        reader.onload = function(e) {
            try {
                const geojsonData = JSON.parse(e.target.result);
                processGeoJSONData(file.name, geojsonData);
            } catch (error) {
                showErrorMessage('GeoJSONファイルの解析に失敗しました: ' + error.message);
            }
        };
        reader.readAsText(file);
    });
    
    document.body.appendChild(fileInput);
    fileInput.click();
    document.body.removeChild(fileInput);
}


// jsonからベクターレイヤーを読み込む関数
function loadVectorLayersFromConfig() {
    console.log(`jsonからベクターレイヤーを読み込む`);
    // jsonを取得する
    fetch(AppConfig.layersConfigUrl)
        .then(response => {
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            return response.json();
        })
        .then(config => {
            if (!config.layers) return;
            
            // ベクターレイヤーの設定を抽出
            vectorLayerConfigs = config.layers.filter(layer => layer.type === 'vector');
            
            // ベクターレイヤーリストを構築
            buildVectorLayerList(vectorLayerConfigs);
        })
        .catch(error => {
            console.error('レイヤー設定の読み込みに失敗しました:', error);
            showErrorMessage('ベクターレイヤー設定の読み込みに失敗しました。');
        });
}



// ベクターレイヤーリストを構築する関数
function buildVectorLayerList(vectorConfigs) {
    console.log(`ベクターレイヤーリストを構築`);
    const layerList = document.getElementById('vectorLayerList');
    
    // 既存の内容をクリア
    layerList.innerHTML = '';
    
    if (vectorConfigs.length === 0) {
        // ベクターレイヤーがない場合はメッセージを表示
        layerList.innerHTML = '<div class="empty-message">利用可能なベクターレイヤーはありません</div>';
        return;
    }
    
    // レイヤーリストを作成
    vectorConfigs.forEach(layer => {
        // レイヤー選択項目を作成
        const layerItem = document.createElement('div');
        layerItem.className = 'vector-layer-item';
        layerItem.dataset.layerId = layer.id;
        
        // チェックボックスを作成
        const checkbox = document.createElement('input');
        checkbox.type = 'checkbox';
        checkbox.id = `vector-layer-${layer.id}`;
        checkbox.dataset.layerId = layer.id;
        checkbox.addEventListener('change', function() {
            handleVectorLayerSelection(layer.id, this.checked);
        });
        
        // ラベルを作成
        const label = document.createElement('label');
        label.htmlFor = `vector-layer-${layer.id}`;
        label.textContent = layer.name;
        
        // 設定ボタンを作成
        const settingsBtn = document.createElement('button');
        settingsBtn.className = 'vector-settings-btn';
        settingsBtn.textContent = '設定';
        settingsBtn.addEventListener('click', function() {
            selectVectorLayer(layer.id);
        });
        
        // 要素を追加
        layerItem.appendChild(checkbox);
        layerItem.appendChild(label);
        if (isFeatureEnabled('vectorLayers.propertySelection')) {
            layerItem.appendChild(settingsBtn);
        }
        layerList.appendChild(layerItem);
    });
}



// ベクターレイヤー選択の処理
function handleVectorLayerSelection(layerId, isChecked) {
    console.log(`ベクターレイヤー選択の処理`);
    if (isChecked) {
        // ローディングインジケータを表示
        showVectorLoadingIndicator(layerId);
        
        // 設定を取得
        const layerConfig = vectorLayerConfigs.find(conf => conf.id === layerId);
        if (!layerConfig) {
            hideVectorLoadingIndicator(layerId);
            return;
        }
        
        // GeoJSONを読み込む
        loadGeoJSONFromUrl(layerConfig.url, layerConfig)
            .then(geojsonData => {
                // 設定からpropertyFieldを取得
                const propertyField = layerConfig.propertyField || findDefaultProperty(geojsonData);
                
                // GeoJSONデータを処理
                processGeoJSONData(layerConfig.name, geojsonData, layerId, propertyField, layerConfig);
                
                // ローディングインジケータを非表示
                hideVectorLoadingIndicator(layerId);
            })
            .catch(error => {
                console.error('GeoJSONの読み込みに失敗しました:', error);
                showErrorMessage(`GeoJSONレイヤー「${layerConfig.name}」の読み込みに失敗しました。`);
                
                // チェックボックスを元に戻す
                const checkbox = document.getElementById(`vector-layer-${layerId}`);
                if (checkbox) checkbox.checked = false;
                
                // ローディングインジケータを非表示
                hideVectorLoadingIndicator(layerId);
            });
    } else {
        // レイヤーを非表示にする処理
        toggleVectorLayer(layerId, false);
        
        // アクティブレイヤーリストから削除
        const index = activeVectorLayers.indexOf(layerId);
        if (index > -1) {
            activeVectorLayers.splice(index, 1);
        }
    }
}


// URLからGeoJSONを読み込む関数
function loadGeoJSONFromUrl(url, layerConfig) {
    console.log(`URLからGeoJSONを読み込む`);
    return fetch(url)
        .then(response => {
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            return response.json();
        });
}


// デフォルトのプロパティフィールドを見つける関数
function findDefaultProperty(geojsonData) {
    console.log(`デフォルトのプロパティフィールドを見つける`);
    const numericProperties = extractNumericProperties(geojsonData);
    return numericProperties.length > 0 ? numericProperties[0] : null;
}


// ベクターレイヤーのローディングインジケータを表示する関数
function showVectorLoadingIndicator(layerId) {
    console.log(`ベクターレイヤーのローディングインジケータを表示`);
    const layerItem = document.querySelector(`.vector-layer-item[data-layer-id="${layerId}"]`);
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


// ベクターレイヤーのローディングインジケータを非表示にする関数
function hideVectorLoadingIndicator(layerId) {
    console.log(`ベクターレイヤーのローディングインジケータを非表示にする`);
    const layerItem = document.querySelector(`.vector-layer-item[data-layer-id="${layerId}"]`);
    if (!layerItem) return;
    
    // ローディングインジケータを削除
    const loadingIndicator = layerItem.querySelector('.loading-indicator');
    if (loadingIndicator) loadingIndicator.remove();
}

// GeoJSONデータを処理する関数
function processGeoJSONData(fileName, geojsonData, layerId = null, propertyField = null, layerConfig = null) {
    console.log(`GeoJSONデータを処理`);
    // レイヤーIDがない場合は生成
    if (!layerId) {
        layerId = 'vector_' + fileName.replace(/\.[^/.]+$/, "").replace(/[^a-z0-9]/gi, '_').toLowerCase();
    }
    
    // データが正しいGeoJSONかチェック
    if (!geojsonData.type || !geojsonData.features) {
        showErrorMessage('無効なGeoJSONファイルです');
        return;
    }
    
    // すべてのプロパティを確認して数値型とカテゴリ型に分類
    const numericProperties = [];
    const categoricalProperties = [];
    
    // 一時的にすべてのプロパティを確認
    const allProperties = new Set();
    geojsonData.features.forEach(feature => {
        if (feature.properties) {
            Object.keys(feature.properties).forEach(prop => allProperties.add(prop));
        }
    });
    
    // 各プロパティのデータタイプを確認
    Array.from(allProperties).forEach(prop => {
        const typeInfo = detectPropertyType(geojsonData, prop);
        if (typeInfo.type === "numeric") {
            numericProperties.push(prop);
        } else {
            categoricalProperties.push(prop);
        }
    });
    
    if (numericProperties.length === 0 && categoricalProperties.length === 0) {
        showErrorMessage('表示可能なプロパティが見つかりません');
        return;
    }
    
    // デフォルトのプロパティフィールドを選択
    let defaultProperty;
    let propertyType;
    
    if (propertyField) {
        // 指定されたプロパティの型を確認
        defaultProperty = propertyField;
        const typeInfo = detectPropertyType(geojsonData, defaultProperty);
        propertyType = typeInfo.type;
    } else if (numericProperties.length > 0) {
        // 数値型プロパティを優先
        defaultProperty = numericProperties[0];
        propertyType = "numeric";
    } else {
        // 数値型がなければカテゴリプロパティを使用
        defaultProperty = categoricalProperties[0];
        propertyType = "categorical";
    }
    
    // ベクターレイヤーの状態を初期化
    VectorState.propertyField[layerId] = defaultProperty;
    VectorState.propertyTypes[layerId] = propertyType;
    
    if (propertyType === "numeric") {
        // 数値型の場合は値範囲を計算
        const valueRange = calculatePropertyRange(geojsonData, defaultProperty);
        VectorState.valueRange[layerId] = valueRange;
        VectorState.colorMaps[layerId] = layerConfig ? (layerConfig.defaultColormap || 'viridis') : 'viridis';
    } else {
        // カテゴリ型の場合はカテゴリカラーを生成
        const categories = extractCategories(geojsonData, defaultProperty);
        const categoryColors = generateCategoryColors(categories);
        VectorState.categoryColors[layerId] = categoryColors.colors;
        VectorState.categoryPalettes[layerId] = categoryColors.paletteName;
    }
    
    VectorState.opacity[layerId] = layerConfig ? (layerConfig.defaultOpacity || 0.7) : 0.7;
    
    // GeoJSONレイヤーを作成
    createVectorLayer(layerId, geojsonData, fileName);
    
    // レイヤー設定UIを更新（すべてのプロパティリストを渡す）
    updateVectorSettingsUI(layerId, fileName, numericProperties, categoricalProperties);
    
    // すでにリストにある場合は追加しない
    if (!document.querySelector(`.vector-layer-item[data-layer-id="${layerId}"]`)) {
        // ベクターレイヤーリストに追加（ファイルから読み込んだ場合）
        addVectorLayerToList(layerId, fileName);
    }
}

// 数値型プロパティを抽出する関数
function extractNumericProperties(geojsonData) {
    console.log(`数値型プロパティを抽出`);
    const numericProps = [];
    const checkedProps = {};
    
    // 最初の20フィーチャまでをチェック
    const featuresToCheck = Math.min(20, geojsonData.features.length);
    
    for (let i = 0; i < featuresToCheck; i++) {
        const feature = geojsonData.features[i];
        if (!feature.properties) continue;
        
        Object.keys(feature.properties).forEach(prop => {
            // まだチェックしていないプロパティのみ処理
            if (checkedProps[prop] === undefined) {
                const value = feature.properties[prop];
                // 数値または数値に変換可能な文字列かチェック
                if (typeof value === 'number' || (typeof value === 'string' && !isNaN(parseFloat(value)))) {
                    numericProps.push(prop);
                    checkedProps[prop] = true;
                } else {
                    checkedProps[prop] = false;
                }
            }
        });
    }
    
    return numericProps;
}


// プロパティのデータタイプを自動検出する関数
function detectPropertyType(geojsonData, propertyName) {
    console.log(`プロパティのデータタイプを自動検出`);
    // カテゴリーの種類を格納する配列
    const categories = new Set();
    // 数値データかどうかのフラグ
    let isNumeric = true;
    
    // 最初の20個（または全部）のフィーチャーをチェック
    const featuresToCheck = Math.min(20, geojsonData.features.length);
    
    for (let i = 0; i < featuresToCheck; i++) {
        const feature = geojsonData.features[i];
        if (!feature.properties || feature.properties[propertyName] === undefined) continue;
        
        const value = feature.properties[propertyName];
        
        // 数値または数値に変換可能な文字列かチェック
        if (typeof value === 'number' || (typeof value === 'string' && !isNaN(parseFloat(value)) && String(parseFloat(value)) === value)) {
            // 数値データの場合はカテゴリに追加しない
        } else {
            // 非数値データはカテゴリデータとして扱う
            categories.add(value);
            isNumeric = false;
        }
    }
    
    // 数値データの場合は "numeric" を返す
    if (isNumeric) {
        return { type: "numeric" };
    }
    
    // カテゴリデータの場合は "categorical" とカテゴリリストを返す
    return {
        type: "categorical",
        categories: Array.from(categories)
    };
}



// カテゴリーのカラーパレットを生成する関数
function generateCategoryColors(categories, paletteName = 'colorful') {
    console.log(`カテゴリーのカラーパレットを生成`);
    // 定義済みのカラーパレット（カテゴリーが12個以下の場合）
    const predefinedPalettes = {
        // カラーパレットを複数用意
        colorful: [
            "#e41a1c", "#377eb8", "#4daf4a", "#984ea3", 
            "#ff7f00", "#ffff33", "#a65628", "#f781bf", 
            "#999999", "#66c2a5", "#fc8d62", "#8da0cb"
        ],
        pastel: [
            "#8dd3c7", "#ffffb3", "#bebada", "#fb8072", 
            "#80b1d3", "#fdb462", "#b3de69", "#fccde5", 
            "#d9d9d9", "#bc80bd", "#ccebc5", "#ffed6f"
        ],
        dark: [
            "#1b9e77", "#d95f02", "#7570b3", "#e7298a", 
            "#66a61e", "#e6ab02", "#a6761d", "#666666",
            "#3288bd", "#5e4fa2", "#66c2a5", "#5ab4ac"
        ]
    };
    
    // カテゴリー数
    const count = categories.length;
    
    // カテゴリーが12個以下の場合はプリセットパレットを使用
    if (count <= 12) {
        // 指定されたパレットを選択（存在しない場合はcolorfulを使用）
        const palette = predefinedPalettes[paletteName] || predefinedPalettes.colorful;
        
        // 各カテゴリーに色を割り当て
        const colorMap = {};
        categories.forEach((category, index) => {
            colorMap[category] = palette[index % palette.length]; // インデックスが配列長を超えないように
        });
        
        return {
            type: "preset",
            colors: colorMap,
            paletteName: paletteName
        };
    } else {
        // カテゴリー数が多い場合はHSL色空間で均等に分散させる
        const colorMap = {};
        categories.forEach((category, index) => {
            // 色相を均等に分散（0-360度）
            const hue = Math.floor((index / count) * 360);
            // 彩度と明度は固定
            const saturation = 70;
            const lightness = 60;
            
            colorMap[category] = `hsl(${hue}, ${saturation}%, ${lightness}%)`;
        });
        
        return {
            type: "generated",
            colors: colorMap,
            paletteName: "auto"
        };
    }
}


// プロパティ値の範囲を計算する関数
function calculatePropertyRange(geojsonData, propertyName) {
    console.log(`プロパティ値の範囲を計算`);
    let min = Infinity;
    let max = -Infinity;
    
    geojsonData.features.forEach(feature => {
        if (feature.properties && feature.properties[propertyName] !== undefined) {
            const value = parseFloat(feature.properties[propertyName]);
            if (!isNaN(value)) {
                min = Math.min(min, value);
                max = Math.max(max, value);
            }
        }
    });
    
    // min, maxが有効な値でない場合はデフォルト値を設定
    if (!isFinite(min) || !isFinite(max)) {
        min = 0;
        max = 1;
    }
    
    // min == maxの場合、範囲を少し広げる
    if (min === max) {
        min = min - 0.1;
        max = max + 0.1;
    }
    
    return { min, max, originalMin: min, originalMax: max };
}

// ベクターレイヤーを作成する関数
async function createVectorLayer(layerId, geojsonData, layerName, configPropertyField = null) {
    console.log(`ベクターレイヤーを作成する`);
    // 既存のレイヤーがあれば削除
    if (vectorLayers[layerId] && map.hasLayer(vectorLayers[layerId])) {
        map.removeLayer(vectorLayers[layerId]);
    }
    
    // レイヤー設定を先に取得
    let layerConfig;
    try {
        layerConfig = await Utils.getLayerConfig(layerId);
    } catch (error) {
        console.error(`レイヤー設定の取得中にエラー: ${error}`);
    }
    
    // プロパティフィールドの初期設定
    let initialPropertyField = null;
    if (!VectorState.propertyField[layerId]) {
        if (configPropertyField) {
            initialPropertyField = configPropertyField;
            VectorState.propertyField[layerId] = configPropertyField;
        } else if (layerConfig && layerConfig.propertyField) {
            initialPropertyField = layerConfig.propertyField;
            VectorState.propertyField[layerId] = layerConfig.propertyField;
        }
        
        // プロパティフィールドの初期設定時にタイプを判定して必要な初期化処理を行う
        if (initialPropertyField && geojsonData && geojsonData.features && geojsonData.features.length > 0) {
            console.log(`レイヤー ${layerId} の初期プロパティフィールド ${initialPropertyField} の処理を開始`);
            
            // プロパティタイプを判定
            const typeInfo = detectPropertyType(geojsonData, initialPropertyField);
            VectorState.propertyTypes[layerId] = typeInfo.type;
            
            console.log(`プロパティタイプ: ${typeInfo.type}`);
            
            // カテゴリタイプの場合はカテゴリカラーを生成
            if (typeInfo.type === "categorical") {
                const categories = extractCategories(geojsonData, initialPropertyField);
                const categoryColors = generateCategoryColors(categories);
                VectorState.categoryColors[layerId] = categoryColors.colors;
                VectorState.categoryPalettes[layerId] = categoryColors.paletteName;
                
                console.log(`カテゴリ数: ${categories.length}`);
            } else {
                // 数値型の場合は値範囲を計算
                const valueRange = calculatePropertyRange(geojsonData, initialPropertyField);
                VectorState.valueRange[layerId] = valueRange;
                
                // デフォルトカラーマップを設定
                if (layerConfig && layerConfig.defaultColormap) {
                    VectorState.colorMaps[layerId] = layerConfig.defaultColormap;
                } else {
                    VectorState.colorMaps[layerId] = 'viridis';
                }
            }
        }
    }
    
    // スタイル関数を定義
    function style(feature) {
        const propertyName = VectorState.propertyField[layerId];
        const value = feature.properties[propertyName];
        const propertyType = VectorState.propertyTypes[layerId];
        
        // 以下は既存のコード
        if (value === undefined || value === null) {
            return {
                fillColor: '#cccccc',
                weight: 1,
                opacity: VectorState.opacity[layerId],
                color: '#666666',
                fillOpacity: 0.4
            };
        }
        
        // カテゴリーデータの場合
        if (propertyType === "categorical") {
            const colorMap = VectorState.categoryColors[layerId];
            const fillColor = colorMap && colorMap[value] ? colorMap[value] : '#cccccc';
            
            return {
                fillColor: fillColor,
                weight: 1,
                opacity: VectorState.opacity[layerId],
                color: '#666666',
                fillOpacity: 0.7 * VectorState.opacity[layerId]
            };
        } 
        // 数値データの場合
        else {
            const numValue = parseFloat(value);
            if (isNaN(numValue)) {
                return {
                    fillColor: '#cccccc',
                    weight: 1,
                    opacity: VectorState.opacity[layerId],
                    color: '#666666',
                    fillOpacity: 0.4
                };
            }
            
            const valueRange = VectorState.valueRange[layerId];
            const colorMap = VectorState.colorMaps[layerId];
            const reverse = document.getElementById('vectorReverseColormap').checked;
            
            // 値を0-1の範囲に正規化
            let normalizedValue = (numValue - valueRange.min) / (valueRange.max - valueRange.min);
            // 範囲外の値をクリップ
            normalizedValue = Math.max(0, Math.min(1, normalizedValue));
            
            // カラーマップから色を取得
            const colorPosition = reverse ? 1 - normalizedValue : normalizedValue;
            const [r, g, b] = evaluate_cmap(colorPosition, colorMap, true);
            
            return {
                fillColor: `rgb(${r}, ${g}, ${b})`,
                weight: 1,
                opacity: VectorState.opacity[layerId],
                color: '#666666',
                fillOpacity: 0.7 * VectorState.opacity[layerId]
            };
        }
    }
    
    // GeoJSONレイヤーを作成（既存のコード）
    const layer = L.geoJSON(geojsonData, {
        style: style,
        onEachFeature: function(feature, layer) {
            // 既存のコード...
            layer.on('click', function(e) {
                // クリックイベントの伝播を停止
                e.originalEvent.stopPropagation();
                
                // 既存のマーカーを削除
                if (AppState.markers.current) {
                    map.removeLayer(AppState.markers.current);
                }
                
                const lat = e.latlng.lat;
                const lng = e.latlng.lng;
                
                // マーカー情報を取得
                const markerInfo = getVectorMarkerInfo(lat, lng, feature, layerId, layerName);
                
                // マーカーを作成
                AppState.markers.current = createMarker(lat, lng);
                
                // 情報パネルを表示
                showInfoPanel(markerInfo);
                AppState.panels.isInfoOpen = true;
                AppState.panels.isRedInfoOpen = false;
                
                // ポップアップの内容を更新して緯度経度を反映
                const updatedPopupContent = createPopupContent(lat, lng, feature, layerId);
                layer.setPopupContent(updatedPopupContent);
            });
            
            // 初期ポップアップの内容を設定
            let popupContent = '<div class="vector-popup">';
            popupContent += '<div class="vector-popup-coordinates"><strong>(LAT, LON) = </strong> クリックして表示</div>';
            
            if (feature.properties) {
                const propertyName = VectorState.propertyField[layerId];
                if (feature.properties[propertyName] !== undefined) {
                    popupContent += `<div class="highlight-property"><strong>${propertyName}:</strong> ${feature.properties[propertyName]}</div>`;
                }
                
                // その他のプロパティを表示
                let count = 0;
                for (const key in feature.properties) {
                    if (key !== propertyName && count < 5) { // 表示プロパティ数を制限
                        popupContent += `<div><strong>${key}:</strong> ${feature.properties[key]}</div>`;
                        count++;
                    }
                }
            }
            popupContent += '</div>';
            // ポップアップを設定（オフセットを追加）
            layer.bindPopup(popupContent, {
                offset: L.point(0, -25)  // ポップアップを上方向にオフセット
            });
        }
    });
    
    // マップに追加
    layer.addTo(map);
    
    // レイヤーを保存
    vectorLayers[layerId] = layer;
    
    // アクティブレイヤーリストに追加
    if (!activeVectorLayers.includes(layerId)) {
        activeVectorLayers.push(layerId);
    }
    
    // カラーバーまたは凡例を追加
    const propertyType = VectorState.propertyTypes[layerId];
    console.log(`レイヤー ${layerId} の凡例作成: タイプ=${propertyType}`);
    
    if (propertyType === "categorical") {
        // カテゴリー凡例を明示的に表示
        if (VectorState.categoryColors[layerId]) {
            addCategoryLegend(layerId, layerName);
        } else {
            console.warn(`レイヤー ${layerId} のカテゴリー色情報がありません`);
        }
    } else {
        // 数値カラーバーを表示
        addVectorColorbar(layerId, layerName);
    }
    
    return layer;
}


// ポップアップの内容を更新する関数（緯度経度情報を含む）
function createPopupContent(lat, lng, feature, layerId) {
    console.log(`ポップアップの内容を更新する（緯度経度情報を含む）`);
    let popupContent = '<div class="vector-popup">';
    popupContent += `<div class="vector-popup-coordinates"><strong>(LAT, LON) = </strong> (${lat.toFixed(4)}, ${lng.toFixed(4)})</div>`;
    
    if (feature.properties) {
        const propertyName = VectorState.propertyField[layerId];
        if (feature.properties[propertyName] !== undefined) {
            popupContent += `<div class="highlight-property"><strong>${propertyName}:</strong> ${feature.properties[propertyName]}</div>`;
        }
        
        // その他のプロパティを表示
        let count = 0;
        for (const key in feature.properties) {
            if (key !== propertyName) {
                popupContent += `<div><strong>${key}:</strong> ${feature.properties[key]}</div>`;
                count++;
            }
        }
    }
    popupContent += '</div>';
    return popupContent;
}

// ベクターレイヤーをリストに追加する関数（ファイルから読み込んだ場合）
function addVectorLayerToList(layerId, layerName) {
    console.log(`ベクターレイヤーをリストに追加（ファイルから読み込んだ場合）`);
    const layerList = document.getElementById('vectorLayerList');
    
    // 「レイヤーがありません」メッセージを削除
    const emptyMessage = layerList.querySelector('.empty-message');
    if (emptyMessage) {
        emptyMessage.remove();
    }
    
    // レイヤーアイテムを作成
    const layerItem = document.createElement('div');
    layerItem.className = 'vector-layer-item';
    layerItem.dataset.layerId = layerId;
    
    // チェックボックスを作成
    const checkbox = document.createElement('input');
    checkbox.type = 'checkbox';
    checkbox.id = `vector-layer-${layerId}`;
    checkbox.checked = true;
    checkbox.addEventListener('change', function() {
        toggleVectorLayer(layerId, this.checked);
    });
    
    // ラベルを作成
    const label = document.createElement('label');
    label.htmlFor = `vector-layer-${layerId}`;
    label.textContent = layerName;
    
    if (isFeatureEnabled('vectorLayers.propertySelection')) {
        // 設定ボタンを作成
        const settingsBtn = document.createElement('button');
        settingsBtn.className = 'vector-settings-btn';
        settingsBtn.textContent = '設定';
        settingsBtn.addEventListener('click', function() {
            selectVectorLayer(layerId);
        });
    }
    
    // 削除ボタンを作成
    const deleteBtn = document.createElement('button');
    deleteBtn.className = 'vector-delete-btn';
    deleteBtn.textContent = '削除';
    deleteBtn.addEventListener('click', function() {
        removeVectorLayer(layerId);
    });
    
    // 要素を追加
    layerItem.appendChild(checkbox);
    layerItem.appendChild(label);
    if (isFeatureEnabled('vectorLayers.propertySelection')) {
        layerItem.appendChild(settingsBtn);
    }
    layerItem.appendChild(deleteBtn);
    
    layerList.appendChild(layerItem);
}

// ベクターレイヤーの設定UIを更新する関数
function updateVectorSettingsUI(layerId, layerName, numericProperties, categoricalProperties) {
    // プロジェクト設定でラスターレイヤーが無効な場合は何もしない
    if (!isFeatureEnabled('vectorLayers.enabled') || !isFeatureEnabled('vectorLayers.propertySelection')) {
        return;
    }

    console.log(`ベクターレイヤーの設定UIを更新する`);
    const settingsPanel = document.getElementById('vectorLayerSettings');
    const propertySelect = document.getElementById('vectorPropertySelect');
    
    // パネルを表示
    settingsPanel.style.display = 'block';
    
    // レイヤー名を設定
    document.getElementById('activeVectorLayerName').textContent = layerName;
    
    // プロパティ選択肢をクリア
    propertySelect.innerHTML = '';
    
    // プロパティ選択のイベントリスナーをいったん削除（再登録を防ぐため）
    propertySelect.removeEventListener('change', changeVectorProperty);
    
    // 数値プロパティをグループ化して追加
    if (numericProperties && numericProperties.length > 0) {
        const numericGroup = document.createElement('optgroup');
        numericGroup.label = '数値データ';
        
        numericProperties.forEach(prop => {
            const option = document.createElement('option');
            option.value = prop;
            option.textContent = prop;
            option.dataset.type = 'numeric';
            numericGroup.appendChild(option);
        });
        
        propertySelect.appendChild(numericGroup);
    }
    
    // カテゴリプロパティをグループ化して追加
    if (categoricalProperties && categoricalProperties.length > 0) {
        const categoricalGroup = document.createElement('optgroup');
        categoricalGroup.label = 'カテゴリーデータ';
        
        categoricalProperties.forEach(prop => {
            const option = document.createElement('option');
            option.value = prop;
            option.textContent = prop;
            option.dataset.type = 'categorical';
            categoricalGroup.appendChild(option);
        });
        
        propertySelect.appendChild(categoricalGroup);
    }
    
    // 現在選択中のプロパティを設定
    propertySelect.value = VectorState.propertyField[layerId];
    
    // プロパティ選択のイベントリスナーを再設定
    propertySelect.addEventListener('change', changeVectorProperty);
    
    // データタイプを取得
    const propertyType = VectorState.propertyTypes[layerId];
    
    // データタイプに応じてUIを切り替え
    const numericControls = document.getElementById('numericControls');
    const categoricalControls = document.getElementById('categoricalControls');
    
    if (propertyType === 'categorical') {
        console.log('カテゴリー用のUIを表示')
        // カテゴリー用のUIを表示
        numericControls.style.display = 'none';
        categoricalControls.style.display = 'block';
        
        // カテゴリーパレット選択肢を更新
        updateCategoryPaletteOptions(layerId);
        
        // カテゴリー凡例を表示
        updateCategoryLegendUI(layerId);
        
        // 透明度設定
        document.getElementById('vectorCategoryOpacity').value = VectorState.opacity[layerId];
        
    } else {
        console.log('数値用のUIを表示（従来のUI）')
        // 数値用のUIを表示（従来のUI）
        numericControls.style.display = 'block';
        categoricalControls.style.display = 'none';
        
        // 従来の数値カラーマップUI更新処理
        const colormapSelect = document.getElementById('vectorColormap');
        const opacitySlider = document.getElementById('vectorOpacity');
        const reverseCheckbox = document.getElementById('vectorReverseColormap');
        const minValueInput = document.getElementById('vectorMinValue');
        const maxValueInput = document.getElementById('vectorMaxValue');
        
        // カラーマップ選択肢をクリア
        colormapSelect.innerHTML = '';
        
        // カラーマップ選択肢を追加
        AppConfig.colorMaps.forEach(colormap => {
            const option = document.createElement('option');
            option.value = colormap;
            option.textContent = colormap;
            colormapSelect.appendChild(option);
        });
        
        // 現在選択中のカラーマップを設定
        colormapSelect.value = VectorState.colorMaps[layerId];
        
        // 透明度を設定
        opacitySlider.value = VectorState.opacity[layerId];
        
        // 反転設定を初期化
        reverseCheckbox.checked = false;
        
        // 値範囲を設定
        const valueRange = VectorState.valueRange[layerId];
        minValueInput.value = valueRange.min;
        maxValueInput.value = valueRange.max;
    }
    
    // データ属性にレイヤーIDを設定
    settingsPanel.dataset.layerId = layerId;
}



// カテゴリー凡例のUIを更新する関数
function updateCategoryLegendUI(layerId) {
    console.log(`カテゴリー凡例のUIを更新`);
    const container = document.getElementById('categoryLegendContainer');
    
    // コントロールパネル内の凡例は空にする（または非表示）
    if (container) {
        container.innerHTML = '';
        
        // 以下のコードはコメントアウトして凡例を空にする
        /*
        const colorMap = VectorState.categoryColors[layerId];
        if (!colorMap) return;
        
        // 各カテゴリーの凡例アイテムを追加
        Object.keys(colorMap).forEach(category => {
            const color = colorMap[category];
            const item = document.createElement('div');
            item.className = 'category-legend-item';
            
            item.innerHTML = `
                <span class="category-color" style="background-color: ${color};"></span>
                <span class="category-label">${category}</span>
            `;
            
            container.appendChild(item);
        });
        */
    }
}


// カテゴリーパレットのオプションを更新する関数
function updateCategoryPaletteOptions(layerId) {
    console.log(`カテゴリーパレットのオプションを更新`);
    const paletteSelect = document.getElementById('vectorCategoryPalette');
    
    // パレット選択のイベントリスナーを一旦削除
    paletteSelect.removeEventListener('change', changeCategoryPalette);
    
    // 選択肢をクリア
    paletteSelect.innerHTML = '';
    
    // レイヤーのカテゴリー数を取得
    const layerItem = document.querySelector(`.vector-layer-item[data-layer-id="${layerId}"]`);
    const categories = Object.keys(VectorState.categoryColors[layerId] || {});
    const categoryCount = categories.length;
    
    // カテゴリー数が12を超える場合はプルダウンを無効化
    if (categoryCount > 12) {
        // 自動生成の選択肢のみ追加
        const option = document.createElement('option');
        option.value = 'auto';
        option.textContent = '自動生成 (HSL)';
        paletteSelect.appendChild(option);
        
        // プルダウンを無効化
        paletteSelect.disabled = true;
        paletteSelect.title = 'カテゴリー数が12を超えるため、自動生成パレットのみ使用できます';
    } else {
        // カテゴリー数が12以下の場合は通常どおり選択肢を表示
        paletteSelect.disabled = false;
        paletteSelect.title = '';
        
        // 定義済みパレットのオプションを追加
        const palettes = ['colorful', 'pastel', 'dark'];
        palettes.forEach(palette => {
            const option = document.createElement('option');
            option.value = palette;
            option.textContent = palette;
            paletteSelect.appendChild(option);
        });
    }
    
    // 現在のパレットを選択
    const currentPalette = VectorState.categoryPalettes[layerId] || 'colorful';
    // カテゴリー数が多い場合は「auto」を選択
    paletteSelect.value = categoryCount > 12 ? 'auto' : currentPalette;
    
    // パレット選択のイベントリスナーを設定
    paletteSelect.addEventListener('change', changeCategoryPalette);
}


// ベクターデータの数値型カラーバーを追加する関数
function addVectorColorbar(layerId, layerName) {
    console.log(`ベクターデータの数値型カラーバーを追加`);
    // 既存のカラーバーを削除
    removeVectorColorbar(layerId);
    
    const propertyName = VectorState.propertyField[layerId];
    const valueRange = VectorState.valueRange[layerId];
    const colorMap = VectorState.colorMaps[layerId];
    const reverse = document.getElementById('vectorReverseColormap').checked;
    
    // カラーバーのキャンバスを作成
    const colorbarCanvas = document.createElement('canvas');
    colorbarCanvas.width = 200;
    colorbarCanvas.height = 20;
    
    // キャンバスにカラーマップを描画
    const ctx = colorbarCanvas.getContext('2d');
    for (let i = 0; i < 200; i++) {
        const position = i / 199;
        const colorPosition = reverse ? 1 - position : position;
        const [r, g, b] = evaluate_cmap(colorPosition, colorMap, true);
        ctx.fillStyle = `rgb(${r}, ${g}, ${b})`;
        ctx.fillRect(i, 0, 1, 20);
    }
    
    // カラーバーコンテナを作成
    const colorbarContainer = document.createElement('div');
    colorbarContainer.className = 'vector-colorbar numeric-colorbar';
    colorbarContainer.id = `vector-colorbar-${layerId}`;
    colorbarContainer.dataset.type = 'numeric'; // データタイプを明示的に設定
    
    // コンテンツを設定
    colorbarContainer.innerHTML = `
        <div class="vector-colorbar-header">
            <span>${layerName} - ${propertyName}</span>
        </div>
        <div class="vector-colorbar-canvas-container"></div>
        <div class="vector-colorbar-labels">
            <span>${valueRange.min.toFixed(2)}</span>
            <span>${valueRange.max.toFixed(2)}</span>
        </div>
    `;
    
    // カラーバーを挿入
    const canvasContainer = colorbarContainer.querySelector('.vector-colorbar-canvas-container');
    canvasContainer.appendChild(colorbarCanvas);

    
    // カラーバーのスタイルを設定
    colorbarContainer.style.position = 'absolute';
    colorbarContainer.style.bottom = '10px';
    colorbarContainer.style.right = '10px';
    colorbarContainer.style.backgroundColor = 'white';
    colorbarContainer.style.padding = '10px';
    colorbarContainer.style.borderRadius = '5px';
    colorbarContainer.style.boxShadow = '0 0 10px rgba(0,0,0,0.2)';
    colorbarContainer.style.zIndex = '1000';
    colorbarContainer.style.width = '220px';
    
    // ドキュメントに追加
    document.body.appendChild(colorbarContainer);
    
    // すべてのカラーバーの位置を更新
    updateAllColorbarPositions();
}


// カテゴリーデータ用の凡例を追加する関数
function addCategoryLegend(layerId, layerName) {
    console.log(`カテゴリーデータ用の凡例を追加する`);
    // 既存の凡例を削除
    removeVectorColorbar(layerId);
    
    const propertyName = VectorState.propertyField[layerId];
    const colorMap = VectorState.categoryColors[layerId];
    
    if (!colorMap) return;
    
    // カテゴリーとその色のペアを取得
    let categories = Object.keys(colorMap);
    
    // カテゴリーをアルファベット順にソート
    categories = categories.sort();
    
    // 凡例コンテナを作成
    const legendContainer = document.createElement('div');
    legendContainer.className = 'vector-colorbar category-legend';
    legendContainer.id = `vector-colorbar-${layerId}`;
    legendContainer.dataset.type = 'categorical'; // データタイプを明示的に設定
    
    // ヘッダーを追加
    legendContainer.innerHTML = `
        <div class="vector-colorbar-header">
            <span>${layerName} - ${propertyName}</span>
        </div>
        <div class="category-legend-title"></div>
        <div class="category-legend-items"></div>
    `;
    
    // 各カテゴリーの凡例アイテムを追加
    const legendItems = legendContainer.querySelector('.category-legend-items');
    
    categories.forEach(category => {
        const color = colorMap[category];
        const item = document.createElement('div');
        item.className = 'category-legend-item';
        
        item.innerHTML = `
            <div class="category-color-container">
                <span class="category-color" style="background-color: ${color};"></span>
            </div>
            <span class="category-label">${category}</span>
        `;
        
        legendItems.appendChild(item);
    });
    
    
    // 凡例のスタイルを直接設定
    legendContainer.style.position = 'absolute';
    legendContainer.style.bottom = '10px';
    legendContainer.style.right = '10px';
    legendContainer.style.backgroundColor = 'white';
    legendContainer.style.padding = '10px';
    legendContainer.style.borderRadius = '5px';
    legendContainer.style.boxShadow = '0 0 10px rgba(0,0,0,0.2)';
    legendContainer.style.zIndex = '1000';
    legendContainer.style.width = '250px';
    legendContainer.style.maxHeight = '300px';
    legendContainer.style.overflowY = 'auto';
    
    // ドキュメントに追加
    document.body.appendChild(legendContainer);
    
    // すべての凡例の位置を更新
    updateAllColorbarPositions();
}


// すべてのカラーバーと凡例の位置を更新する関数
function updateAllColorbarPositions() {
    console.log(`すべてのカラーバーと凡例の位置を更新`);
    // 表示されているすべてのカラーバーと凡例を取得
    const colorbars = document.querySelectorAll('.vector-colorbar');
    const visibleColorbars = Array.from(colorbars).filter(
        colorbar => colorbar.style.display !== 'none'
    );
    
    // 詳細パネルの表示状態を確認
    const isInfoPanelOpen = AppState.panels.isInfoOpen || AppState.panels.isRedInfoOpen;
    
    // 詳細パネルの要素とその位置情報を取得
    const infoPanel = document.getElementById('infoPanel');
    let infoPanelWidth = 0;
    
    if (isInfoPanelOpen && infoPanel && infoPanel.style.display !== 'none') {
        const infoPanelRect = infoPanel.getBoundingClientRect();
        infoPanelWidth = infoPanelRect.width;
    }
    
    // カラーバーごとに位置を計算して設定
    let yOffset = 10; // 初期位置（下からの距離）
    
    // 下から順番に配置
    visibleColorbars.forEach((colorbar) => {
        const height = colorbar.offsetHeight;
        colorbar.style.bottom = `${yOffset}px`;
        
        if (isInfoPanelOpen) {
            // 詳細パネルが開いているときは左側に移動
            const rightOffset = infoPanelWidth + 20; // パネル幅 + マージン
            colorbar.style.right = `${rightOffset}px`;
        } else {
            // 詳細パネルが閉じているときは右下に配置
            colorbar.style.right = '10px';
        }
        
        // 次の要素のためにオフセットを更新（マージンを含む）
        yOffset += height + 10;
        
        // スタイルを整える
        colorbar.style.backgroundColor = 'white';
        colorbar.style.padding = '5px';
        colorbar.style.borderRadius = '5px';
        colorbar.style.boxShadow = '0 0 10px rgba(0,0,0,0.1)';
        colorbar.style.zIndex = '1000';
        colorbar.style.width = '220px';
        
        // スムーズな移動のためのトランジション
        colorbar.style.transition = 'right 0.3s ease-in-out';
    });
    
    // console.log(`凡例位置更新: 情報パネル表示=${isInfoPanelOpen}, パネル幅=${infoPanelWidth}px`);
}

// ベクターレイヤーのカラーバーを削除する関数
function removeVectorColorbar(layerId) {
    const colorbar = document.getElementById(`vector-colorbar-${layerId}`);
    if (colorbar) {
        colorbar.remove();
        // カラーバーを削除した後、残りのカラーバーの位置を更新
        updateAllColorbarPositions();
    }
}


// 詳細パネルが開いているときは左下にカラーバー配置
function adjustVectorLegendPosition(isInfoPanelOpen) {
    console.log(`詳細パネルが開いているときは左下にカラーバー配置`);
    // 表示されているすべてのカラーバーと凡例を取得
    const colorbars = document.querySelectorAll('.vector-colorbar');
    const visibleColorbars = Array.from(colorbars).filter(
        colorbar => colorbar.style.display !== 'none'
    );
    
    // 詳細パネルのサイズと位置を取得
    const infoPanel = document.getElementById('infoPanel');
    const infoPanelRect = infoPanel.getBoundingClientRect();
    
    // カラーバーごとに位置を計算して設定
    visibleColorbars.forEach((colorbar, index) => {
        // スタイル設定
        colorbar.style.position = 'absolute';
        
        if (isInfoPanelOpen) {
            // 詳細パネルが開いているときは左下に配置
            colorbar.style.bottom = `${10 + (index * 85)}px`;
            colorbar.style.right = `${infoPanelRect.width + 20}px`; // パネルの幅 + マージン
            colorbar.style.left = 'auto';
        } else {
            // 詳細パネルが閉じているときは右下に配置
            colorbar.style.bottom = `${10 + (index * 85)}px`;
            colorbar.style.right = '10px';
            colorbar.style.left = 'auto';
        }
        
        colorbar.style.backgroundColor = 'white';
        colorbar.style.padding = '5px';
        colorbar.style.borderRadius = '5px';
        colorbar.style.boxShadow = '0 0 10px rgba(0,0,0,0.1)';
        colorbar.style.zIndex = '1000';
        colorbar.style.width = '220px'; // 幅を固定
        
        // スムーズなアニメーション効果
        colorbar.style.transition = 'all 0.3s ease-in-out';
    });
}


// ベクターレイヤーを選択する関数
function selectVectorLayer(layerId) {
    console.log(`ベクターレイヤーを選択する`);
    // レイヤーを取得
    const layer = vectorLayers[layerId];
    if (!layer) return;
    
    // レイヤー名を取得
    const layerItem = document.querySelector(`.vector-layer-item[data-layer-id="${layerId}"]`);
    const layerName = layerItem.querySelector('label').textContent;
    
    // GeoJSONデータを取得
    const geojsonData = layer.toGeoJSON();
    
    // 数値型プロパティとカテゴリプロパティを抽出
    const numericProperties = [];
    const categoricalProperties = [];
    
    // 一時的にすべてのプロパティを確認
    const allProperties = new Set();
    geojsonData.features.forEach(feature => {
        if (feature.properties) {
            Object.keys(feature.properties).forEach(prop => allProperties.add(prop));
        }
    });
    
    // 各プロパティのデータタイプを確認
    Array.from(allProperties).forEach(prop => {
        const typeInfo = detectPropertyType(geojsonData, prop);
        if (typeInfo.type === "numeric") {
            numericProperties.push(prop);
        } else {
            categoricalProperties.push(prop);
        }
    });
    
    // 設定UIを更新
    updateVectorSettingsUI(layerId, layerName, numericProperties, categoricalProperties);
}


// ベクターレイヤーの表示/非表示を切り替える関数
function toggleVectorLayer(layerId, visible) {
    console.log(`ベクターレイヤーの表示/非表示を切り替える`);
    const layer = vectorLayers[layerId];
    if (!layer) return;
    
    if (visible) {
        if (!map.hasLayer(layer)) {
            layer.addTo(map);
        }
        
        // カラーバーを表示
        const colorbar = document.getElementById(`vector-colorbar-${layerId}`);
        if (colorbar) {
            colorbar.style.display = 'block';
        } else {
            // レイヤー名を取得
            const layerItem = document.querySelector(`.vector-layer-item[data-layer-id="${layerId}"]`);
            const layerName = layerItem.querySelector('label').textContent;
            addVectorColorbar(layerId, layerName);
        }
        
        // カラーバーの位置を更新
        updateAllColorbarPositions();
    } else {
        if (map.hasLayer(layer)) {
            map.removeLayer(layer);
        }
        
        // カラーバーを非表示
        const colorbar = document.getElementById(`vector-colorbar-${layerId}`);
        if (colorbar) {
            colorbar.style.display = 'none';
            // カラーバーを非表示にした後、残りのカラーバーの位置を更新
            updateAllColorbarPositions();
        }
    }
}

// ベクターレイヤーを削除する関数
function removeVectorLayer(layerId) {
    console.log(`ベクターレイヤーを削除する`);
    // 確認ダイアログを表示
    if (!confirm('このレイヤーを削除してもよろしいですか？')) {
        return;
    }
    
    // マップからレイヤーを削除
    const layer = vectorLayers[layerId];
    if (layer && map.hasLayer(layer)) {
        map.removeLayer(layer);
    }
    
    // レイヤーリストから削除
    const layerItem = document.querySelector(`.vector-layer-item[data-layer-id="${layerId}"]`);
    if (layerItem) {
        layerItem.remove();
    }
    
    // カラーバーを削除
    removeVectorColorbar(layerId);
    
    // レイヤー管理オブジェクトから削除
    delete vectorLayers[layerId];
    delete VectorState.propertyField[layerId];
    delete VectorState.valueRange[layerId];
    delete VectorState.colorMaps[layerId];
    delete VectorState.opacity[layerId];
    
    // アクティブレイヤーリストから削除
    const index = activeVectorLayers.indexOf(layerId);
    if (index > -1) {
        activeVectorLayers.splice(index, 1);
    }
    
    // レイヤーリストが空なら「レイヤーがありません」メッセージを表示
    const layerList = document.getElementById('vectorLayerList');
    if (layerList.children.length === 0) {
        layerList.innerHTML = '';
    }
    
    // 設定パネルを非表示
    const settingsPanel = document.getElementById('vectorLayerSettings');
    if (settingsPanel.dataset.layerId === layerId) {
        settingsPanel.style.display = 'none';
    }
}



// プロパティ変更時の処理
function changeVectorProperty() {
    console.log(`プロパティ変更時の処理`);
    const settingsPanel = document.getElementById('vectorLayerSettings');
    const layerId = settingsPanel.dataset.layerId;
    if (!layerId || !vectorLayers[layerId]) return;
    
    const propertyName = this.value;
    // プロパティ選択オプションから選択されたオプションを見つける
    const selectedOption = Array.from(this.options).find(opt => opt.value === propertyName);
    if (!selectedOption) return;
    
    const propertyType = selectedOption.dataset.type;
    console.log(`プロパティ変更: ${propertyName} (タイプ: ${propertyType})`);
    
    // 状態を更新
    VectorState.propertyField[layerId] = propertyName;
    VectorState.propertyTypes[layerId] = propertyType;
    
    // GeoJSONデータを取得
    const geojsonData = vectorLayers[layerId].toGeoJSON();
    
    // レイヤー名を取得
    const layerItem = document.querySelector(`.vector-layer-item[data-layer-id="${layerId}"]`);
    const layerName = layerItem.querySelector('label').textContent;
    
    // 既存の凡例をクリア
    removeVectorColorbar(layerId);
    
    // データタイプによって処理を分岐
    if (propertyType === 'categorical') {
        // カテゴリーデータの場合
        // GeoJSONからカテゴリを抽出
        const categories = extractCategories(geojsonData, propertyName);
        
        // カテゴリごとに色を生成
        const categoryColors = generateCategoryColors(categories);
        VectorState.categoryColors[layerId] = categoryColors.colors;
        VectorState.categoryPalettes[layerId] = categoryColors.paletteName;
        
        // UI要素の表示切り替え
        document.getElementById('numericControls').style.display = 'none';
        document.getElementById('categoricalControls').style.display = 'block';
        
        // カテゴリーパレット選択肢を更新
        updateCategoryPaletteOptions(layerId);
        
        // カテゴリー凡例UIを更新
        updateCategoryLegendUI(layerId);
        
        // レイヤーのスタイルを更新
        updateVectorLayerStyle(layerId);
        
        // カテゴリー凡例を表示
        addCategoryLegend(layerId, layerName);
    } else {
        // 数値データの場合
        const valueRange = calculatePropertyRange(geojsonData, propertyName);
        VectorState.valueRange[layerId] = valueRange;
        
        // UI要素の表示切り替え
        document.getElementById('numericControls').style.display = 'block';
        document.getElementById('categoricalControls').style.display = 'none';
        
        // 値範囲入力を更新
        document.getElementById('vectorMinValue').value = valueRange.min;
        document.getElementById('vectorMaxValue').value = valueRange.max;
        
        // カラーマップ選択を同期的に初期化
        const colormapSelect = document.getElementById('vectorColormap');
        
        // カラーマップ選択肢をクリア
        colormapSelect.innerHTML = '';
        
        // カラーマップ選択肢を追加
        AppConfig.colorMaps.forEach(colormap => {
            const option = document.createElement('option');
            option.value = colormap;
            option.textContent = colormap;
            colormapSelect.appendChild(option);
        });
        
        // defaultColormapを取得して設定
        (async function() {
            try {
                const layerConfig = await Utils.getLayerConfig(layerId);
                if (layerConfig && layerConfig.defaultColormap) {
                    // まだカラーマップが設定されていない場合のみ設定
                    if (!VectorState.colorMaps[layerId]) {
                        VectorState.colorMaps[layerId] = layerConfig.defaultColormap;
                    }
                } else if (!VectorState.colorMaps[layerId]) {
                    VectorState.colorMaps[layerId] = 'viridis';
                }
                
                // 現在のカラーマップを選択
                colormapSelect.value = VectorState.colorMaps[layerId];
                
                // レイヤーのスタイルを更新
                updateVectorLayerStyle(layerId);
                
                // 数値カラーバーを表示
                addVectorColorbar(layerId, layerName);
            } catch (error) {
                console.error(`カラーマップ設定中にエラー: ${error}`);
                VectorState.colorMaps[layerId] = 'viridis';
                colormapSelect.value = 'viridis';
                
                // エラーが発生しても最低限の処理を実行
                updateVectorLayerStyle(layerId);
                addVectorColorbar(layerId, layerName);
            }
        })();
    }
    
    // 凡例位置を明示的に更新（情報パネルの状態を考慮）
    updateAllColorbarPositions();
}


// レイヤー名をIDから取得する補助関数
function getLayerNameById(layerId) {
    const layerItem = document.querySelector(`.vector-layer-item[data-layer-id="${layerId}"]`);
    return layerItem ? layerItem.querySelector('label').textContent : layerId;
}


// カテゴリーを抽出する関数
function extractCategories(geojsonData, propertyName) {
    console.log(`カテゴリーを抽出する`);
    const categories = new Set();
    
    geojsonData.features.forEach(feature => {
        if (feature.properties && feature.properties[propertyName] !== undefined) {
            categories.add(feature.properties[propertyName]);
        }
    });
    
    return Array.from(categories);
}


// カテゴリーパレット変更時の処理
function changeCategoryPalette() {
    console.log(`カテゴリーパレット変更時の処理`);
    const settingsPanel = document.getElementById('vectorLayerSettings');
    const layerId = settingsPanel.dataset.layerId;
    if (!layerId || !vectorLayers[layerId]) return;
    
    const paletteName = this.value;
    VectorState.categoryPalettes[layerId] = paletteName;
    
    // GeoJSONからカテゴリを再抽出
    const propertyName = VectorState.propertyField[layerId];
    const geojsonData = vectorLayers[layerId].toGeoJSON();
    const categories = extractCategories(geojsonData, propertyName);
    
    // 選択されたパレットで色を再生成
    const categoryColors = generateCategoryColors(categories, paletteName);
    VectorState.categoryColors[layerId] = categoryColors.colors;
    
    // カテゴリー凡例UI更新
    updateCategoryLegendUI(layerId);
    
    // レイヤーのスタイルを更新
    updateVectorLayerStyle(layerId);
    
    // カテゴリー凡例を更新
    const layerItem = document.querySelector(`.vector-layer-item[data-layer-id="${layerId}"]`);
    const layerName = layerItem.querySelector('label').textContent;
    addCategoryLegend(layerId, layerName);
    
    // ログを追加（デバッグ用）
    // console.log(`カラーパレットを変更しました: ${layerId}, ${paletteName}`);
}



// カラーマップ変更時の処理
function changeVectorColormap() {
    const settingsPanel = document.getElementById('vectorLayerSettings');
    const layerId = settingsPanel.dataset.layerId;
    if (!layerId || !vectorLayers[layerId]) return;
    
    VectorState.colorMaps[layerId] = this.value;
    
    // レイヤースタイルを更新
    updateVectorLayerStyle(layerId);
    
    // カラーバーを更新
    const layerItem = document.querySelector(`.vector-layer-item[data-layer-id="${layerId}"]`);
    const layerName = layerItem.querySelector('label').textContent;
    addVectorColorbar(layerId, layerName);
}

// 透明度変更時の処理
function changeVectorOpacity() {
    const settingsPanel = document.getElementById('vectorLayerSettings');
    const layerId = settingsPanel.dataset.layerId;
    if (!layerId || !vectorLayers[layerId]) return;
    
    VectorState.opacity[layerId] = parseFloat(this.value);
    
    // レイヤースタイルを更新
    updateVectorLayerStyle(layerId);
}


// カテゴリデータの透明度変更時の処理
function changeCategoryOpacity() {
    const settingsPanel = document.getElementById('vectorLayerSettings');
    const layerId = settingsPanel.dataset.layerId;
    if (!layerId || !vectorLayers[layerId]) return;
    
    VectorState.opacity[layerId] = parseFloat(this.value);
    
    // レイヤースタイルを更新
    updateVectorLayerStyle(layerId);
}


// カラーマップ反転変更時の処理
function changeVectorReverse() {
    const settingsPanel = document.getElementById('vectorLayerSettings');
    const layerId = settingsPanel.dataset.layerId;
    if (!layerId || !vectorLayers[layerId]) return;
    
    // レイヤースタイルを更新
    updateVectorLayerStyle(layerId);
    
    // カラーバーを更新
    const layerItem = document.querySelector(`.vector-layer-item[data-layer-id="${layerId}"]`);
    const layerName = layerItem.querySelector('label').textContent;
    addVectorColorbar(layerId, layerName);
}


// カテゴリーパレット変更時の処理
function changeCategoryPalette() {
    const settingsPanel = document.getElementById('vectorLayerSettings');
    const layerId = settingsPanel.dataset.layerId;
    if (!layerId || !vectorLayers[layerId]) return;
    
    const paletteName = this.value;
    VectorState.categoryPalettes[layerId] = paletteName;
    
    // GeoJSONからカテゴリを再抽出
    const propertyName = VectorState.propertyField[layerId];
    const geojsonData = vectorLayers[layerId].toGeoJSON();
    const categories = extractCategories(geojsonData, propertyName);
    
    // 選択されたパレットで色を再生成
    const categoryColors = generateCategoryColors(categories, paletteName);
    VectorState.categoryColors[layerId] = categoryColors.colors;
    
    // カテゴリー凡例UI更新
    updateCategoryLegendUI(layerId);
    
    // レイヤーのスタイルを更新
    updateVectorLayerStyle(layerId);
    
    // カテゴリー凡例を更新
    const layerItem = document.querySelector(`.vector-layer-item[data-layer-id="${layerId}"]`);
    const layerName = layerItem.querySelector('label').textContent;
    addCategoryLegend(layerId, layerName);
}

// カテゴリデータの透明度変更時の処理
function changeCategoryOpacity() {
    const settingsPanel = document.getElementById('vectorLayerSettings');
    const layerId = settingsPanel.dataset.layerId;
    if (!layerId || !vectorLayers[layerId]) return;
    
    VectorState.opacity[layerId] = parseFloat(this.value);
    
    // レイヤースタイルを更新
    updateVectorLayerStyle(layerId);
}


// 値範囲適用時の処理
function applyVectorValueRange() {
    const settingsPanel = document.getElementById('vectorLayerSettings');
    const layerId = settingsPanel.dataset.layerId;
    if (!layerId || !vectorLayers[layerId]) return;
    
    const minValue = parseFloat(document.getElementById('vectorMinValue').value);
    const maxValue = parseFloat(document.getElementById('vectorMaxValue').value);
    
    if (isNaN(minValue) || isNaN(maxValue)) {
        showErrorMessage('最小値と最大値は数値で入力してください');
        return;
    }
    
    if (minValue >= maxValue) {
        showErrorMessage('最小値は最大値より小さくしてください');
        return;
    }
    
    // 値範囲を更新
    VectorState.valueRange[layerId].min = minValue;
    VectorState.valueRange[layerId].max = maxValue;
    
    // レイヤースタイルを更新
    updateVectorLayerStyle(layerId);
    
    // カラーバーを更新
    const layerItem = document.querySelector(`.vector-layer-item[data-layer-id="${layerId}"]`);
    const layerName = layerItem.querySelector('label').textContent;
    addVectorColorbar(layerId, layerName);
}

// 値範囲リセット時の処理
function resetVectorValueRange() {
    const settingsPanel = document.getElementById('vectorLayerSettings');
    const layerId = settingsPanel.dataset.layerId;
    if (!layerId || !vectorLayers[layerId]) return;
    
    // 元の値範囲に戻す
    const originalMin = VectorState.valueRange[layerId].originalMin;
    const originalMax = VectorState.valueRange[layerId].originalMax;
    
    // 値範囲を更新
    VectorState.valueRange[layerId].min = originalMin;
    VectorState.valueRange[layerId].max = originalMax;
    
    // 入力値を更新
    document.getElementById('vectorMinValue').value = originalMin;
    document.getElementById('vectorMaxValue').value = originalMax;
    
    // レイヤースタイルを更新
    updateVectorLayerStyle(layerId);
    
    // カラーバーを更新
    const layerItem = document.querySelector(`.vector-layer-item[data-layer-id="${layerId}"]`);
    const layerName = layerItem.querySelector('label').textContent;
    addVectorColorbar(layerId, layerName);
}


// レイヤースタイルを更新する関数
function updateVectorLayerStyle(layerId) {
    const layer = vectorLayers[layerId];
    if (!layer) return;
    
    layer.setStyle(function(feature) {
        const propertyName = VectorState.propertyField[layerId];
        const value = feature.properties[propertyName];
        const propertyType = VectorState.propertyTypes[layerId];
        
        if (value === undefined || value === null) {
            return {
                fillColor: '#cccccc',
                weight: 1,
                opacity: VectorState.opacity[layerId],
                color: '#666666',
                fillOpacity: 0.4
            };
        }
        
        // カテゴリーデータの場合
        if (propertyType === "categorical") {
            const colorMap = VectorState.categoryColors[layerId];
            const fillColor = colorMap && colorMap[value] ? colorMap[value] : '#cccccc';
            
            return {
                fillColor: fillColor,
                weight: 1,
                opacity: VectorState.opacity[layerId],
                color: '#666666',
                fillOpacity: 0.7 * VectorState.opacity[layerId]
            };
        } 
        // 数値データの場合
        else {
            const numValue = parseFloat(value);
            if (isNaN(numValue)) {
                return {
                    fillColor: '#cccccc',
                    weight: 1,
                    opacity: VectorState.opacity[layerId],
                    color: '#666666',
                    fillOpacity: 0.4
                };
            }
            
            const valueRange = VectorState.valueRange[layerId];
            const colorMap = VectorState.colorMaps[layerId];
            const reverse = document.getElementById('vectorReverseColormap').checked;
            
            // 値を0-1の範囲に正規化
            let normalizedValue = (numValue - valueRange.min) / (valueRange.max - valueRange.min);
            // 範囲外の値をクリップ
            normalizedValue = Math.max(0, Math.min(1, normalizedValue));
            
            // カラーマップから色を取得
            const colorPosition = reverse ? 1 - normalizedValue : normalizedValue;
            const [r, g, b] = evaluate_cmap(colorPosition, colorMap, true);
            
            return {
                fillColor: `rgb(${r}, ${g}, ${b})`,
                weight: 1,
                opacity: VectorState.opacity[layerId],
                color: '#666666',
                fillOpacity: 0.7 * VectorState.opacity[layerId]
            };
        }
    });
}


// すべてのベクターレイヤーとUIをリセットする関数
function resetVectorLayers() {
    // すべてのアクティブなベクターレイヤーを削除
    activeVectorLayers.forEach(layerId => {
        const layer = vectorLayers[layerId];
        if (layer && map.hasLayer(layer)) {
            map.removeLayer(layer);
        }
    });
    
    // ベクターレイヤーリストをクリア
    const layerList = document.getElementById('vectorLayerList');
    if (layerList) {
        layerList.innerHTML = '<div class="empty-message">GeoJSONファイルを読み込んでください</div>';
    }
    
    // ベクターレイヤー設定パネルを非表示
    const settingsPanel = document.getElementById('vectorLayerSettings');
    if (settingsPanel) {
        settingsPanel.style.display = 'none';
    }
    
    // すべてのカラーバーを削除
    document.querySelectorAll('.vector-colorbar').forEach(element => {
        element.remove();
    });
    
    // グローバル変数をリセット
    vectorLayers = {};
    activeVectorLayers = [];
    VectorState.colorMaps = {};
    VectorState.valueRange = {};
    VectorState.propertyField = {};
    VectorState.opacity = {};
    
    // data_list.jsonからベクターレイヤーを再読み込み
    loadVectorLayersFromConfig();
}

// エラーメッセージを表示する関数
function showErrorMessage(message) {
    // 既存のエラーメッセージを削除
    const existingError = document.getElementById('error-message');
    if (existingError) {
        existingError.remove();
    }
    
    // エラーメッセージ要素を作成
    const errorElement = document.createElement('div');
    errorElement.id = 'error-message';
    errorElement.className = 'error-message';
    errorElement.textContent = message;
    
    // 閉じるボタン
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



// ベクターデータのマーカー情報を取得する関数
function getVectorMarkerInfo(lat, lon, feature, layerId, layerName) {
    console.log('getVectorMarkerInfo呼び出し:', layerId, layerName);
    
    // ベクターレイヤーのプロパティ情報
    const vectorProperties = feature.properties || {};
    const propertyName = VectorState.propertyField[layerId];
    const propertyValue = vectorProperties[propertyName];
    
    // console.log('選択プロパティ:', propertyName, '値:', propertyValue);
    
    // ラスターレイヤーの値も取得
    const layerValues = {};
    
    // アクティブなラスターレイヤーの値を取得
    activeLayers.forEach(rasterLayerId => {
        // ベクターレイヤーIDと異なる場合のみ処理（ラスターレイヤーのみ）
        if (rasterLayerId !== layerId && loadedLayers[rasterLayerId] && loadedLayers[rasterLayerId].georasters) {
            try {
                const value = geoblaze.identify(loadedLayers[rasterLayerId].georasters[0], [lon, lat]);
                layerValues[rasterLayerId] = value;
                // console.log(`ラスターレイヤー ${rasterLayerId} の値:`, value);
            } catch (error) {
                console.error(`レイヤー ${rasterLayerId} の値取得エラー:`, error);
            }
        }
    });
    
    // ベクターレイヤーの値を追加
    layerValues[layerId] = propertyValue;
    
    // ポップアップ内容を生成
    const popupContent = createVectorPopupContent(lat, lon, vectorProperties, layerId, layerName, propertyName);
    
    // マーカー情報を生成して返す
    return {
        lat,
        lon,
        name: `地点(${lat.toFixed(4)}, ${lon.toFixed(4)})`,
        layerValues,
        vectorData: {
            layerId,
            layerName,
            propertyName,
            properties: vectorProperties
        },
        popupContent
    };
}

// ベクターデータのポップアップ内容を作成する関数
function createVectorPopupContent(lat, lon, properties, layerId, layerName, propertyName) {
    let popupContent = `<strong>(LAT, LON) = </strong> (${lat.toFixed(4)}, ${lon.toFixed(4)})<br>`;
    
    // プロパティを表示
    if (properties) {
        if (properties[propertyName] !== undefined) {
            popupContent += `<strong>${layerName} - ${propertyName}:</strong> ${properties[propertyName]}<br>`;
        }
        
        // 他の主要なプロパティも表示
        let count = 0;
        for (const key in properties) {
            if (key !== propertyName) {
                popupContent += `<strong>${key}:</strong> ${properties[key]}<br>`;
                count++;
            }
        }
    }
    
    return popupContent;
}