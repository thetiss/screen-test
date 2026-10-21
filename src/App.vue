<template>
  <div class="app">
    <div class="grid-bg"></div>

    <!-- 顶部标题栏 -->
    <header class="header">
      <div class="title-block">
        <span class="dot"></span>
        <h1>CHONGQING · 3D INTERACTIVE MAP</h1>
        <span class="sub">重庆市行政区划可视化</span>
      </div>
      <div class="header-right">
        <span>系统时间</span>
        <span class="live"> · {{ now }}</span>
      </div>
    </header>

    <!-- 地图主区（面包屑通过 echarts graphic 内嵌） -->
    <div class="map-wrap">
      <div class="map-3d">
        <div class="echart" ref="echartRef"></div>
      </div>
    </div>

    <!-- 左上角主城 inset 小图（无背景、无边框） -->
    <div class="center-inset" ref="centerEchartRef"></div>

    <!-- 自定义弹窗 -->
    <InfoCard :anchor="activeAnchor" @close="activeAnchor = null" />

    <!-- 操作提示 -->
    <div class="hint">
      <span v-if="drillDepth === 0">
        点击 <strong>锚点</strong> 查看详情 · 点击 <strong>区县</strong> 下钻 · 左上 <strong>主城 inset</strong> 也可下钻 · Esc 关闭
      </span>
      <span v-else>
        当前位于 <strong>{{ currentName }}</strong> · 点击顶部面包屑 <strong>&lt;</strong> 返回上级 · Esc 返回
      </span>
    </div>

    <!-- 底部信息栏 -->
    <footer class="footer">
      <div class="legend">
        <span class="item">
          <span class="swatch" style="background: var(--accent); box-shadow: 0 0 6px var(--accent);"></span>
          主城核心
        </span>
        <span class="item">
          <span class="swatch" style="background: var(--accent-2); box-shadow: 0 0 6px var(--accent-2);"></span>
          区县代表
        </span>
        <span class="item">
          <span class="swatch" style="background: rgba(15, 30, 55, 0.9); border: 1px solid var(--line);"></span>
          行政区域
        </span>
      </div>
      <div class="meta">
        <span>Vue 3</span> · <span>TypeScript</span> · <span>ECharts</span> ·
        <span>伪 3D 视角</span> ·
        <span>层级 {{ drillDepth + 1 }}</span>
        <span v-if="loading" class="loading-badge">加载中…</span>
      </div>
    </footer>
  </div>
</template>

<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref } from 'vue';
import InfoCard from './components/InfoCard.vue';
import { anchors } from './data/anchors';
import type { MapAnchor } from './types';
import { useEchartsMap } from './composables/useEchartsMap';
import { useCenterCityMap } from './composables/useCenterCityMap';

const echartRef = ref<HTMLElement | null>(null);
const centerEchartRef = ref<HTMLElement | null>(null);
const activeAnchor = ref<MapAnchor | null>(null);
const now = ref('');
const drillDepth = ref(0);
const currentName = ref('重庆市');
const loading = ref(false);

let chartInstance: ReturnType<typeof useEchartsMap> | null = null;
let centerInstance: ReturnType<typeof useCenterCityMap> | null = null;
let timer: number | undefined;

const updateTime = () => {
  const d = new Date();
  const pad = (n: number) => String(n).padStart(2, '0');
  now.value = `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
};

onMounted(async () => {
  updateTime();
  timer = window.setInterval(updateTime, 1000);

  if (!echartRef.value) return;

  chartInstance = useEchartsMap({
    target: echartRef.value,
    mapName: 'chongqing',
    rootAdcode: '500000',
    anchors,
    onAnchorClick: (a: MapAnchor) => {
      activeAnchor.value = a;
    },
    onDrillChange: (depth, name) => {
      drillDepth.value = depth;
      currentName.value = name;
      loading.value = false;
      // 下钻到区县后隐藏左上主城 inset（避免与已聚焦视图重复）
      centerInstance?.setVisible(depth === 0);
    },
  });

  await chartInstance.init();

  // 主城 inset（左上角小图，只做展示 + 点击回调转发到主图 drillDown）
  if (centerEchartRef.value) {
    centerInstance = useCenterCityMap({
      target: centerEchartRef.value,
      mapName: 'chongQingCenterCounty',
      geoUrl: '/chongQingCenterCounty.json',
      onRegionClick: (name, adcode) => {
        chartInstance?.drillDownTo(name, adcode);
      },
    });
    await centerInstance.init();
  }

  const onKeydown = (e: KeyboardEvent) => {
    if (e.key !== 'Escape') return;
    if (activeAnchor.value) {
      activeAnchor.value = null;
      return;
    }
    if (drillDepth.value > 0) {
      loading.value = true;
      chartInstance?.pop();
    }
  };
  window.addEventListener('keydown', onKeydown);

  onBeforeUnmount(() => {
    window.removeEventListener('keydown', onKeydown);
    if (timer) clearInterval(timer);
    centerInstance?.dispose();
    chartInstance?.dispose();
  });
});
</script>

<style>
.app {
  position: relative;
  width: 100vw;
  height: 100vh;
}
.loading-badge {
  margin-left: 10px;
  padding: 2px 8px;
  border-radius: 3px;
  background: rgba(0, 229, 255, 0.15);
  border: 1px solid rgba(0, 229, 255, 0.4);
  color: var(--accent);
  font-size: 11px;
  animation: pulse 1s ease-in-out infinite;
}
@keyframes pulse {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.5; }
}

/* 左上角主城 inset（嵌入主图区域，主图下钻时通过 setVisible 隐藏）
   无背景、无边框、无外框装饰，让 inset 地图本身成为主体 */
.center-inset {
  position: absolute;
  top: 92px;
  left: 24px;
  width: 400px;
  height: 440px;
  z-index: 12;
  display: flex;
  flex-direction: column;
  pointer-events: auto;
}
.center-echart {
  flex: 1;
  min-height: 0;
  position: relative;
}
</style>
