import * as echarts from 'echarts';

/**
 * 主城 inset 展示器（左上角小图，嵌入主图）
 *  - GeoJSON 源：/chongQingCenterCounty.json（8 个中心城区）
 *  - 只做展示 + 点击回调，没有独立下钻栈
 *  - 点击任一区县 → 通过 onRegionClick 通知外部，让主图执行同样下钻
 *  - 主图下钻到区县后，外部通过 setVisible(false) 隐藏 inset
 */
export interface UseCenterCityMapOptions {
  target: HTMLElement;
  mapName?: string;
  geoUrl?: string;
  /** 点击主城任一区县时触发；外部（主图）应据此执行 drillDown */
  onRegionClick?: (name: string, adcode: string) => void;
}

/** 主城 GeoJSON 缓存（模块级，避免重复 fetch） */
let centerGeoJsonCache: any = null;

export const getCenterGeoJsonCache = (): any => centerGeoJsonCache;
export const setCenterGeoJsonCache = (data: any) => {
  centerGeoJsonCache = data;
};



const buildLevel1Geo = (map: string, zoom: number, isRoot: boolean): any => ({
  map,
  zoom,
  silent: true,
  roam: false,
  layoutCenter: ['50%', '50%'],
  layoutSize: '100%',
  aspectScale: mapSize.aspectScale,
  label: {
    show: false
  },
  itemStyle: {
    // 只在根视图（重庆市）铺贴图；下钻到区县时用纯色填充，不显示图像
    areaColor: isRoot ? { image: mapMaterial } : 'rgba(11, 72, 111, 0.85)'
  }
});


const buildLevel2Geo = (map: string, zoom: number): any => ({
  map,
  zoom,
  zlevel: -1,
  silent: true,
  roam: false,
  layoutCenter: ['50%', '50%'],
  layoutSize: '100%',
  aspectScale: mapSize.aspectScale,
  label: {
    show: false
  },
  itemStyle: {
    shadowColor: '#47729b'
  }
});


const buildLevel3Geo = (map: string, zoom: number): any => ({
  map,
  zoom,
  type: 'map',
  zlevel: -1,
  aspectScale: mapSize.aspectScale,
  layoutCenter: ['50%', '53%'],
  layoutSize: '100%',
  roam: false,
  silent: true,
  label: {
    show: false
  },
  itemStyle: {
    color: '#47729b'
  }
});

const buildInsetSeries = (map: string): any => ({
  type: 'map',
  id: 'centerInset',
  name: 'centerInset',
  map,
  roam: false,
  aspectScale: 1,
  zoom: 1.25,
  layoutSize: '92%',
  layoutCenter: ['50%', '54%'],
  selectedMode: false,
  label: {
    show: true, //是否显示地图省份得名称
    color: 'rgba(255, 255, 255, 0.8)',
    fontSize: newSize(14),
    padding: [0, newSize(5)],
    height: newSize(22),
    borderWidth: newSize(1),
    borderColor: 'rgba(9, 214, 214, 1)',
    borderRadius: newSize(2),
    backgroundColor: 'rgba(6, 13, 17, 0.62)',
    lineHeight: newSize(22),
    fontFamily: 'Source Han Sans',
    labelLayout: {
      moveOverlap: 'shiftY'
    }
  },
  itemStyle: {
    areaColor: {
      type: 'radial',
      x: 0.5,
      y: 0.5,
      r: 0.5,
      colorStops: [
        {
          offset: 0,
          color: 'rgba(79,159,100,0)' // 0% 处的颜色
        },
        {
          offset: 0.8,
          color: 'rgba(178,246,255,0.3)' // 100% 处的颜色
        },
        {
          offset: 1,
          color: 'rgba(178,230,255,0.4)' // 100% 处的颜色
        }
      ],
      global: false // 缺省为 false
    },
    borderColor: '#b2f6ff',
    borderWidth: newSize(2),
    shadowColor: 'black',
    shadowBlur: newSize(2),
    shadowOffsetY: newSize(2),
    opacity: 1
  },
  emphasis: {
    itemStyle: {
      areaColor: 'rgba(78,184,165,0.6)',
      borderWidth: newSize(3),
      borderColor: '#36ffb7'
    },
    label: {
      color: 'rgba(9, 214, 214, 1)'
    }
  },
  data: [],
});

