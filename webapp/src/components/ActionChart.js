import { debounce, isNil, max } from "lodash";
import moment from "moment";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Area,
  CartesianGrid,
  ComposedChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { formatters, roundToNextDecimal } from "../utils";
import toHex from "colornames";

import Style from "./ActionChart.module.scss";

export const chartColors = [
  "#338066",
  "#80334f",
  "#334080",
  "#7e8033",
  "#753380",
];

const getFormattedValue = (value, setting, isChart) => {
  return formatters[setting?.formatter]
    ? formatters[setting?.formatter](value, setting?.formatterParams, isChart)
    : { value, appendix: setting?.formatterParams };
};

function ActionChart({
  data: rawData,
  dataMax: rawDataMax,
  dataMin: rawDataMin,
  color: colorProp,
  templates,
  isIcon = false,
}) {
  const [isMobile, setIsMobile] = useState(window.innerWidth < 1000);

  const templateObject = useMemo(
    () =>
      templates?.reduce(
        (curr, acc) => ({
          ...curr,
          [acc.id]: { ...acc },
        }),
        {}
      ) ?? {},
    [templates]
  );
  const settings = useMemo(() => ({}), []);

  const validColor = useMemo(() => {
    if (typeof colorProp === "object") {
      return colorProp;
    }

    const matchedColor =
      colorProp?.match(
        /#[A-Fa-f0-9]+|rgba?\(\d+\s*,?\s*\d+\s*,?\s*\d+\s*\)/
      )?.[0] ??
      colorProp ??
      null;
    return toHex(matchedColor) ?? matchedColor;
  }, [colorProp]);

  useEffect(() => {
    const setIsMobileDebounced = debounce(
      () => setIsMobile(window.innerWidth < 1000),
      100,
      { trailing: true }
    );
    window.addEventListener("resize", setIsMobileDebounced);

    return () => {
      window.removeEventListener("resize", setIsMobileDebounced);
    };
  }, []);

  const getColor = useCallback(
    (index) => {
      return (
        (typeof validColor === "object"
          ? validColor[index % chartColors.length]
          : validColor) ??
        chartColors?.[index % chartColors.length] ??
        chartColors?.[0] ??
        "#338066"
      );
    },
    [validColor]
  );

  const minMax = useMemo(() => {
    const returnValue = {};
    Object.values(rawDataMax).forEach((datum) => {
      if (!returnValue[datum.template_id]) {
        returnValue[datum.template_id] = {};
      }

      returnValue[datum.template_id].max = parseFloat(datum.value, 10);
    });
    Object.values(rawDataMin).forEach((datum) => {
      if (!returnValue[datum.template_id]) {
        returnValue[datum.template_id] = {};
      }

      returnValue[datum.template_id].min = parseFloat(datum.value, 10);
    });
    return returnValue;
  }, [rawDataMax, rawDataMin]);

  const getMinMax = useCallback(
    (templateId, index) => {
      if (
        !minMax[templateId] ||
        minMax[templateId]?.min === undefined ||
        minMax[templateId]?.max === undefined
      ) {
        return {};
      }

      const { min, max } = minMax[templateId];
      const onePercent = (max - min) / 100;

      return {
        domain: [min, max + onePercent * (5 + index * 10)],
      };
    },
    [minMax]
  );

  const data = useMemo(
    () =>
      Object.values(
        rawData.reduce((acc, curr) => {
          if (!settings[curr.template_id]) {
            settings[curr.template_id] = {
              color: getColor(Object.keys(settings).length),
              formatter: curr?.formatter,
              formatterParams: curr?.formatterParams
                ? curr?.formatterParams.split(",")
                : [],
            };
          }

          return {
            ...acc,
            [curr.time]: {
              ...(acc[curr.time] ?? {}),
              ...curr,
              [curr.template_id]: parseFloat(curr.value, 10),
            },
          };
        }, {})
      ),
    [getColor, rawData, settings]
  );

  // const maxValues = useMemo(
  //   () =>
  //     data.reduce((acc, curr) => {
  //       const newValues = acc;
  //       Object.keys(settings).forEach((key) => {
  //         acc[key] = max([acc[key] ?? 0, parseFloat(curr[key] ?? 0)]);
  //       });

  //       return newValues;
  //     }, {}),
  //   [data, settings]
  // );
  const maxValue = useMemo(() => {
    let newValue;
    data.forEach((curr) => {
      Object.keys(settings).forEach((key) => {
        newValue = !newValue
          ? curr[key]
          : max([newValue ?? 0, parseFloat(curr[key] ?? 0)]);
      });
    });

    return newValue;
  }, [data, settings]);

  return (
    <ResponsiveContainer width="100%" height="100%">
      <ComposedChart
        data={data}
        margin={{
          top: 0,
          right: 0,
          left: 0,
          bottom: 0,
        }}
      >
        <CartesianGrid strokeDasharray="3 3" />
        {!isIcon && (
          <XAxis
            dataKey="time"
            fontSize={12}
            tickFormatter={(value) => {
              return moment(value).format("HH:mm");
            }}
          />
        )}
        {!isIcon &&
          !isMobile &&
          false &&
          Object.entries(settings).map(([valueId, setting], index) => {
            const maxFormattedValue = getFormattedValue(
              roundToNextDecimal(maxValue),
              setting,
              true
            );
            const maxWidth =
              (`${maxFormattedValue?.value ?? ""} ${
                maxFormattedValue?.appendix ?? ""
              }`.length ?? 3) * 20;

            return (
              <YAxis
                {...getMinMax(valueId, index)}
                key={valueId}
                yAxisId={valueId}
                orientation={index % 2 === 0 ? "left" : "right"}
                fontSize={12}
                width={maxWidth}
                tickFormatter={(value) => {
                  const formattedValue = getFormattedValue(
                    value,
                    setting,
                    true
                  );

                  return !isNil(formattedValue.value)
                    ? `${formattedValue.value} ${formattedValue.appendix ?? ""}`
                    : "";
                }}
              />
            );
          })}
        {!isIcon && (
          <Tooltip
            content={({ payload: items, label }) => {
              return (
                <div className={Style.Tooltip}>
                  <div className={Style.Label}>
                    {moment(label).format("HH:mm")}
                  </div>
                  <ul className={Style.Items}>
                    {items.map(({ value, name, color }) => {
                      const formattedValue = formatters[
                        settings?.[name].formatter
                      ]
                        ? formatters[settings?.[name].formatter](
                            value,
                            settings?.[name].formatterParams
                          )
                        : { value, appendix: settings?.[name].formatterParams };
                      return (
                        <li className={Style.Item} style={{ color }}>
                          <span className={Style.Name}>
                            {templateObject?.[name].label}
                          </span>
                          <span className={Style.Value}>
                            {formattedValue.value}
                          </span>
                          <span className={Style.Appendix}>
                            {formattedValue.appendix ?? ""}
                          </span>
                        </li>
                      );
                    })}
                  </ul>
                </div>
              );
            }}
          />
        )}
        {Object.entries(settings).map(([valueId, setting], index) => (
          <Area
            key={valueId}
            type="monotone"
            yAxisId={valueId}
            dataKey={valueId}
            stroke={setting.color}
            strokeWidth={isIcon ? 1 : 2}
            fill={setting.color}
            fillOpacity={0.35}
          />
        ))}
      </ComposedChart>
    </ResponsiveContainer>
  );
}

export default ActionChart;
