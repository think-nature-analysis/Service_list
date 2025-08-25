// アプリケーション全体の設定
const AppConfig = {
  // マップの初期設定
  map: {
    center: [33.85342358714356, 130.815092745533],
    zoom: 15,
    bounds: [
      [-90, -280], // 南西の座標 [緯度, 経度]
      [90, 280]    // 北東の座標 [緯度, 経度]
    ],
    maxBoundsViscosity: 0.5
  },
  
  // プロジェクト設定ファイルのURL
  projectConfigUrl: '../project_config.yaml',

  // レイヤー設定ファイルのURL
  layersConfigUrl: '../data_list.json',
  
  // 選択可能なレイヤーの最大数
  maxSelectableLayers: 2,
  
  // カラーマップのオプション
  colorMaps: [
    'Spectral', 'gnuplot2', 'RdYlGn', 'RdYlBu', 'viridis',
    'jet', 'ocean', 'nipy_spectral', 'terrain', 'binary',
    'Reds', 'Blues', 'Greens', 'RdBu', 'PRGn'
  ]
};


// プロジェクト設定のデフォルト値
const ProjectConfig = {
  features: {
      rasterLayers: {
          enabled: true,
          layerSelectionPanel: true,
          layerSettingsUI: true,
          initmap: false
      },
      vectorLayers: {
          enabled: true,
          layerPanel: true,
          propertySelection: true,
          loadGeojson: true
      },
      markers: {
          enabled: true,
          csvImport: true
      },
      mapControls: {
          homeButton: true
      }
  }
};
  