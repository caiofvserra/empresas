import { createElement } from 'react';
import { ReportChart } from './primitives';

const NAVY = '#15265C';
const GOLD = '#FFB001';

/** A surface treatment only: no values, identities, axes or selection rules change. */
function gradient(color: string, horizontal: boolean) {
  const rgb = /^#([\da-f]{6})$/i.exec(color);
  if (!rgb) return color;
  const value = Number.parseInt(rgb[1], 16);
  const light = [value >> 16, value >> 8 & 255, value & 255]
    .map(channel => Math.round(channel + (255 - channel) * .24).toString(16).padStart(2, '0')).join('');
  return { type: 'linear', x: 0, y: 0, x2: horizontal ? 1 : 0, y2: horizontal ? 0 : 1,
    colorStops: [{ offset: 0, color: `#${light}` }, { offset: 1, color }] };
}

export function styleReportChartV9(option: Record<string, unknown>): Record<string, unknown> {
  const rows = Array.isArray(option.series) ? option.series : option.series ? [option.series] : [];
  const horizontal = !Array.isArray(option.yAxis) && (option.yAxis as any)?.type === 'category';
  const series = rows.map((row: any) => {
    const color = row.itemStyle?.color;
    if (row.type === 'bar') return { ...row, itemStyle: { ...row.itemStyle,
      ...(typeof color === 'string' ? { color: gradient(color, horizontal) } : {}),
      ...(color === GOLD ? { borderColor: NAVY, borderWidth: .6 } : {}),
    }, label: row.label ? { ...row.label, fontWeight: 500 } : undefined };
    if (row.type === 'line') {
      const gold = color === GOLD;
      return { ...row, symbol: 'circle', symbolSize: Math.max(row.symbolSize ?? 4, 5),
        itemStyle: { ...row.itemStyle, borderColor: gold ? NAVY : '#FFFFFF', borderWidth: gold ? 1.2 : 1 },
        // Yellow is an observed-series accent; the navy trace remains clear on white.
        lineStyle: { ...row.lineStyle, width: row.lineStyle?.type === 'dashed' ? 2 : 3.1,
          ...(gold ? { color: NAVY } : {}) },
      };
    }
    if (row.type === 'scatter') return { ...row,
      itemStyle: { ...row.itemStyle, borderColor: '#FFFFFF', borderWidth: 1.2, opacity: .88 },
      emphasis: { ...row.emphasis, itemStyle: { ...row.emphasis?.itemStyle, borderColor: NAVY, borderWidth: 1.5 } },
    };
    if (row.type === 'sankey') return { ...row,
      itemStyle: { ...row.itemStyle, borderColor: '#FFFFFF', borderWidth: .7 },
      lineStyle: { ...row.lineStyle, color: 'gradient', opacity: .38 },
      emphasis: { ...row.emphasis, lineStyle: { ...row.emphasis?.lineStyle, opacity: .72 } },
    };
    if (row.type === 'treemap') return { ...row,
      color: row.color ?? ['#3662E2', '#15265C', '#254AAD', '#395386', '#0E1732'],
      itemStyle: { ...row.itemStyle, borderColor: '#FFFFFF', borderWidth: 3, gapWidth: 3 },
      label: { ...row.label, fontWeight: 600 },
    };
    if (row.type === 'heatmap') return { ...row,
      itemStyle: { ...row.itemStyle, borderColor: '#FFFFFF', borderWidth: 3 },
      emphasis: { ...row.emphasis, itemStyle: { ...row.emphasis?.itemStyle, borderColor: NAVY, borderWidth: 1.5 } },
    };
    return row;
  });
  const tooltip = option.tooltip as Record<string, unknown> | undefined;
  const legend = option.legend as Record<string, any> | undefined;
  return { ...option, series,
    ...(tooltip ? { tooltip: { ...tooltip, backgroundColor: '#0E1732', borderColor: '#3662E2', borderWidth: 1,
      textStyle: { ...(tooltip.textStyle as object), color: '#F3F6FF', fontSize: 11, lineHeight: 17 } } } : {}),
    ...(legend ? { legend: { ...legend, textStyle: { ...legend.textStyle, color: '#334666', fontWeight: 500 } } } : {}),
  };
}

/** Keep the shared chart's resize, accessibility and Sankey lifecycle safeguards. */
export function ReportChartV9(props: Parameters<typeof ReportChart>[0]) {
  return createElement(ReportChart, { ...props, option: styleReportChartV9(props.option) });
}
