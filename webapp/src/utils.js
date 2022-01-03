import { debounce, first, get as lGet, isNil, last, set } from "lodash";
import moment from "moment";
import { parse } from "node-html-parser";

export const isLocalhost = () => window.location.hostname === "localhost";

export const getPageUrl = (page, credentials, path = "") => {
  const authPath =
    credentials?.username && credentials?.key
      ? `/auth/${credentials?.username}/${credentials?.key}`
      : "";
  return `${authPath}/${page}${path ? "/" : ""}${path ?? ""}`;
};

export const getPagePath = (page, credentials, path = "") => {
  const authPath =
    credentials?.username && credentials?.key
      ? `/auth/${credentials?.username}/${credentials?.key}`
      : "";
  const normalPath = `/${page}${path ? "/" : ""}${path ?? ""}`;
  return authPath ? [`${authPath}${normalPath}`, normalPath] : [normalPath];
};

const mappedCallbacks = {
  "@html": (_, found) => (found?.keyLast ? "." : "") + "@html",
  "@json": (_, found) => (found?.keyLast ? "." : "") + "@json",
  "@record": (_, found) => (found?.keyLast ? "." : "") + "@record",
  "@last": (obj, found) => {
    return (found?.keyLast ? "." : "") + last(Object.keys(obj));
  },
  "@first": (obj, found) => {
    return (found?.keyLast ? "." : "") + first(Object.keys(obj));
  },
};
const mappedKeys = Object.keys(mappedCallbacks);

export const logger = {
  ...(console ?? {}),
  show: (title, content, operation = "log") => {
    operation = typeof console[operation] === "function" ? operation : "log";
    console[operation]?.("");
    title &&
      console[operation]?.(`%c ----- ${title} ----- start`, "color: green;");
    console[operation]?.({ content });
    title && console[operation]?.(`%c ----- ${title} ----- end`, "color: red;");
  },
};

export const get = (object, key) => {
  const check = { object: JSON.parse(JSON.stringify(object)) };
  let replacedKey = key;
  mappedKeys.forEach((mappedKey) => {
    const mappedRegex = new RegExp(
      `(?<rule>(^(?<keyFirst>${mappedKey})|.(?<keyLast>${mappedKey}))(\\((?<params>[^\\)]+)\\))?)`,
      "m"
    );
    const foundKey = replacedKey.match(mappedRegex)?.groups;

    if (foundKey?.rule) {
      const mainKey = replacedKey.split(foundKey?.rule)?.[0];
      let mainObj = mainKey ? lGet(check.object, mainKey) : check.object;

      if (mainObj && ["@html", "@json", "@record"].includes(mappedKey)) {
        let content;
        if (
          typeof mainObj === "string" &&
          mappedKey === "@html" &&
          foundKey?.params
        ) {
          const html = parse(mainObj);
          content = {
            [mappedKey]: html?.querySelector(foundKey?.params)?.innerHTML,
          };
        } else if (typeof mainObj === "string" && mappedKey === "@json") {
          try {
            content = { [mappedKey]: JSON.parse(mainObj) };
          } catch (err) {
            content = undefined;
          }
        } else if (Array.isArray(mainObj) && mappedKey === "@record") {
          content = {
            [mappedKey]: mainObj.reduce((acc, loopObj) => {
              const [key, value, add, operation] =
                foundKey?.params?.split(/\s*,\s*/);
              const newKey = lGet(loopObj, key);

              if (isNil(newKey)) {
                return acc;
              }

              const newObj = {
                [newKey]: lGet(loopObj, value),
              };

              const newAdd = parseFloat(lGet(loopObj, add));
              const newValue = parseFloat(newObj[newKey]);
              if (
                !isNaN(newAdd) &&
                !isNaN(newValue) &&
                ["+", "-", "/", "*"].includes(operation)
              ) {
                switch (operation) {
                  case "+":
                    newObj[newKey] = newValue + newAdd;
                    break;
                  case "-":
                    newObj[newKey] = newValue - newAdd;
                    break;
                  case "/":
                    newObj[newKey] = newValue / newAdd;
                    break;
                  case "*":
                    newObj[newKey] = newValue * newAdd;
                    break;
                  default:
                    break;
                }
              }

              return { ...acc, ...newObj };
            }, {}),
          };
        }

        if (!mainKey) {
          check.object = content;
        } else {
          set(check.object, mainKey, content);
        }

        replacedKey = replacedKey.replace(
          mappedRegex,
          `${mappedCallbacks[mappedKey](mainObj, foundKey)}`
        );
      } else if (mainObj && typeof mainObj === "object") {
        replacedKey = replacedKey.replace(
          mappedRegex,
          `${mappedCallbacks[mappedKey](mainObj, foundKey)}`
        );
      }
    }
  });

  return lGet(check.object, replacedKey);
};

