export interface MapAnchor {
  /** 锚点唯一 ID */
  id: string;
  /** 展示名称 */
  name: string;
  /** 经纬度 [lng, lat] */
  coord: [number, number];
  /** 权重/热度（控制锚点光圈大小） */
  value: number;
  /** 分组（用于图例配色） */
  group: 'core' | 'county';
  /** 详情数据（信息卡占位字段） */
  info: AnchorInfo;
}

export interface AnchorInfo {
  region: string;
  summary: string;
  metrics: MetricItem[];
  tags: string[];
  updated: string;
}

export interface MetricItem {
  label: string;
  value: string;
  unit?: string;
  /** 可选：数值型指标用于趋势指示 */
  trend?: 'up' | 'down' | 'flat';
}
