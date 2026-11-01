import { init, registerMap, use } from 'echarts/core';
import { BarChart, LineChart, FunnelChart, HeatmapChart, TreemapChart, ScatterChart, MapChart, SankeyChart, GaugeChart, PieChart, CustomChart, GraphChart } from 'echarts/charts';
import { AriaComponent, GridComponent, TooltipComponent, LegendComponent, VisualMapComponent, GeoComponent, MarkLineComponent, MarkAreaComponent, MarkPointComponent, GraphicComponent, TitleComponent, PolarComponent } from 'echarts/components';
import { SVGRenderer } from 'echarts/renderers';

use([BarChart, LineChart, FunnelChart, HeatmapChart, TreemapChart, ScatterChart, MapChart, SankeyChart, GaugeChart, PieChart, CustomChart, GraphChart,
  AriaComponent, GridComponent, TooltipComponent, LegendComponent, VisualMapComponent, GeoComponent, MarkLineComponent, MarkAreaComponent, MarkPointComponent, GraphicComponent, TitleComponent, PolarComponent, SVGRenderer]);
export { init, registerMap };
