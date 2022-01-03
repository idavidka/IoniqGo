import Style from "../App.module.scss";
import Icon from "./Icon";
import { useState, useEffect, useRef, useCallback, createRef } from "react";
import { debounce } from "lodash";
import Loader from "./Loader";
import { getSiteUrl } from "../config";

function Backups({ backups, isLoggedIn, token }) {
  const groupsRef = useRef({});
  const [isLoading, setIsLoading] = useState(!backups);

  useEffect(() => {
    setIsLoading(!backups);
  }, [backups]);

  // eslint-disable-next-line react-hooks/exhaustive-deps
  const resize = useCallback(
    debounce(
      () => {
        const currentWindowWidth = window.innerWidth;
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

  const getGroups = useCallback(
    (groupedBackups) => {
      return groupedBackups.map((backup, index) => {
        const newGroup = {
          name: backup.label,
          id: backup.id,
          children: [],
        };

        newGroup.children = Object.keys(backup.days).map((day) => (
          <a
            href={`${getSiteUrl()}api/backups/${
              backup.name
            }/${day}?type=Bearer&token=${token}`}
            key={backup.id}
            className={Style.added}
            style={{ transitionDelay: (index + 1) * 200 }}
          >
            <Icon
              style={{ width: "1em", height: "1em" }}
              label={day}
              icon="MdBackup"
              foreground="white"
              background="black"
              noClick
              isSingle
            />
          </a>
        ));
        return newGroup;
      });
    },
    [token]
  );

  if (!isLoggedIn) {
    return <Loader />;
  }

  return (
    <div className={Style.Apps}>
      {isLoading ? (
        <Icon
          label="Loading"
          icon={() => <Loader iconStyle={{ fontSize: "1em" }} />}
          foreground="white"
          background="transparent"
          noClick
        />
      ) : (
        Object.entries(getGroups(backups)).map((entry) => {
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

export default Backups;
