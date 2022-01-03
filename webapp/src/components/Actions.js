import Style from "../App.module.scss";
import Icon from "./Icon";
import { Link, Redirect, useHistory } from "react-router-dom";
import { useState, useEffect, useRef, useCallback, createRef } from "react";
import { getChartData, getPageUrl } from "../utils";
import { ENABLED_PAGES, FETCH_INTERVAL, getSiteUrl } from "../config";
import { debounce, isEmpty } from "lodash";
import ls from "local-storage";
import { parseTemplatesUtil } from "../hooks/use-templates";
import Loader from "./Loader";
import ActionChart from "./ActionChart";

function Actions({ runners, credentials, isLoggedIn, token }) {
  const groupsRef = useRef({});
  const browserHistory = useHistory();
  const onDemandFetchings = useRef({});
  const onDemandsRef = useRef({});
  const [onDemands, setOnDemands] = useState(
    ls("lastFetched") && ls("onDemands") ? ls("onDemands") : {}
  );
  const [lastFetched, setLastFetched] = useState(ls("lastFetched") ?? null);
  const [isLoading, setIsLoading] = useState(!runners);
  const [windowWidth, setWindowWidth] = useState(window.innerWidth);

  // eslint-disable-next-line react-hooks/exhaustive-deps
  const resize = useCallback(
    debounce(
      () => {
        const currentWindowWidth = window.innerWidth;
        setWindowWidth(currentWindowWidth);
        Object.values(groupsRef.current).forEach((groupRef) => {
          if (!groupRef?.current?.style) {
            return;
          }

          groupRef.current.style.width = null;
          if (currentWindowWidth >= 1000) {
            groupRef.current.style.width = `${groupRef.current.scrollWidth}px`;
          }
        });
      },
      50,
      { trailing: true }
    ),
    []
  );

  useEffect(() => {
    window.addEventListener("resize", resize);

    setTimeout(() => resize(), 0);
    setTimeout(() => resize(), 200);
    setTimeout(() => resize(), 500);

    return () => window.removeEventListener("resize", resize);
  }, [resize]);

  const fetchOnDemands = useCallback(
    (runners) => {
      runners.forEach((runner, index) => {
        if (!runner.onDemand) {
          return;
        }

        if (
          !onDemandFetchings.current[runner.onDemand.runner_key] &&
          !onDemandsRef.current[runner.onDemand.runner_key] &&
          (!lastFetched || parseInt(lastFetched) < Date.now() - FETCH_INTERVAL)
        ) {
          const last = Date.now();
          ls("lastFetched", last);
          setLastFetched(last);
          onDemandFetchings.current[runner.onDemand.runner_key] = new Promise(
            (resolve, reject) => {
              setTimeout(() => {
                fetch(
                  `${getSiteUrl()}api/onDemand/${runner.key}/${
                    runner.onDemand.runner_key
                  }`,
                  {
                    method: "POST",
                    headers: {
                      Authorization: `Bearer ${token}`,
                    },
                  }
                )
                  .then((resp) => resp.json())
                  .then((data) => {
                    if (data.status !== 200 || !data.responses) {
                      reject();
                    } else {
                      resolve(
                        Object.values(data.responses).map((response) => ({
                          ...response,
                          main: {
                            status: data.status,
                            statusText: data.statusText,
                          },
                        }))
                      );
                    }
                  })
                  .catch((e) => {
                    // console.err(e);
                    reject();
                  });
              }, index * 500 + parseInt(runner.onDemand.delay));
            }
          )
            .then((data) => {
              onDemandsRef.current = {
                ...onDemandsRef.current,
                [runner.onDemand.runner_key]: data,
              };
              ls("onDemands", onDemandsRef.current);
              setOnDemands(onDemandsRef.current);
            })
            .catch(() => {
              onDemandsRef.current = {
                ...onDemandsRef.current,
                [runner.onDemand.runner_key]: null,
              };
              ls("onDemands", onDemandsRef.current);
              setOnDemands(onDemandsRef.current);
            });
        }
      });
    },
    [lastFetched, token]
  );

  const getOnDemand = useCallback(
    (runnerKey, onDemandRunner, color) => {
      if (!onDemandRunner) {
        return null;
      }

      let value = null;
      if (
        onDemands[runnerKey] !== undefined &&
        parseInt(lastFetched) > Date.now() - FETCH_INTERVAL
      ) {
        const templates = parseTemplatesUtil(
          onDemands[runnerKey],
          [onDemandRunner],
          true
        );

        value = templates[0];
      }

      return (
        value ?? {
          label: onDemandRunner.label,
          valueLoader: <Loader colors={color} />,
        }
      );
    },
    [lastFetched, onDemands]
  );

  const getGroups = useCallback(
    (groupedRunners) => {
      const groups = {};
      groupedRunners.forEach((runner, index) => {
        const groupId = runner.group
          ? `g${runner.group}`
          : windowWidth >= 1000
          ? 0
          : `i${runner.order}`;
        if (!groups[groupId]) {
          groups[groupId] = {
            name: runner.groupName ?? "\u00A0",
            id: runner.group,
            children: [],
          };
        }

        const chartData = getChartData(runner.data);

        groups[groupId].children.push(
          <Link
            onClick={(e) => {
              if (runner.single !== "1") {
                e.preventDefault();
              }
            }}
            onDoubleClick={(e) => {
              if (runner.single !== "0") {
                e.preventDefault();
              } else {
                browserHistory.push(
                  getPageUrl(ENABLED_PAGES.actions, credentials, runner.key)
                );
              }
            }}
            to={getPageUrl(ENABLED_PAGES.actions, credentials, runner.key)}
            key={runner.key}
            className={Style.added}
            style={{ transitionDelay: (index + 1) * 200 }}
          >
            {chartData?.length ? (
              <div
                className={Style.IconChart}
                style={{ background: runner.background }}
              >
                <ActionChart
                  data={chartData}
                  dataMax={runner.dataMax}
                  dataMin={runner.dataMin}
                  color={runner.foreground}
                  isIcon
                />
              </div>
            ) : null}
            <Icon
              style={{ width: "1em", height: "1em" }}
              label={runner.name}
              icon={runner.icon}
              foreground={runner.foreground}
              background={runner.background}
              noClick
              isSingle={runner.single === "1"}
              details={runner.onDemand?.templates?.map((template) =>
                getOnDemand(
                  runner.onDemand?.runner_key,
                  template,
                  runner.foreground
                )
              )}
            />
          </Link>
        );
      });

      return groups;
    },
    [browserHistory, credentials, getOnDemand, windowWidth]
  );

  useEffect(() => {
    setIsLoading(!runners);

    if (runners && token && isEmpty(onDemandFetchings.current)) {
      fetchOnDemands(runners);
    }
  }, [fetchOnDemands, runners, token]);

  if (runners?.length === 1) {
    return (
      <Redirect
        to={getPageUrl(ENABLED_PAGES.actions, credentials, runners[0].key)}
      />
    );
  }

  if (!isLoggedIn) {
    return <Loader />;
  }

  return (
    <div className={Style.Apps}>
      {runners?.length > 1 ? (
        <Link to={getPageUrl(ENABLED_PAGES.apps, credentials)}>
          <Icon
            label="Home apps"
            icon="GiHouse"
            foreground="white"
            background="linear-gradient(147deg, rgba(249,15,216,1) 0%, rgba(245,67,119,1) 26%, rgba(252,28,28,1) 50%, rgba(255,195,13,1) 75%, rgba(114,251,89,1) 100%)"
            noClick
          />
        </Link>
      ) : null}
      {isLoading ? (
        <Icon
          label="Loading"
          icon={() => <Loader iconStyle={{ fontSize: "1em" }} />}
          foreground="white"
          background="transparent"
          noClick
        />
      ) : (
        Object.entries(getGroups(runners)).map((entry) => {
          groupsRef.current[entry[0]] = createRef();

          return (
            <div
              ref={groupsRef.current[entry[0]]}
              className={Style.Group}
              groupid={entry[1].id > 0 ? entry[1].id : null}
              key={entry[0]}
            >
              {entry[1].name && (
                <div className={Style.GroupName}>{entry[1].name}</div>
              )}
              <div className={Style.GroupItems}>{entry[1].children}</div>
            </div>
          );
        })
      )}
    </div>
  );
}

export default Actions;
