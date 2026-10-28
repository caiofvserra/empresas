import { init, registerMap, use } from 'echarts/core';
import { BarChart, LineChart, FunnelChart, HeatmapChart, TreemapChart, ScatterChart, MapChart, SankeyChart, GaugeChart, PieChart, CustomChart } from 'echarts/charts';
import { AriaComponent, GridComponent, TooltipComponent, LegendComponent, VisualMapComponent, GeoComponent, MarkLineComponent, MarkAreaComponent, MarkPointComponent, GraphicComponent, TitleComponent } from 'echarts/components';
import { SVGRenderer } from 'echarts/renderers';

use([BarChart, LineChart, FunnelChart, HeatmapChart, TreemapChart, ScatterChart, MapChart, SankeyChart, GaugeChart, PieChart, CustomChart,
  AriaComponent, GridComponent, TooltipComponent, LegendComponent, VisualMapComponent, GeoComponent, MarkLineComponent, MarkAreaComponent, MarkPointComponent, GraphicComponent, TitleComponent, SVGRenderer]);
export { init, registerMap };
