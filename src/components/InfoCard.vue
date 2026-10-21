<template>
  <Transition name="card-fade">
    <aside
      v-if="anchor"
      class="info-card"
      @click.stop
    >
      <!-- 顶部装饰条 -->
      <div class="card-strip">
        <div class="strip-line"></div>
        <div class="strip-corner"></div>
      </div>

      <!-- 头部 -->
      <header class="card-header">
        <div class="header-left">
          <span class="badge">{{ anchor.group === 'core' ? '主城核心' : '区县代表' }}</span>
          <span class="coord">
            <span class="coord-label">LAT</span>
            <span class="coord-val">{{ anchor.coord[1].toFixed(4) }}°</span>
            <span class="coord-sep">·</span>
            <span class="coord-label">LNG</span>
            <span class="coord-val">{{ anchor.coord[0].toFixed(4) }}°</span>
          </span>
        </div>
        <button class="close-btn" aria-label="关闭" @click="emit('close')">
          <span class="line"></span>
        </button>
      </header>

      <!-- 标题区 -->
      <div class="card-title">
        <h2>{{ anchor.name }}</h2>
        <p class="subtitle">{{ anchor.info.region }}</p>
      </div>

      <!-- 摘要 -->
      <p class="summary">{{ anchor.info.summary }}</p>

      <!-- 指标网格 -->
      <div class="metrics">
        <div v-for="m in anchor.info.metrics" :key="m.label" class="metric">
          <div class="metric-label">{{ m.label }}</div>
          <div class="metric-value">
            <span class="num">{{ m.value }}</span>
            <span v-if="m.unit" class="unit">{{ m.unit }}</span>
            <span v-if="m.trend" class="trend" :class="m.trend">
              <span v-if="m.trend === 'up'" class="arrow">▲</span>
              <span v-else-if="m.trend === 'down'" class="arrow">▼</span>
              <span v-else class="arrow">—</span>
            </span>
          </div>
        </div>
      </div>

      <!-- 标签 -->
      <div class="tags">
        <span v-for="t in anchor.info.tags" :key="t" class="tag"># {{ t }}</span>
      </div>

      <!-- 底部 -->
      <footer class="card-footer">
        <span class="footer-left">数据更新 · {{ anchor.info.updated }}</span>
        <span class="footer-right">
          <span class="pulse"></span>
          LIVE
        </span>
      </footer>

      <!-- 底部装饰条 -->
      <div class="card-strip bottom">
        <div class="strip-line"></div>
        <div class="strip-corner right"></div>
      </div>
    </aside>
  </Transition>
</template>

<script setup lang="ts">
import type { MapAnchor } from '../types';

defineProps<{
  anchor: MapAnchor | null;
}>();

const emit = defineEmits<{
  (e: 'close'): void;
}>();
</script>

<style scoped>
.card-fade-enter-from,
.card-fade-leave-to {
  opacity: 0;
  transform: translateX(20px);
}
.card-fade-enter-active,
.card-fade-leave-active {
  transition: opacity 0.2s ease, transform 0.2s ease;
}

.info-card {
  position: fixed;
  top: 80px;
  right: 32px;
  bottom: 64px;
  width: 380px;
  max-width: calc(100vw - 64px);
  background: var(--card-bg);
  border: 1px solid rgba(0, 229, 255, 0.35);
  border-radius: 6px;
  padding: 24px 24px 20px;
  box-shadow:
    -20px 0 60px rgba(0, 0, 0, 0.55),
    0 0 0 1px rgba(0, 229, 255, 0.08) inset,
    0 0 40px rgba(0, 229, 255, 0.15);
  backdrop-filter: blur(14px);
  -webkit-backdrop-filter: blur(14px);
  z-index: 30;
  color: var(--text-1);
  font-size: 13px;
  line-height: 1.55;
  overflow-y: auto;
}

/* 顶部装饰条 */
.card-strip {
  position: absolute;
  top: 0; left: 0;
  width: 100%; height: 2px;
  overflow: visible;
}
.card-strip .strip-line {
  width: 40%; height: 100%;
  background: linear-gradient(90deg, var(--accent) 0%, transparent 100%);
}
.card-strip .strip-corner {
  position: absolute;
  top: -2px; left: -3px;
  width: 6px; height: 6px;
  background: var(--accent);
  box-shadow: 0 0 10px var(--accent);
}
.card-strip.bottom {
  top: auto; bottom: 0;
}
.card-strip.bottom .strip-line {
  width: 30%;
  margin-left: auto;
  background: linear-gradient(-90deg, var(--accent-2) 0%, transparent 100%);
}
.card-strip.bottom .strip-corner.right {
  top: -2px;
  left: auto; right: -3px;
}

