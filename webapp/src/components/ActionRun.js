import { debounce, isNil, last, uniqBy } from "lodash";
import { useEffect, useState, useCallback, useRef, useMemo } from "react";
import { Link, Redirect } from "react-router-dom";
import Style from "../App.module.scss";
import { ENABLED_PAGES, getSiteUrl } from "../config";
import useTemplates from "../hooks/use-templates";
import {
  getChartData,
  getPageUrl,
  isDatumEnableInChart,
  isLocalhost,
  isTrue,
} from "../utils";
import ActionChart, { chartColors } from "./ActionChart";
import Loader from "./Loader";
import LottieIcon from "./LottieIcon";
import Map from "./Map";

const TIMER = 60;
function ActionRun({
  runner,
  isLoggedIn,
  token,
  credentials,
  isDone,
  fullScreen,
  setFullScreen,
}) {
  const [commandState, setCommandState] = useState(!isDone && "loading");
  const [signalController, setSignalController] = useState(null);
  const [responses, setResponses] = useState(null);
  const [mapTop, setMapTop] = useState(0);
  const responsesRef = useRef(null);
  // const [templates, setTemplates] = useState([]);
  const periodicalCounter = useRef(0);
  const launch = useRef();
  const secLeft = useRef(TIMER);
  const [time, setTime] = useState(TIMER);
  const [canMoveBack, setCanMoveBack] = useState(false);
  const [runnerData, setRunnerData] = useState({
    data: runner?.data ?? [],
    dataMax: runner?.dataMax ?? {},
    dataMin: runner?.dataMin ?? {},
  });

  const { templates, parseTemplates } = useTemplates();

  const setAll = useCallback(
    (state) => {
      setCommandState(state);
      setTimeout(() => setMapTop(!fullScreen ? window.scrollY : 0), 10);
    },
    [fullScreen]
  );

  const templateColors = useMemo(() => {
    const colors = uniqBy(
      (runner?.data ?? []).filter((curr) => isDatumEnableInChart(curr)),
      "template_id"
    ).reduce((acc, curr, index) => {
      return {
        ...acc,
        [curr.template_id]: chartColors[index % chartColors.length],
      };
    }, {});

    return colors;
  }, [runner?.data]);

  const decrement = useCallback(() => {
    if (secLeft.current > 0) {
      secLeft.current--;
      setTime(secLeft.current);

      if (secLeft.current <= 0) {
        clearInterval(launch.current);
        setCanMoveBack(true);
      }
    }
  }, [secLeft]);

  useEffect(() => {
    const resize = debounce(() => setMapTop(window.scrollY), 100, {
      trailing: true,
    });

    window.addEventListener("scroll", resize);

    return () => window.removeEventListener("scroll", resize);
  }, []);

  const runAction = useCallback(
    (next = null, inBackground = false, counter = 0) => {
      if (!runner || !isLoggedIn || !token) {
        return Promise.reject();
      }

      if (commandState !== "executing") {
        setAll(!inBackground ? "executing" : "executing-background");
      }

      const controller = new AbortController();
      const signal = controller.signal;

      setSignalController(controller);

      return fetch(
        `${getSiteUrl()}api/runner/${runner.key}?async=1${
          inBackground
            ? `&periodicalCounter=${counter}&update=1&count=${runner?.data?.length}`
            : ""
        }`,
        {
          signal,
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`,
          },
          ...(next ? { body: JSON.stringify({ next }) } : {}),
        }
      )
        .then((resp) => resp.json())
        .then((data) => {
          concatResponses(data.responses, !!next, {
            main: {
              status: data.status,
              statusText: data.statusText,
            },
          });

          if (data.runner.data?.length) {
            setRunnerData({
              data: data.runner.data,
              dataMax: data.runner.dataMax ?? {},
              dataMin: data.runner.dataMin ?? {},
            });
          }

          if (data.status === 200) {
            setAll(data.next ? "executing-next" : "executed");
          } else {
            setAll("failed");
          }

          if (!data.next) {
            startTimer();
          } else {
            runAction(data.next);
          }
        })
        .catch((e) => {
          console.error(e);
          responsesRef.current = null;
          setResponses(null);
          setAll("failed");
          startTimer();
        });
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [runner]
  );
  const periodicalFetch = useCallback(() => {
    if (secLeft.current > 0) {
      secLeft.current--;
      setTime(secLeft.current);
    } else if (secLeft.current <= 0) {
      runAction(null, true, periodicalCounter.current++);
      clearInterval(launch.current);
      secLeft.current = 10;
      launch.current = setInterval(periodicalFetch, 1000);
    }
  }, [runAction]);

  const startTimer = useCallback(() => {
    if (!isTrue(runner?.single)) {
      clearInterval(launch.current);
      launch.current = setInterval(decrement, 1000);
    } else if (isTrue(runner?.periodical)) {
      clearInterval(launch.current);
      secLeft.current = 10;
      launch.current = setInterval(periodicalFetch, 1000);
    }
  }, [decrement, periodicalFetch, runner?.periodical, runner?.single]);

  const resetTimer = useCallback(() => {
    clearInterval(launch.current);
    secLeft.current = TIMER;
    setTime(secLeft.current);
  }, [secLeft]);

  useEffect(() => {
    return () => {
      clearInterval(launch.current);
    };
  }, []);

  const concatResponses = useCallback(
    (newResponses, shouldDo = false, spread = {}) => {
      const updatedResponses = (
        shouldDo && responsesRef.current ? responsesRef.current : []
      )
        .concat(Object.values(newResponses ?? {}))
        .map((response) => ({
          ...response,
          ...spread,
        }));
      responsesRef.current = updatedResponses;
      setResponses(updatedResponses);
    },
    []
  );

  useEffect(() => {
    if (runner && commandState === "loading") {
      parseTemplates();
      runAction();
    } else if (
      runner &&
      ["executing-next", "executing-background", "executed", "failed"].includes(
        commandState
      )
    ) {
      parseTemplates(responses, runner.templates);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [commandState, parseTemplates, responses, runAction, runner]);

  const isDark = useCallback((index, template) => {
    if (index % 2) {
      return true;
    }

    return false;
  }, []);

  const dataPack = useMemo(() => {
    return {
      min: runnerData.dataMin,
      max: runnerData.dataMax,
      data: runnerData.data,
    };
  }, [runnerData.data, runnerData.dataMax, runnerData.dataMin]);

  const chartData = useMemo(() => getChartData(dataPack.data), [dataPack.data]);

  const mainLevelTemplates = useMemo(
    () =>
      templates.reduce(
        (acc, curr) => ({
          ...acc,
          [curr.templateId]: curr,
        }),
        {}
      ),
    [templates]
  );
  const mapData = useMemo(() => {
    const payloads = {};
    const data = (dataPack.data ?? []).reduce((acc, datum) => {
      if (!payloads[datum.time]) {
        payloads[datum.time] = {};
      }

      const templateLabel =
        mainLevelTemplates[datum.template_id]?.label ?? datum.template_id;

      // TODO ide jon hogy az uj valuet is parsoljuk
      payloads[datum.time][templateLabel] = {
        ...mainLevelTemplates[datum.template_id],
        value: datum.value,
      };

      if (datum.formatter !== "map") {
        return acc;
      }
      return [
        ...acc,
        {
          value: datum.value.split(","),
          time: datum.time,
          today: isTrue(datum.today),
          payload: payloads[datum.time],
        },
      ];
    }, []);

    const newData = [];
    data.forEach((datum, index) => {
      const nextDatum = data[index + 1];
      if (!datum?.payload?.["Charging type"]) {
        newData.push(datum);
        return;
      }

      if (!nextDatum?.payload?.["Charging type"]) {
        newData.push({ hasCharging: true, ...datum });
      }
    });

    return newData;
  }, [dataPack.data, mainLevelTemplates]);

  const onClickMap = useCallback(
    (map) => {
      const { value: center } = last(mapData);
      setMapTop(!fullScreen ? window.scrollY : 0);
      setFullScreen(!fullScreen);
      setTimeout(() => map.setView(center, 13), 200);
    },
    [fullScreen, mapData, setFullScreen]
  );

  const renderTemplates = useCallback(
    (templateArray, counter = { index: 0 }) => {
      return (templateArray ?? templates).map((template) => {
        if (template.hidden) {
          return null;
        }
        counter.index++;

        return (
          <div
            key={template.id}
            className={`${Style.templateWrapper} ${
              isDark(counter.index, template) ? Style.dark : ""
            }`}
          >
            <div
              className={`${Style.template} ${
                template.level > 0
                  ? `${Style.childTemplate} ${Style[`level-${template.level}`]}`
                  : ""
              } ${Style[template.formatter]}`}
              style={{ color: templateColors[template?.templateId] ?? null }}
              key={template.label}
            >
              {template.formatter === "map" ? (
                <Map
                  onClick={onClickMap}
                  noControl={!fullScreen}
                  style={{ top: fullScreen ? mapTop : null }}
                  fullSize={fullScreen}
                  data={mapData}
                />
              ) : (
                <>
                  <span className={Style.label}>{template.label}</span>
                  <span className={Style.value}>
                    {template.value}
                    <span className={Style.appendix}>
                      {!isNil(template.value) && template.appendix
                        ? ` ${template.appendix}`
                        : ""}
                    </span>
                  </span>
                </>
              )}
            </div>
            {template.children?.length > 0
              ? renderTemplates(template.children, counter)
              : null}
          </div>
        );
      });
    },
    [fullScreen, isDark, mapData, mapTop, onClickMap, templateColors, templates]
  );

  if (
    commandState === "executing" &&
    !isDone &&
    !isLocalhost() &&
    !isTrue(runner.single)
  ) {
    return (
      <Redirect
        to={getPageUrl(
          ENABLED_PAGES.actions,
          credentials,
          `${runner.key}/done`
        )}
      />
    );
  }

  if (canMoveBack || !commandState) {
    return <Redirect to={getPageUrl(ENABLED_PAGES.actions, credentials)} />;
  }

  if (!isLoggedIn) {
    return <Loader />;
  }

  return (
    <div className={`${Style.Action}`}>
      {runner ? (
        <h2>
          <span>
            {["executing-next", "executing-background", "executing"].includes(
              commandState
            )
              ? "Executing"
              : ""}{" "}
            "
          </span>
          {runner.groupName ? runner.groupName + " / " : ""}
          {runner.name}
          <span>
            "{" "}
            {["executed", "failed"].includes(commandState) ? commandState : ""}
          </span>
        </h2>
      ) : (
        <h2>Loading</h2>
      )}
      {[
        "executing-next",
        "executing-background",
        "executing",
        "loading",
      ].includes(commandState) && <Loader />}
      {commandState === "executed" && (
        <LottieIcon name="Success" keepLastFrame />
      )}
      {commandState === "failed" && <LottieIcon name="Failed" keepLastFrame />}

      <div className={Style.templates}>{renderTemplates()}</div>

      {chartData.length &&
      ["executing-background", "executed"].includes(commandState) ? (
        <div className={Style.chart}>
          <ActionChart
            data={chartData}
            dataMax={dataPack.max}
            dataMin={dataPack.min}
            templates={runner.templates}
            color={templateColors}
          />
        </div>
      ) : null}

      <div className={Style.buttons}>
        <Link
          to={getPageUrl(ENABLED_PAGES.actions, credentials)}
          onClick={() => signalController?.abort?.()}
        >
          {["executed", "failed"].includes(commandState)
            ? "Back to actions" + (isTrue(runner.single) ? "" : `in ${time}s`)
            : "Cancel"}
        </Link>
        {["executed", "failed"].includes(commandState) && (
          <button
            style={{
              opacity: isTrue(runner.periodical) ? 1 : time / TIMER,
            }}
            onClick={() => {
              resetTimer();
              setAll("loading");
            }}
          >
            Run again {!isTrue(runner.periodical) ? "" : `in ${time}s`}
          </button>
        )}
      </div>
    </div>
  );
}

export default ActionRun;
