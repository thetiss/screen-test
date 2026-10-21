import * as echarts from 'echarts';
import type { MapAnchor } from '../types';

export interface UseEchartsMapOptions {
  target: HTMLElement;
  anchors?: MapAnchor[];
  /** 根地图的 echarts map name */
  mapName?: string;
  /** 根地图 adcode */
  rootAdcode?: string;
  /** 是否显示区县名标签 */
  showAllLabels?: boolean;
  onAnchorClick?: (anchor: MapAnchor) => void;
  /** 下钻状态变化回调（深度=0 表示在根视图） */
  onDrillChange?: (depth: number, currentName: string) => void;
}

/** 主题色 */
const CORE_COLOR = '#00e5ff';

/** 面包屑样式参数（graphic 层） */
const CRUMB = {
  top: 14,
  startX: 60,
  stepX: 148,
  width: 128,
  height: 44,
};

/** 根地图 GeoJSON 缓存 */
let rootGeoJsonCache: any = null;
/** 从根 GeoJSON 抽取的单区县子地图缓存（key: adcode） */
const singleFeatureCache = new Map<string, any>();

const loadRootGeoJson = async (): Promise<any> => {
  if (rootGeoJsonCache) return rootGeoJsonCache;
  const r = await fetch('/chongQingNew.json');
  if (!r.ok) throw new Error(`根 GeoJSON 加载失败: ${r.status}`);
  const data = await r.json();
  rootGeoJsonCache = data;
  return data;
};

/**
 * 从根 GeoJSON 里抽出单个区县的 FeatureCollection（复用重庆地图数据）
 * —— 区县本身没有更细的子级，下钻即"聚焦单区县"
 */
const getSingleRegionGeoJson = async (adcode: string, name?: string): Promise<any | null> => {
  if (singleFeatureCache.has(adcode)) return singleFeatureCache.get(adcode);
  const root = await loadRootGeoJson();
  const features = root?.features || [];
  const feature = features.find(
    (f: any) => String(f.properties?.adcode) === adcode || (name && f.properties?.name === name),
  );
  if (!feature) return null;
  const sub = { type: 'FeatureCollection', features: [feature] };
  singleFeatureCache.set(adcode, sub);
  return sub;
};

/** 面包屑 graphic group */
const makeBreadcrumb = (
  idKey: string,
  title: string,
  subtitle: string,
  idx: number,
  isLast: boolean,
  onClick: () => void,
): any => {
  const x = CRUMB.startX + CRUMB.stepX * idx;
  const w = CRUMB.width;
  const h = CRUMB.height;
  const handleClick = () => onClick();

  return {
    type: 'group',
    id: `bc-${idKey}`,
    left: x,
    top: CRUMB.top,
    z: 100,
    children: [
      {
        type: 'rect',
        shape: { x: 0, y: 0, width: w, height: h, r: 4 },
        style: {
          fill: isLast ? 'rgba(0, 229, 255, 0.16)' : 'rgba(6, 12, 24, 0.55)',
          stroke: isLast ? CORE_COLOR : 'rgba(0, 229, 255, 0.35)',
          lineWidth: 1,
          shadowColor: 'rgba(0, 229, 255, 0.35)',
          shadowBlur: isLast ? 10 : 4,
        },
        onclick: handleClick,
      },
      {
        type: 'polyline',
        shape: { points: [[14, 12], [6, h / 2], [14, h - 12]] },
        style: {
          stroke: CORE_COLOR,
          fill: 'transparent',
          lineWidth: 2,
          lineJoin: 'round',
          lineCap: 'round',
        },
        onclick: handleClick,
      },
      {
        type: 'text',
        left: 26,
        top: 4,
        style: {
          text: title,
          fill: isLast ? '#ffffff' : '#e6f1ff',
          font: `bold 13px "Microsoft YaHei", "PingFang SC", sans-serif`,
          textShadowColor: CORE_COLOR,
          textShadowBlur: isLast ? 6 : 0,
        },
        onclick: handleClick,
      },
      {
        type: 'text',
        left: 26,
        top: 24,
        style: {
          text: subtitle,
          fill: 'rgba(77, 255, 210, 0.75)',
          font: '10px "SF Mono", Consolas, monospace',
        },
        onclick: handleClick,
      },
      ...(isLast ? [] : [
        {
          type: 'text',
          left: w + 6,
          top: h / 2 - 8,
          style: {
            text: '›',
            fill: CORE_COLOR,
            font: 'bold 16px sans-serif',
          },
        },
      ]),
    ],
  };
};

