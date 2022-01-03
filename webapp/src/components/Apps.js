import { useEffect, useState } from "react";
import Style from "../App.module.scss";
import Icon from "./Icon";
import Loader from "./Loader";

function Apps({ apps, isLoggedIn }) {
  const [isLoading, setIsLoading] = useState(!apps);
  useEffect(() => {
    setIsLoading(!apps);
  }, [apps]);

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
        apps.map((app, index) => (
          <Icon
            style={{ width: "1em", height: "1em" }}
            key={index}
            label={app.label}
            link={app.link}
            app={app.app}
            icon={app.icon}
          />
        ))
      )}
    </div>
  );
}

export default Apps;