export const getWithHtml = (object, key) => {
  const parts = key.split("@html.", 2);

  const currentObject = !parts[0] ? object : get(object, parts[0]);
  const html = parse(currentObject);

  // @html.span.main-price
  // megcsinalni, hogy megadhassunk script taget, amit parseol jsonkent
  // kiiratni teljes tombot gridkent, hogy az osszes sorat kiirathassuk ez is egy template fajta
  // html parsert bevinni cronba is
  // a cronnal lekezelni a dollarjelet a szambol

  return html?.querySelector(parts[1])?.childNodes?.[0].rawText;
};

window.moment = moment;

const momentFormatter = (value, [format]) => {
  if (!moment(value).isValid()) {
    return { value: "No" };
  }

  if (value > "2500-01-01 00:00:00") {
    return { value: "Yes" };
  }

  return { value: moment(value).format(format) };
};

const currencyFormatter = (value, [currency], isChart = false) => {
  const chartOptions = {
    maximumFractionDigits: 0,
  };
  return {
    value: new Intl.NumberFormat("hu-HU", {
      currency,
      style: "currency",
      ...(isChart ? chartOptions : {}),
    }).format(value),
  };
};

const percentFormatter = (value) => {
  return {
    value: new Intl.NumberFormat("hu-HU", {
      style: "percent",
    }).format(value / 100),
  };
};

const abbreviationFormatter = (givenValue = 0, suffixes) =>
  abbreviation(givenValue, 1, suffixes);

const abbreviation = (
  givenValue = 0,
  precision = 1,
  suffixes = ["", "K", "M"]
) => {
  if (!isFinite(givenValue)) {
    return { value: givenValue };
  }

  const value = parseFloat(givenValue);
  const flooredValue = Math.floor(value) || 0;
  const suffixNum = Math.floor(
    (`${flooredValue}`.length - (flooredValue < 0 ? 2 : 1)) / 3
  );
  let shortValue =
    suffixNum !== 0
      ? parseFloat((value / Math.pow(1000, suffixNum)).toPrecision(3))
      : value;
  if (shortValue % 1 !== 0) {
    shortValue = shortValue.toFixed(
      shortValue < 10 ? precision + 1 : precision
    );
  }
  const suffix =
    (typeof suffixes === "string"
      ? suffixes
      : suffixes?.[suffixNum] ?? suffixes?.[0]) ?? "";
  return { sourceValue: givenValue, value: shortValue, appendix: suffix };
};

export const formatters = {
  abbreviation: abbreviationFormatter,
  moment: momentFormatter,
  currency: currencyFormatter,
  percent: percentFormatter,
};

export const isTrue = (value) => value && value !== "0" && value !== "false";

export const shortHexToLongHex = (value) => {
  if (value?.match(/^#[0-9a-fA-F]{3}$/)) {
    return value.replace(/[0-9a-fA-F]{1}/g, (m) => m + m);
  }

  return value;
};

let isMobileWidthValue = window.innerWidth <= 1000;
let resizeSet = false;
export const isMobileWidth = () => {
  if (!resizeSet) {
    window.addEventListener(
      "resize",
      debounce(() => {
        isMobileWidthValue = window.innerWidth <= 1000;
      }, 100)
    );

    resizeSet = true;
  }

  return isMobileWidthValue;
};

export const roundToNextDecimal = (valueProp) => {
  const value = parseFloat(valueProp);
  if (isNaN(value)) {
    return;
  }
  return (
    Math.ceil(value / Math.pow(10, `${Math.ceil(value / 10)}`.length)) *
    Math.pow(10, `${Math.ceil(value / 10)}`.length)
  );
};

export const findKey = (object, findKey) => {
  return Object.keys(object).find((key) => new RegExp(`^${findKey}`).test(key));
};

export const getColorForPercentage = (perc) => {
  let r,
    g,
    b = 0;
  if (perc < 50) {
    r = 255;
    g = Math.round(5.1 * perc);
  } else {
    g = 255;
    r = Math.round(510 - 5.1 * perc);
  }
  const h = r * 0x10000 + g * 0x100 + b * 0x1;
  return "#" + ("000000" + h.toString(16)).slice(-6);
};

export const getDistance = (origin, destination) => {
  // return distance in meters
  const lon1 = toRadian(origin[1]);
  const lat1 = toRadian(origin[0]);
  const lon2 = toRadian(destination[1]);
  const lat2 = toRadian(destination[0]);

  const deltaLat = lat2 - lat1;
  const deltaLon = lon2 - lon1;

  const a =
    Math.pow(Math.sin(deltaLat / 2), 2) +
    Math.cos(lat1) * Math.cos(lat2) * Math.pow(Math.sin(deltaLon / 2), 2);
  const c = 2 * Math.asin(Math.sqrt(a));
  const EARTH_RADIUS = 6371;
  return c * EARTH_RADIUS * 1000;
};

const toRadian = (degree) => {
  return (degree * Math.PI) / 180;
};

export const isDatumEnableInChart = (datum) => {
  return (
    !isNaN(parseFloat(datum.value)) &&
    datum.formatter !== "map" &&
    isTrue(datum.today)
  );
};

export const getChartData = (data) => {
  return (data ?? []).filter((datum) => isDatumEnableInChart(datum));
};
