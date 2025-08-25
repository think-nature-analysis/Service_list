// パネル関連の機能

// 情報パネルを表示する関数
function showInfoPanel(markerInfo) {
  const infoPanel = document.getElementById('infoPanel');
  
  // タイトルを設定
  const title = `${markerInfo.name}`;
  document.getElementById('imageTitle1').textContent = title;
  //document.getElementById('imageTitle1').innerHTML = '<iframe src="https://think-nature.jp" width="100%" height="400"></iframe>'
  document.getElementById('imageTitle2').textContent = title;
  document.getElementById('imageTitle3').textContent = title;
  
  // 情報を表示
  let infoHTML = `
      <p>地点名: ${markerInfo.name}</p>
      <p>緯度: ${markerInfo.lat.toFixed(4)}</p>
      <p>経度: ${markerInfo.lon.toFixed(4)}</p>
  `;
  
  // // レイヤー値情報セクションを開始
  // infoHTML += '<div class="layer-values-section">';
  // infoHTML += '<h4>レイヤー値情報</h4>';
  
  // // 選択されているレイヤーの値を表示
  // let hasLayerValues = false;
  
  // if (markerInfo.layerValues) {
  //     // アクティブなレイヤーごとに値を表示
  //     activeLayers.forEach(layerId => {
  //         if (markerInfo.layerValues[layerId] !== undefined && markerInfo.layerValues[layerId] !== null) {
  //             hasLayerValues = true;
  //             // レイヤー名を取得
  //             getLayerConfigById(layerId).then(layerConfig => {
  //                 if (layerConfig) {
  //                     const layerValueElement = document.getElementById(`layer-value-${layerId}`);
  //                     if (layerValueElement) {
  //                         layerValueElement.textContent = Utils.roundTo(markerInfo.layerValues[layerId], 4);
  //                     }
  //                 }
  //             });
  //             infoHTML += `<p id="layer-value-${layerId}">レイヤー ${layerId}: ${Utils.roundTo(markerInfo.layerValues[layerId], 4)}</p>`;
  //         }
  //     });
  // }
  
  // // ベクターデータの値を表示（追加部分）
  // if (markerInfo.vectorFeatures) {
  //     Object.keys(markerInfo.vectorFeatures).forEach(vectorLayerId => {
  //         const feature = markerInfo.vectorFeatures[vectorLayerId];
  //         if (feature && feature.properties) {
  //             hasLayerValues = true;
              
  //             // レイヤー名の取得を試みる
  //             const layerItem = document.querySelector(`.vector-layer-item[data-layer-id="${vectorLayerId}"]`);
  //             const layerName = layerItem ? layerItem.querySelector('label').textContent : vectorLayerId;
              
  //             // 選択されているプロパティを取得
  //             const propertyName = typeof VectorState !== 'undefined' && VectorState.propertyField ? 
  //                                  VectorState.propertyField[vectorLayerId] : null;
              
  //             if (propertyName && feature.properties[propertyName] !== undefined) {
  //                 infoHTML += `<p><strong>${layerName}</strong>: ${propertyName} = ${feature.properties[propertyName]}</p>`;
  //             }
  //         }
  //     });
  // }
  
  // if (!hasLayerValues) {
  //     infoHTML += '<p>選択地点のレイヤー情報はありません</p>';
  // }
  
  // infoHTML += '</div>';
  
  // // ベクターデータの詳細プロパティ情報を表示（追加部分）
  // if (markerInfo.vectorFeatures) {
  //     Object.keys(markerInfo.vectorFeatures).forEach(vectorLayerId => {
  //         const feature = markerInfo.vectorFeatures[vectorLayerId];
  //         if (feature && feature.properties) {
  //             // レイヤー名の取得を試みる
  //             const layerItem = document.querySelector(`.vector-layer-item[data-layer-id="${vectorLayerId}"]`);
  //             const layerName = layerItem ? layerItem.querySelector('label').textContent : vectorLayerId;
              
  //             infoHTML += '<div class="vector-properties-section">';
  //             infoHTML += `<h4>${layerName} の詳細情報</h4>`;
              
  //             Object.keys(feature.properties).forEach(key => {
  //                 const value = feature.properties[key];
  //                 infoHTML += `<p><strong>${key}:</strong> ${value}</p>`;
  //             });
              
  //             infoHTML += '</div>';
  //         }
  //     });
  // }
  
  document.getElementById('info').innerHTML = infoHTML;
  
  // レイヤー名を非同期で更新
  activeLayers.forEach(layerId => {
      getLayerConfigById(layerId).then(layerConfig => {
          if (layerConfig) {
              const layerNameElement = document.getElementById(`layer-name-${layerId}`);
              if (layerNameElement) {
                  layerNameElement.textContent = layerConfig.name;
              }
          }
      });
  });
  
  // 画像を表示（3つのタブすべて）
  showTabImage('locationImage1',markerInfo.name);
  showTabImage2('locationImage2',markerInfo.name);
  showTabImage3('locationImage3',markerInfo.name);
  
  // パネルを表示
  infoPanel.style.display = 'block';
  
  // 地図の中心を移動
  setTimeout(() => map.panTo([markerInfo.lat, markerInfo.lon]), 100);

  // 凡例の位置を調整
  adjustVectorLegendPosition(true);

  // パネル状態を更新
  AppState.panels.isInfoOpen = true;
}


