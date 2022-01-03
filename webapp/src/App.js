import Style from "./App.module.scss";
import {
  BrowserRouter as Router,
  Redirect,
  Route,
  Switch,
} from "react-router-dom";
import Apps from "./components/Apps";
import Actions from "./components/Actions";
import Backups from "./components/Backups";
import { useState, useEffect, useCallback, useMemo } from "react";
import ActionRun from "./components/ActionRun";
import { DISABLE_AUTHORIZATION, ENABLED_PAGES, getSiteUrl } from "./config";
import sha1 from "sha1";
import ls from "local-storage";
import LottieIcon from "./components/LottieIcon";
import { getPagePath, getPageUrl } from "./utils";
import PullToRefresh from "react-simple-pull-to-refresh";
import LoaderWhite from "./components/Loader-White";
import { NavTab } from "react-router-tabs";

function App() {
  // const [credentials, setCredentials] = useState({ username: null, key: null });
  const [token, setToken] = useState(ls("token") ?? "");
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [runners, setRunners] = useState(ls("runners"));
  const [apps, setApps] = useState(ls("apps"));
  const [backups, setBackups] = useState(ls("backups"));
  const [fullScreen, setIsFullScreen] = useState(false);

  const queryString = useMemo(
    () => new URLSearchParams(window.location.search),
    []
  );

  const handleToken = useCallback((data) => {
    setIsLoggedIn(data?.token ? true : false);
    setToken(data?.token ?? null);
    ls("token", data?.token ?? "");
  }, []);

  const credentials = useMemo(() => {
    const checkRegex = new RegExp(
      `^/auth/(?<username>[a-zA-Z0-9]+)/(?<key>[a-zA-Z0-9]+)(?<path>/?$|/(${Object.values(
        ENABLED_PAGES
      ).join("|")}).*$)`
    );
    const checkCredentials = window.location.pathname.match(checkRegex)?.groups;
    if (queryString.get("username") && queryString.get("key")) {
      return {
        username: queryString.get("username"),
        key: queryString.get("key"),
        path: window.location.pathname,
      };
    } else if (checkCredentials?.username && checkCredentials?.key) {
      return {
        username: checkCredentials?.username,
        key: checkCredentials?.key,
        path: checkCredentials?.path,
      };
    }

    return { path: window.location.pathname };
  }, [queryString]);

  const setFullScreen = useCallback((state) => {
    if (state) {
      document.body.classList.add(Style.fullScreen);
    } else {
      document.body.classList.remove(Style.fullScreen);
    }
    setTimeout(() => {
      setIsFullScreen(state);
      window.dispatchEvent(new Event("resize"));
    }, 100);
  }, []);

  useEffect(() => {
    document.body.addEventListener("mousedown", console.log);
    document.body.addEventListener("mouseup", console.log);
  }, []);

  useEffect(() => {
    ls("lastFetched", null);
    if (
      (DISABLE_AUTHORIZATION || (credentials?.username && credentials?.key)) &&
      !token
    ) {
      fetch(`${getSiteUrl()}api/auth`, {
        method: "POST",
        body: JSON.stringify(
          DISABLE_AUTHORIZATION
            ? {}
            : {
                username: credentials.username,
                key: sha1(credentials.key),
              }
        ),
      })
        .then((resp) => resp.json())
        .then(handleToken)
        .catch(handleToken);
    } else if (token) {
      fetch(`${getSiteUrl()}api/runners`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      })
        .then((resp) => resp.json())
        .then((data) => {
          if (data.status === 200 && data.runners) {
            setIsLoggedIn(true);
            setRunners(data.runners ?? []);
            ls("runners", data.runners ?? []);
          } else {
            handleToken();
          }
        })
        .catch(handleToken);
      fetch(`${getSiteUrl()}api/apps`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      })
        .then((resp) => resp.json())
        .then((data) => {
          if (data.status === 200 && data.apps) {
            setIsLoggedIn(true);
            setApps(data.apps ?? []);
            ls("apps", data.apps ?? []);
          } else {
            handleToken();
          }
        })
        .catch(handleToken);
      fetch(`${getSiteUrl()}api/backups`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      })
        .then((resp) => resp.json())
        .then((data) => {
          if (data.status === 200 && data.backups) {
            setIsLoggedIn(true);
            setBackups(data.backups ?? []);
            ls("backups", data.backups ?? []);
          } else {
            handleToken();
          }
        })
        .catch(handleToken);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  return (
    <div
      className={Style.App}
      // onMouseDown={handleMouse}
      // onTouchStart={handleMouse}
      // onMouseUp={handleMouse}
      // onTouchEnd={handleMouse}
    >
      {!isLoggedIn && (
        <>
          <h1>Login required</h1>
          <LottieIcon name="Failed" keepLastFrame />
        </>
      )}
      <PullToRefresh
        onRefresh={() => setTimeout(() => window.location.reload(), 1000)}
        className={Style.PTR}
        isPullable={!fullScreen}
        pullingContent={
          <div style={{ textAlign: "center", padding: 10 }}>
            Pull to refresh
          </div>
        }
        refreshingContent={
          <LoaderWhite style={{ width: 50, height: 50, margin: "5px auto" }} />
        }
      >
        {isLoggedIn && (
          <Router>
            <div className={Style.titles}>
              {runners?.length > 1 ? (
                <NavTab
                  activeClassName={Style.active}
                  to={getPageUrl(ENABLED_PAGES.actions, credentials)}
                >
                  Actions
                </NavTab>
              ) : null}
              {apps?.length ? (
                <NavTab
                  activeClassName={Style.active}
                  to={getPageUrl(ENABLED_PAGES.apps, credentials)}
                >
                  Apps
                </NavTab>
              ) : null}
              {backups?.length ? (
                <NavTab
                  activeClassName={Style.active}
                  to={getPageUrl(ENABLED_PAGES.backups, credentials)}
                >
                  Backups
                </NavTab>
              ) : null}
            </div>
            <Switch>
              <Route
                path={getPagePath(
                  ENABLED_PAGES.actions,
                  credentials,
                  ":action/:state?"
                )}
                render={(props) => {
                  const selectedRunner = runners?.find(
                    (runner) => runner.key === props.match?.params?.action
                  );

                  if (runners && !selectedRunner) {
                    return (
                      <Redirect
                        to={getPageUrl(ENABLED_PAGES.actions, credentials)}
                      />
                    );
                  }

                  return (
                    <ActionRun
                      runner={selectedRunner}
                      isLoggedIn={isLoggedIn}
                      isDone={props.match?.params?.state === "done"}
                      token={token}
                      credentials={credentials}
                      fullScreen={fullScreen}
                      setFullScreen={setFullScreen}
                    />
                  );
                }}
              />
              <Route path={getPagePath(ENABLED_PAGES.apps, credentials)}>
                <Apps isLoggedIn={isLoggedIn} apps={apps} />
              </Route>
              <Route path={getPagePath(ENABLED_PAGES.backups, credentials)}>
                <Backups
                  backups={backups}
                  isLoggedIn={isLoggedIn}
                  credentials={credentials}
                  token={token}
                />
              </Route>
              <Route
                path={getPagePath("", credentials).concat(
                  getPagePath(ENABLED_PAGES.actions, credentials)
                )}
              >
                <Actions
                  runners={runners}
                  isLoggedIn={isLoggedIn}
                  credentials={credentials}
                  token={token}
                />
              </Route>
            </Switch>
          </Router>
        )}
      </PullToRefresh>
    </div>
  );
}

export default App;
