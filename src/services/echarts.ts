import { init, registerMap, use } from 'echarts/core';
import { BarChart, LineChart, FunnelChart, HeatmapChart, TreemapChart, ScatterChart, MapChart, SankeyChart } from 'echarts/charts';
import { AriaComponent, GridComponent, TooltipComponent, LegendComponent, VisualMapComponent, GeoComponent } from 'echarts/components';
import { SVGRenderer } from 'echarts/renderers';

use([BarChart, LineChart, FunnelChart, HeatmapChart, TreemapChart, ScatterChart, MapChart, SankeyChart,
  AriaComponent, GridComponent, TooltipComponent, LegendComponent, VisualMapComponent, GeoComponent, SVGRenderer]);
export { init, registerMap };