// 凡例の位置を調整
function hideInfoPanel() {
  const infoPanel = document.getElementById('infoPanel');
  infoPanel.style.display = 'none';
  
  // パネルを閉じたら凡例を元の位置に戻す
  adjustVectorLegendPosition(false);
}

// タブ画像を表示する関数
function showTabImage(imageId,myname) {
  const image = document.getElementById(imageId);
  image.style.display = 'block';
  if(myname=="洋上風力_八峰町及び能代市沖"){
   image.src = '../images/b_1.png?' + Date.now(); // キャッシュ対策
  }else if(myname=="洋上風力_石狩"){
   image.src = '../images/b_2.png?' + Date.now(); // キャッシュ対策
  }else if(myname=="洋上風力_五島"){
   image.src = '../images/b_3.png?' + Date.now();
  }else if(myname=="洋上風力_長崎鼻"){
   image.src = '../images/b_4.png?' + Date.now();
  }else if(myname=="洋上風力_富山湾"){
   image.src = '../images/b_5.png?' + Date.now();
  }else if(myname=="港湾_大連"){
   image.src = '../images/ss1.png?' + Date.now();
  }else if(myname=="資源開発_ソロモン諸島"){
   image.src = '../images/ss2.png?' + Date.now();
  }else{
   image.src = '../images/naim.png?' + Date.now();
  }
  image.onerror = function() {
    this.style.display = 'none';
    console.error('画像の読み込みに失敗しました');
  };
}

function showTabImage2(imageId,myname) {
  const image = document.getElementById(imageId);
  console.log(myname);
  image.style.display = 'block';
  if(myname=="洋上風力_八峰町及び能代市沖"){
   image.src = '../images/k_1.png?' + Date.now(); // キャッシュ対策
  }else if(myname=="洋上風力_石狩"){
   image.src = '../images/k_2.png?' + Date.now(); // キャッシュ対策
  }else if(myname=="洋上風力_五島"){
   image.src = '../images/k_3.png?' + Date.now();
  }else if(myname=="洋上風力_長崎鼻"){
   image.src = '../images/k_4.png?' + Date.now();
  }else if(myname=="洋上風力_富山湾"){
   image.src = '../images/k_5.png?' + Date.now();
  }else if(myname=="港湾_大連"){
   image.src = '../images/sa1.png?' + Date.now();
  }else if(myname=="資源開発_ソロモン諸島"){
   image.src = '../images/sa2.png?' + Date.now();
  }else{
   image.src = '../images/naim.png?' + Date.now();
  }
  
  image.onerror = function() {
    this.style.display = 'none';
    console.error('画像の読み込みに失敗しました');
  };
}

function showTabImage3(imageId,myname) {
  const image = document.getElementById(imageId);
  console.log(myname);
  image.style.display = 'block';
  if(myname=="洋上風力_八峰町及び能代市沖"){
   image.src = '../images/d_1.png?' + Date.now(); // キャッシュ対策
  }else if(myname=="洋上風力_石狩"){
   image.src = '../images/d_2.png?' + Date.now(); // キャッシュ対策
  }else if(myname=="洋上風力_五島"){
   image.src = '../images/d_3.png?' + Date.now();
  }else if(myname=="洋上風力_長崎鼻"){
   image.src = '../images/d_4.png?' + Date.now();
  }else if(myname=="洋上風力_富山湾"){
   image.src = '../images/d_5.png?' + Date.now();
  }else if(myname=="高塔山公園"){
   image.src = '../images/高塔山公園.png?' + Date.now();
  }else{
   image.src = '../images/naim.png?' + Date.now();
  }
  
  image.onerror = function() {
    this.style.display = 'none';
    console.error('画像の読み込みに失敗しました');
  };
}
// 情報パネルを閉じる関数を修正
function closeInfoPanel() {
  document.getElementById('infoPanel').style.display = 'none';
  AppState.panels.isInfoOpen = false;
  AppState.panels.isRedInfoOpen = false;
  
  // 凡例を元の位置に戻す
  adjustVectorLegendPosition(false);
}

// タブを切り替える関数
function switchTab(e) {
  // すべてのタブを非アクティブ化
  document.querySelectorAll('.tab-btn, .tab-content').forEach(el => {
    el.classList.remove('active');
  });
  
  // クリックされたタブをアクティブ化
  e.target.classList.add('active');
  const tabId = e.target.dataset.tab;
  document.getElementById(`${tabId}Tab`).classList.add('active');
}