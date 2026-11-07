import { init, registerMap, use } from 'echarts/core';
import { BarChart, BoxplotChart, LineChart, FunnelChart, HeatmapChart, TreemapChart, ScatterChart, MapChart, SankeyChart, GaugeChart, PieChart, CustomChart } from 'echarts/charts';
import { AriaComponent, GridComponent, TooltipComponent, LegendComponent, VisualMapComponent, GeoComponent, MarkLineComponent, MarkAreaComponent, MarkPointComponent, GraphicComponent, TitleComponent, CalendarComponent } from 'echarts/components';
import { SVGRenderer } from 'echarts/renderers';

use([BarChart, BoxplotChart, LineChart, FunnelChart, HeatmapChart, TreemapChart, ScatterChart, MapChart, SankeyChart, GaugeChart, PieChart, CustomChart,
  AriaComponent, GridComponent, TooltipComponent, LegendComponent, VisualMapComponent, GeoComponent, MarkLineComponent, MarkAreaComponent, MarkPointComponent, GraphicComponent, TitleComponent, CalendarComponent, SVGRenderer]);
export { init, registerMap };