/* 头部 */
.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 14px;
}
.header-left {
  display: flex; align-items: center; gap: 12px;
}
.badge {
  display: inline-block;
  padding: 3px 10px;
  font-size: 10px;
  letter-spacing: 2px;
  color: var(--accent);
  background: rgba(0, 229, 255, 0.08);
  border: 1px solid rgba(0, 229, 255, 0.4);
  border-radius: 2px;
}
.coord {
  display: flex; align-items: center; gap: 6px;
  font-size: 10px;
  color: var(--text-2);
  letter-spacing: 1px;
  font-family: 'SF Mono', Consolas, monospace;
}
.coord-label { color: var(--accent-2); font-weight: 600; }
.coord-val { color: var(--text-1); }
.coord-sep { color: rgba(122, 145, 176, 0.4); }

.close-btn {
  width: 26px; height: 26px;
  border: 1px solid rgba(255, 255, 255, 0.15);
  background: rgba(255, 255, 255, 0.04);
  border-radius: 50%;
  display: flex; align-items: center; justify-content: center;
  cursor: pointer;
  transition: all 0.18s ease;
  flex-shrink: 0;
}
.close-btn .line {
  width: 10px; height: 1.5px;
  background: var(--text-1);
  transform: rotate(45deg);
  position: relative;
}
.close-btn .line::after {
  content: '';
  position: absolute;
  top: 4.25px; left: -4.25px;
  width: 10px; height: 1.5px;
  background: var(--text-1);
  transform: rotate(-90deg);
}
.close-btn:hover {
  border-color: var(--danger);
  background: rgba(255, 84, 112, 0.15);
  transform: rotate(90deg);
}

/* 标题 */
.card-title {
  margin-bottom: 14px;
}
.card-title h2 {
  margin: 0 0 4px;
  font-size: 30px;
  font-weight: 700;
  letter-spacing: 6px;
  background: linear-gradient(135deg, var(--text-1) 0%, var(--accent) 100%);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
}
.subtitle {
  margin: 0;
  font-size: 11px;
  letter-spacing: 2px;
  color: var(--accent-2);
}

/* 摘要 */
.summary {
  margin: 0 0 18px;
  font-size: 12px;
  color: rgba(230, 241, 255, 0.78);
  line-height: 1.75;
  padding-left: 10px;
  border-left: 2px solid rgba(0, 229, 255, 0.35);
}

/* 指标网格 */
.metrics {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 10px;
  margin-bottom: 16px;
}
.metric {
  padding: 11px 13px;
  background: rgba(0, 229, 255, 0.04);
  border: 1px solid rgba(0, 229, 255, 0.12);
  border-radius: 4px;
  position: relative;
}
.metric::before {
  content: '';
  position: absolute;
  top: 0; left: 0;
  width: 14px; height: 1px;
  background: var(--accent);
}
.metric-label {
  font-size: 10px;
  color: var(--text-2);
  letter-spacing: 1.5px;
  margin-bottom: 5px;
}
.metric-value {
  display: flex;
  align-items: baseline;
  gap: 4px;
}
.metric-value .num {
  font-size: 20px;
  font-weight: 700;
  color: var(--text-1);
  font-family: 'SF Mono', Consolas, monospace;
  letter-spacing: 0.5px;
}
.metric-value .unit {
  font-size: 10px;
  color: var(--text-2);
}
.metric-value .trend {
  font-size: 10px;
  margin-left: 4px;
  padding: 1px 5px;
  border-radius: 2px;
  display: inline-flex;
  align-items: center;
  gap: 2px;
}
.metric-value .trend.up {
  color: var(--accent-2);
  background: rgba(77, 255, 210, 0.1);
}
.metric-value .trend.down {
  color: var(--danger);
  background: rgba(255, 84, 112, 0.1);
}
.metric-value .trend.flat {
  color: var(--warn);
  background: rgba(255, 184, 77, 0.1);
}
.metric-value .arrow {
  font-size: 8px;
}

/* 标签 */
.tags {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  margin-bottom: 16px;
}
.tag {
  font-size: 10px;
  color: var(--accent-2);
  padding: 3px 10px;
  background: rgba(77, 255, 210, 0.06);
  border: 1px solid rgba(77, 255, 210, 0.25);
  border-radius: 12px;
  letter-spacing: 1px;
}

/* 底部 */
.card-footer {
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-size: 10px;
  color: var(--text-2);
  letter-spacing: 1px;
  padding-top: 12px;
  border-top: 1px dashed rgba(0, 229, 255, 0.15);
}
.footer-right {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  color: var(--accent);
}
.pulse {
  width: 6px; height: 6px;
  border-radius: 50%;
  background: var(--accent);
  box-shadow: 0 0 8px var(--accent);
}
</style>