const buildInsetGeo = (map: string): any => ({
  map,
  aspectScale: 1,
  roam: false,
  silent: true,
  zoom: 1.25,
  layoutSize: '92%',
  layoutCenter: ['50%', '56%'],
  label: { show: false },
  itemStyle: {
    borderColor: 'rgba(68, 173, 254, 0.15)',
    borderWidth: 1,
    areaColor: '#0a3055',
  },
  zlevel: -1,
});

const buildFullOption = (map: string): any => ({
  backgroundColor: 'transparent',
  // geo: [buildInsetGeo(map)],
  geo: [
    buildLevel1Geo(map, 1, true),
    buildLevel2Geo(map, 1),
    buildLevel3Geo(map, 1),
  ],
  series: [buildInsetSeries(map)],
  animation: false,
});

/** 从主城 GeoJSON 查某个区县的 adcode */
const getAdcodeFromCenterGeo = (regionName: string): string | null => {
  if (!centerGeoJsonCache) return null;
  const features = centerGeoJsonCache?.features || [];
  for (const f of features) {
    const p = f?.properties || {};
    if (p.name === regionName) return p.adcode ? String(p.adcode) : null;
  }
  return null;
};

export function useCenterCityMap(opts: UseCenterCityMapOptions) {
  const {
    target,
    mapName = 'chongQingCenterCounty',
    geoUrl = '/chongQingCenterCounty.json',
    onRegionClick,
  } = opts;

  let chart: echarts.ECharts | null = null;
  let initialized = false;

  const init = async (): Promise<void> => {
    if (initialized && chart) return;
    if (!centerGeoJsonCache) {
      try {
        const r = await fetch(geoUrl);
        if (!r.ok) throw new Error(`主城 GeoJSON 加载失败: ${r.status}`);
        centerGeoJsonCache = await r.json();
      } catch (e) {
        console.error('[useCenterCityMap] GeoJSON 加载失败:', e);
        centerGeoJsonCache = { type: 'FeatureCollection', features: [] };
      }
    }
    echarts.registerMap(mapName, centerGeoJsonCache);
    chart = echarts.init(target, null, { renderer: 'canvas' });
    chart.setOption(buildFullOption(mapName), true);
    chart.on('click', (params: any) => {
      if (params.componentType !== 'series' || params.seriesType !== 'map') return;
      if (!params.name) return;
      const adcode = getAdcodeFromCenterGeo(params.name);
      if (!adcode) return;
      onRegionClick?.(params.name, adcode);
    });
    initialized = true;
  };

  const setVisible = (visible: boolean) => {
    // 隐藏时同时把 pointer-events 设为 none，避免覆盖主图区域的点击/面包屑交互；
    // 否则 inset 的 z-index 高于主图，会导致主图上被 inset 覆盖区（含面包屑"重庆市"）无法点击。
    target.style.display = visible ? '' : 'none';
    target.style.pointerEvents = visible ? 'auto' : 'none';
    // 恢复显示时，echarts 需重新按最新容器尺寸渲染一次，避免从 display:none 恢复后画布空白/错位
    if (visible && chart) {
      chart.resize();
      chart.setOption(buildFullOption(mapName));
    }
  };

  const dispose = () => {
    chart?.dispose();
    chart = null;
    initialized = false;
  };

  return { init, dispose, setVisible };
}


//根据当前屏幕宽度计算当前元素的大小   initWidth为设计稿的宽度
export function newSize(val, initWidth = 1920) {
  const nowClientWidth = document.documentElement.clientWidth
  const newSize = val * (nowClientWidth / initWidth)
  return newSize
}

import mapMaterial from '../assets/images/map-material.png'

//全市地图尺寸配置
const mapSize = {
  aspectScale: 1,
  zoom: 1.08,
  center_zoom: 0.35
}
