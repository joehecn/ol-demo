import './style.css';
import {Map, View} from 'ol';
import ImageLayer from 'ol/layer/Image';
import { Vector as VectorLayer } from 'ol/layer';
import { getCenter } from 'ol/extent';
import Projection from 'ol/proj/Projection';
import Static from 'ol/source/ImageStatic';
import {
  Circle as CircleStyle,
  Fill,
  Stroke,
  Style,
  Text,
} from 'ol/style';
import { Cluster, Vector as VectorSource } from 'ol/source';
import { Draw } from 'ol/interaction';

import {
  overlay,
  show as showPopup,
  hide
} from './popup.js';

// Mock device id
let id = 0;

// 要素将聚集在一起的像素距离
const DISTANCE = 35;

let activeFeature = null

const hidePopup = () => {
  activeFeature = null
  hide()
}

// 检查最近的点是不是太近了
const _checkIsTooClose = (pixel1, pixel2) => {
  if (Math.abs(pixel1[0] - pixel2[0]) <= DISTANCE && Math.abs(pixel1[1] - pixel2[1]) <= DISTANCE) {
    return true
  }

  return false
}

// 原始点数据源的 features
const features = []

// 有效范围
const extent = [0, 0, 647, 367];

// 地图
const map = new Map({
  target: 'map',
  overlays: [overlay],
});

// 投影
const projection = new Projection({
  units: 'pixels',
  extent, // 有效范围
});

// 视图
const view = new View({
  projection: projection,
  center: getCenter(extent),
  extent, // 限定视图大小
  minZoom: 2,
  maxZoom: 5,
  zoom: 2,
})

// 背景图片图层
const layerBackground = new ImageLayer({
  source: new Static({
    url: "./back.png",
    projection: projection,
    imageExtent: extent
  }),
})

// 原始点数据源
const vectorSource = new VectorSource({
  features,
});

// 聚合点数据源
const clusterSource = new Cluster({
  distance: DISTANCE, // 要素将聚集在一起的像素距离
  source: vectorSource,
});

// 原始点样式
const vectorStyle = new Style({
  image: new CircleStyle({
    radius: 10,
    stroke: new Stroke({
      color: '#fff',
    }),
    fill: new Fill({
      color: '#3399CC',
    }),
  }),
  text: new Text({
    text: '', // size.toString(),
    fill: new Fill({
      color: '#fff',
    }),
  }),
})

// 聚合点样式
const clusterStyle = new Style({
  image: new CircleStyle({
    radius: 15,
    stroke: new Stroke({
      color: '#fff',
    }),
    fill: new Fill({
      color: 'orange',
    }),
  }),
  text: new Text({
    text: '', // size.toString(),
    fill: new Fill({
      color: '#fff',
    }),
  }),
})

// 聚合点图层
const clusters = new VectorLayer({
  source: clusterSource,
  style: (feature) => {
    const childFeatures = feature.get('features');
    const len = childFeatures.length;

    if (len === 1) {
      const id = childFeatures[0].getId()
      vectorStyle.getText().setText(id.toString())
      return vectorStyle
    }

    clusterStyle.getText().setText(len.toString())
    return clusterStyle;
  },
});

map.on('singleclick', (e) => {
  const feature = map.forEachFeatureAtPixel(e.pixel, (feature) => {
    return feature;
  });

  if (!feature) {
    hidePopup()
    return
  }

  const childFeatures = feature.get('features');
  if (!childFeatures) return

  const len = childFeatures.length;

  if (len === 1) {
    const childFeature = childFeatures[0]
    const id = childFeature.getId()

    // 显示 popup
    activeFeature = childFeature
    showPopup(childFeature.getGeometry().getCoordinates(), id)
  } else {
    // View 放大一级
    view.setZoom(view.getZoom() + 1)
  }
})

// 监听地图缩放事件
map.on("moveend", () => {
  if (!activeFeature) return
  // clusterSource 聚合点数据源
  // features 聚合点集合
  const features = clusterSource.getFeatures()

  const feature = features.find(f => {
    const childFeatures = f.get('features');
    return childFeatures.includes(activeFeature)
  })

  if (!feature) return

  showPopup(feature.getGeometry().getCoordinates(), activeFeature.getId())
})

// 在viewport节点下添加一个添加点按钮
const viewport = map.getViewport();
const button = document.createElement('button');
button.innerHTML = '添加点';
button.classList.add('me-add-point-btn');

button.onclick = () => {
  hidePopup()

  const draw = new Draw({
    type: "Point",
    source: vectorSource,
    // 停止在绘图期间触发单击、单击和双击事件
    stopClick: true,
    // 绘制完成的条件
    finishCondition: (e) => {
      // 最近的点
      const closedFeature = clusterSource.getClosestFeatureToCoordinate(e.coordinate)
      if (!closedFeature) return true

      // 最近的点的像素位置
      const pixel2 = map.getPixelFromCoordinate(closedFeature.getGeometry().getCoordinates())

      // 检查最近的点是不是太近了
      if (_checkIsTooClose(e.pixel, pixel2)) {
        const coordinate = map.getCoordinateFromPixel(e.pixel)
        showPopup(coordinate, '距离太近了!')
        return false
      }

      hidePopup()
      return true
    },
    style: new Style({
      image: new CircleStyle({
        radius: 5,
        fill: new Fill({
          color: 'orange',
        }),
      }),
    })
  });

  // 绘制完成
  draw.on("drawend", (e) => {
    e.feature.setId(id++)
    // 删除互交
    map.removeInteraction(draw);
  })

  // 为地图添加交互
  map.addInteraction(draw);
}

viewport.appendChild(button);

map.setView(view)
map.addLayer(layerBackground)
map.addLayer(clusters)
