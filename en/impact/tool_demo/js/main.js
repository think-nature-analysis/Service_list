// メインアプリケーションの初期化と実行

// グローバル変数としてプロジェクト設定を保持
let projectConfig = null;

// DOMContentLoadedイベントでアプリケーションを初期化
document.addEventListener('DOMContentLoaded', function() {
  // プロジェクト設定を読み込む
  loadProjectConfig().then(() => {
      // マップの初期化
      initMap();
      
      // マーカーアイコンの初期化（条件付き）
      initMarkerIcons();
      
      // 経度線を追加
      const longitudeLines = addLongitudeLines();
      
      // レイヤーの初期化（条件付き）
      if (isFeatureEnabled('rasterLayers.enabled')) {
          initLayers();
      }
      
      // ベクターレイヤーの初期化（条件付き）
      if (isFeatureEnabled('vectorLayers.enabled')) {
          initVectorLayers();
      }
      
      // UIの表示/非表示を設定に基づいて制御
      updateUIBasedOnConfig();
      
      // イベントリスナーの設定
      initEventListeners();
  }).catch(error => {
      console.error('プロジェクト設定の読み込み中にエラーが発生しました:', error);
      // エラー時もアプリケーションを初期化
      initMap();
      initMarkerIcons();
      const longitudeLines = addLongitudeLines();
      initLayers();
      initVectorLayers();
      initEventListeners();
  });
});


// プロジェクト設定を読み込む関数
async function loadProjectConfig() {
  try {
      const response = await fetch(AppConfig.projectConfigUrl);
      if (!response.ok) {
          console.warn('プロジェクト設定の読み込みに失敗しました。デフォルト設定を使用します。');
          projectConfig = JSON.parse(JSON.stringify(ProjectConfig));
          return;
      }
      
      // JSONと違い、テキストとして読み込んでからYAMLとしてパース
      const yamlText = await response.text();
      projectConfig = jsyaml.load(yamlText);  // js-yamlライブラリを使用
      
      console.log('プロジェクト設定を読み込みました:', projectConfig);
  } catch (error) {
      console.error('プロジェクト設定の読み込み中にエラーが発生しました:', error);
      projectConfig = JSON.parse(JSON.stringify(ProjectConfig));
  }
}


// 機能が有効かどうかをチェックする関数
function isFeatureEnabled(featurePath) {
  if (!projectConfig) return true; // 設定が読み込まれていない場合はデフォルトでtrue
  
  const parts = featurePath.split('.');
  let currentObj = projectConfig.features;
  
  for (const part of parts) {
      if (!currentObj || currentObj[part] === undefined) {
          return true; // 設定が存在しない場合はデフォルトでtrue
      }
      currentObj = currentObj[part];
  }
  
  return !!currentObj; // 値をブール値に変換して返す
}


// UIの表示/非表示を設定に基づいて制御する関数
function updateUIBasedOnConfig() {
  // ラスターレイヤー関連のUI制御
  if (!isFeatureEnabled('rasterLayers.enabled')) {
      hideElement('layerSelectionContainer');
      hideElement('activeLayersContainer');
  } else {
      // レイヤー選択パネル
      if (!isFeatureEnabled('rasterLayers.layerSelectionPanel')) {
          hideElement('layerSelectionContainer');
      }
      
      // レイヤー設定UI
      if (!isFeatureEnabled('rasterLayers.layerSettingsUI')) {
          hideElement('activeLayersContainer');
      }
  }
  
  // ベクターレイヤー関連のUI制御
  if (!isFeatureEnabled('vectorLayers.enabled')) {
      hideElement('vectorControlSection');
  } else {
      // ベクターレイヤーパネル
      if (!isFeatureEnabled('vectorLayers.layerPanel')) {
          hideElement('vectorControlSection');
      }
  }
  
  // マーカー関連のUI制御
  if (!isFeatureEnabled('markers.csvImport')) {
      hideElement('loadCSVButton');
  }
  
  // マップコントロール関連のUI制御
  if (!isFeatureEnabled('mapControls.homeButton')) {
      hideElement('homeButton');
  }
}


// 要素を非表示にする補助関数
function hideElement(elementId) {
  const element = document.getElementById(elementId);
  if (element) {
      element.style.display = 'none';
  }
}

// イベントリスナーを初期化する関数
function initEventListeners() {
  // CSVファイル読み込みボタン（条件付き）
  if (isFeatureEnabled('markers.csvImport')) {
    const csvButton = document.getElementById('loadCSVButton');
    if (csvButton) {
        csvButton.addEventListener('click', loadCSVMarkers);
    }
  }
  
  // 情報パネルを閉じるボタン
  document.getElementById('closeButton').addEventListener('click', closeInfoPanel);
  
  // タブ切り替え
  document.querySelectorAll('.tab-btn').forEach(btn => {
    btn.addEventListener('click', switchTab);
  });
  
  // // HOMEボタン
  // document.getElementById('homeButton').addEventListener('click', resetMapToInitialState);

  // HOMEボタン（条件付き）
  if (isFeatureEnabled('mapControls.homeButton')) {
    const homeButton = document.getElementById('homeButton');
    if (homeButton) {
        homeButton.addEventListener('click', function() {
            resetMapToInitialState(true);
            // ベクターレイヤーもリセット（条件付き）
            if (isFeatureEnabled('vectorLayers.enabled')) {
                resetVectorLayers();
            }
        });
    }
  }
}

// アプリケーションの初期化完了時に呼び出される関数
function onAppInitialized() {
  console.log('アプリケーションの初期化が完了しました');
  
  // 初期状態では何もレイヤーを選択しない
  document.querySelectorAll('#layerList input[type="checkbox"]').forEach(checkbox => {
    checkbox.checked = false;
  });
  
  // レイヤー設定UIを更新
  updateLayerSettingsUI();
}