/** 主色板（深蓝科技风，参考 makeapie xx4zj__lgQ.html） */
const MAP_COLORS = {
  bg: '#062343',
  areaMain: '#094987',
  areaShadow: '#094987',
  areaHighlight: '#0160AD',
  borderColor: 'rgba(68, 173, 254, 0.2)',
  borderWidth: 2,
  haloBorder: 'rgba(68, 173, 254, 1)',
  haloBorderWidth: 6,
  haloShadow: 'rgba(68, 173, 254, 1)',
  topBorder: 'rgba(192, 245, 249, 0.8)',
  topBorderWidth: 4,
  topShadow: '#6FFDFF',
  topArea: 'rgba(29, 85, 139, 0.6)',
  labelColor: '#D4EEFF',
  labelColorHover: '#ffffff',
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


/** geo 层 1 —— 高亮虚影层（发光边框） */
const buildHaloGeo = (map: string, zoom: number): any => ({
  map,
  aspectScale: 1,
  roam: false,
  zoom: 1.2 * zoom,
  silent: true,
  layoutSize: `${Math.round(zoom * 80)}%`,
  layoutCenter: ['50%', '50%'],
  itemStyle: {
    borderColor: MAP_COLORS.haloBorder,
    borderWidth: MAP_COLORS.haloBorderWidth,
    shadowColor: MAP_COLORS.haloShadow,
    shadowOffsetY: 0,
    shadowBlur: 4,
  },
  zlevel: -1,
});

/** geo 层 2 —— 实际层（区域填充，交互层） */
const buildMainGeo = (map: string, zoom: number): any => ({
  map,
  aspectScale: 1,
  roam: false,
  zoom: 1.2 * zoom,
  layoutSize: `${Math.round(zoom * 80)}%`,
  layoutCenter: ['50%', '50%'],
  itemStyle: {
    borderColor: MAP_COLORS.borderColor,
    borderWidth: MAP_COLORS.borderWidth,
    areaColor: MAP_COLORS.areaMain,
  },
  emphasis: {
    itemStyle: {
      areaColor: MAP_COLORS.areaHighlight,
    },
    label: {
      show: false,
      color: '#fff',
    },
  },
  zlevel: 1,
});

/** geo 层 3 —— 底部重影层（轻微下沉，营造 3D 厚度） */
const buildShadowGeo = (map: string, zoom: number): any => ({
  map,
  aspectScale: 1,
  roam: false,
  zoom: 1.2 * zoom,
  silent: true,
  layoutSize: `${Math.round(zoom * 80)}%`,
  layoutCenter: ['50%', '51.2%'],
  itemStyle: {
    borderColor: MAP_COLORS.borderColor,
    borderWidth: 1,
    areaColor: MAP_COLORS.areaShadow,
  },
  zlevel: -2,
});

/** 构建所有 geo 层（顺序：贴图主层、阴影层、底部重影层）
 *  isRoot=true 时（重庆市根视图）在 level1 铺贴图；下钻到区县时改为纯色 */
const buildGeoLayers = (map: string, zoom: number, isRoot: boolean): any[] => [
  // buildHaloGeo(map, zoom),
  // buildMainGeo(map, zoom),
  // buildShadowGeo(map, zoom),
  buildLevel1Geo(map, zoom, isRoot),
  buildLevel2Geo(map, zoom),
  buildLevel3Geo(map, zoom),
  // buildLevel4Geo(map, zoom),
  // buildLevel5Geo(map, zoom),
];

/** 主 map series —— 顶层光晕正面，营造发光边缘 */
const buildMapSeries = (map: string, zoom: number, showLabels: boolean): any => ({
  type: 'map',
  id: 'mainMap',
  name: 'mainMap',
  map,
  roam: false,
  aspectScale: 1,
  zoom: 1.25 * zoom,
  layoutSize: `${Math.round(zoom * 80)}%`,
  layoutCenter: ['50%', '50%'],
  selectedMode: false,
  // label: {
  //   show: showLabels,
  //   color: MAP_COLORS.labelColor,
  //   fontSize: 12,
  //   fontFamily: '"Source Han Sans CN", "Microsoft YaHei", sans-serif',
  //   textBorderColor: 'rgba(0, 0, 0, 0.7)',
  //   textBorderWidth: 2,
  //   formatter: (params: any) => params.name,
  // },
  label: {
    show: showLabels, //是否显示地图省份得名称
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
  // itemStyle: {
  //   borderColor: MAP_COLORS.topBorder,
  //   borderWidth: MAP_COLORS.topBorderWidth,
  //   shadowColor: MAP_COLORS.topShadow,
  //   shadowOffsetY: 0,
  //   shadowBlur: 10,
  //   areaColor: MAP_COLORS.topArea,
  // },
  // emphasis: {
  //   itemStyle: {
  //     areaColor: MAP_COLORS.areaHighlight,
  //   },
  //   label: {
  //     show: true,
  //     color: '#fff',
  //   },
  // },
  zlevel: 1,
  data: [],
});

/** 锚点散点 —— effectScatter，绑定到实际层（geoIndex=1） */
const buildAnchorScatter = (anchors: MapAnchor[], currentAdcode: string): any => ({
  type: 'effectScatter',
  id: 'anchors',
  coordinateSystem: 'geo',
  geoIndex: 1,
  rippleEffect: {
    brushType: 'stroke',
    period: 4,
    scale: 3,
  },
  showEffectOn: 'render',
  symbol: 'circle',
  symbolSize: (_val: any) => 10,
  itemStyle: {
    color: {
      type: 'radial',
      x: 0.5,
      y: 0.5,
      r: 0.5,
      colorStops: [
        { offset: 0, color: 'rgba(0,228,242,0.5)' },
        { offset: 0.8, color: 'rgba(0,228,242,0.8)' },
        { offset: 1, color: 'rgba(0,228,242,1)' },
      ],
    },
    shadowColor: 'rgba(0, 228, 242, 0.8)',
    shadowBlur: 8,
  },
  label: {
    show: false,
    color: MAP_COLORS.labelColor,
    position: 'right',
    distance: 6,
    fontSize: 11,
    formatter: (params: any) => params.name,
  },
  emphasis: {
    label: {
      show: true,
      color: '#ffffff',
      fontWeight: 'bold',
    },
  },
  data: anchors
    // 下钻到区县时隐藏锚点（避免坐标不在当前地图范围内）
    .filter(() => currentAdcode === '500000')
    .map((a) => ({
      name: a.name,
      value: [...a.coord, a.value],
      anchor: a,
    })),
  zlevel: 2,
});

export function useEchartsMap(opts: UseEchartsMapOptions) {
  const {
    target,
    anchors = [],
    mapName = 'chongqing',
    rootAdcode = '500000',
    showAllLabels = true,
    onAnchorClick,
    onDrillChange,
  } = opts;

  let chart: echarts.ECharts | null = null;
  let currentMapName = mapName;
  let anchorsRef: MapAnchor[] = anchors;
  let loading = false;
  let animId: number | null = null;

  interface StackItem {
    mapName: string;
    displayName: string;
    adcode: string;
  }
  const stack: StackItem[] = [{ mapName, displayName: '重庆市', adcode: rootAdcode }];

  // ============ 选项构建 ============

  const buildBreadcrumbGraphic = (): any[] => {
    return stack.map((item, i) =>
      makeBreadcrumb(
        item.adcode + '_' + i,
        item.displayName,
        i === 0 ? 'CHONGQING' : item.displayName.toUpperCase(),
        i,
        i === stack.length - 1,
        () => goToLevel(i),
      ),
    );
  };

  const buildFullOption = (mapNameArg: string, zoom = 1): any => ({
    backgroundColor: 'transparent',
    // tooltip: {
    //   show: true,
    //   trigger: 'item',
    //   backgroundColor: 'rgba(6, 12, 24, 0.9)',
    //   borderColor: CORE_COLOR,
    //   borderWidth: 1,
    //   textStyle: { color: '#e6f1ff', fontSize: 12 },
    //   formatter: (params: any) => {
    //     if (params.componentSubType === 'effectScatter' || params.seriesType === 'effectScatter') {
    //       return `<div style="font-weight:600;color:#00e5ff;">${params.name}</div>热度值：${params.data?.value?.[2] ?? '-'}`;
    //     }
    //     return params.name ? `${params.name}` : '';
    //   },
    // },
    graphic: buildBreadcrumbGraphic(),
    // 只有根视图（stack.length===1）才铺贴图；下钻到区县用纯色，避免图像拉伸变形
    geo: buildGeoLayers(mapNameArg, zoom, stack.length === 1),
    series: [
      buildMapSeries(mapNameArg, zoom, showAllLabels),
      buildAnchorScatter(anchorsRef, stack[stack.length - 1].adcode),
    ],
    animation: false,
  });

  // ============ 应用地图 ============

  const applyMap = (mapNameArg: string) => {
    if (!chart) return;
    currentMapName = mapNameArg;

    if (animId) {
      cancelAnimationFrame(animId);
      animId = null;
    }

    // 直接用 notMerge 应用完整选项（含 graphic 面包屑）
    chart.setOption(buildFullOption(mapNameArg, 0.6), true);

    // 缩放入场动画（0.6 → 1）—— 每帧都携带完整选项，避免 notMerge 清空 graphic
    let count = 0.6;
    const tick = () => {
      count = Math.min(count + 0.06, 1);
      chart?.setOption(buildFullOption(mapNameArg, count), true);
      if (count < 1) {
        animId = requestAnimationFrame(tick);
      } else {
        animId = null;
      }
    };
    animId = requestAnimationFrame(tick);

    onDrillChange?.(stack.length - 1, stack[stack.length - 1].displayName);
  };

  // ============ 下钻 & 返回 ============

  const drillDown = async (clickedName: string, adcode: string) => {
    if (loading) return;
    loading = true;
    try {
      const sub = await getSingleRegionGeoJson(adcode, clickedName);
      if (!sub) {
        console.warn('[drillDown] 未在重庆 GeoJSON 中找到该区县：', clickedName, adcode);
        return;
      }
      const newName = `cq_${adcode}_${stack.length}`;
      echarts.registerMap(newName, sub);
      stack.push({ mapName: newName, displayName: clickedName, adcode });
      applyMap(newName);
    } catch (e) {
      console.error('[drillDown] 加载失败：', e);
    } finally {
      loading = false;
    }
  };

  const goToLevel = async (targetIdx: number) => {
    if (!chart || loading) return;
    if (targetIdx < 0 || targetIdx >= stack.length) return;
    if (targetIdx === stack.length - 1) return;

    loading = true;
    try {
      stack.length = targetIdx + 1;
      const target = stack[targetIdx];

      if (targetIdx === 0) {
        const geoJson = await loadRootGeoJson();
        echarts.registerMap(mapName, geoJson);
        applyMap(mapName);
      } else {
        const sub = await getSingleRegionGeoJson(target.adcode, target.displayName);
        if (!sub) {
          console.error('[goToLevel] 未在根 GeoJSON 中找到该区县：', target.adcode);
        } else {
          echarts.registerMap(target.mapName, sub);
          applyMap(target.mapName);
        }
      }
    } catch (e) {
      console.error('[goToLevel] 加载失败：', e);
    } finally {
      loading = false;
    }
  };

  /** 从当前 map 数据里查某个区域的 adcode */
  const getAdcodeFromMap = (mapNameArg: string, regionName: string): string | null => {
    try {
      const mapObj: any = (echarts as any).getMap?.(mapNameArg);
      if (!mapObj) return null;
      const geoJson = mapObj.geoJson || mapObj.geoJSON;
      const features = geoJson?.features || [];
      for (const f of features) {
        const p = f?.properties || {};
        if (p.name === regionName) return p.adcode ? String(p.adcode) : null;
      }
      return null;
    } catch {
      return null;
    }
  };

  // ============ 初始化 ============

  const init = async () => {
    try {
      const geoJson = await loadRootGeoJson();
      echarts.registerMap(mapName, geoJson);
    } catch (e) {
      console.error('[useEchartsMap] 根 GeoJSON 加载失败：', e);
      echarts.registerMap(mapName, { type: 'FeatureCollection', features: [] });
    }

    chart = echarts.init(target, null, { renderer: 'canvas' });
    chart.setOption(buildFullOption(mapName, 1), true);

    // 点击处理
    chart.on('click', (params: any) => {
      // 锚点点击
      if (params.componentType === 'series' && params.seriesType === 'effectScatter') {
        const anchor = params.data?.anchor;
        if (anchor) onAnchorClick?.(anchor);
        return;
      }

      // map series 区域点击
      if (params.componentType !== 'series' || params.seriesType !== 'map') return;
      if (!params.name) return;

      const current = stack[stack.length - 1];

      // 点击当前已下钻聚焦的区域 → 自动返回上级（根视图时不响应）
      if (params.name === current.displayName || params.name === current.mapName) {
        if (stack.length > 1) {
          void goToLevel(stack.length - 2);
        }
        return;
      }

      const adcode = getAdcodeFromMap(current.mapName, params.name);
      if (!adcode) {
        console.warn('[click] 该区域无 adcode，无法下钻');
        return;
      }

      void drillDown(params.name, adcode);
    });
  };

  const dispose = () => {
    if (animId) cancelAnimationFrame(animId);
    chart?.dispose();
    chart = null;
  };

  const resize = () => chart?.resize();

  const setAnchors = (list: MapAnchor[]) => {
    anchorsRef = list;
    if (chart && stack.length === 1) {
      chart.setOption(buildFullOption(mapName, 1), true);
    }
  };

  return {
    init,
    dispose,
    resize,
    setAnchors,
    getChart: () => chart,
    getCurrentMapName: () => currentMapName,
    getDrillDepth: () => stack.length - 1,
    getCurrentName: () => stack[stack.length - 1].displayName,
    isDrilling: () => loading,
    goRoot: () => goToLevel(0),
    pop: () => goToLevel(stack.length - 2),
    /** 从外部（如主城 inset）触发与主图点击区域一致的下钻 */
    drillDownTo: (clickedName: string, adcode: string) => drillDown(clickedName, adcode),
  };
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


