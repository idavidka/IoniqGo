import { isNil } from "lodash";
import Style from "./Icon.module.scss";
import * as Gi from "react-icons/gi";
import { RiPrinterFill, RiBitCoinFill } from "react-icons/ri";
import { ImPrinter } from "react-icons/im";
import { SiRevolut } from "react-icons/si";
import { ReactComponent as Vivid } from "./icons/vivid.svg";
import { ReactComponent as CryptoCom } from "./icons/crcom.svg";
import { MdBackup } from "react-icons/md";

const Icons = {
  ...Gi,
  ImPrinter,
  RiPrinterFill,
  RiBitCoinFill,
  SiRevolut,
  Vivid,
  CryptoCom,
  MdBackup,
};

function Icon({
  label,
  app,
  link,
  icon,
  noClick,
  background,
  foreground,
  details,
  isSingle,
  ...rest
}) {
  const onClick = noClick
    ? undefined
    : (e) => {
        if (app) {
          e.preventDefault();

          document.location = app;

          if (link) {
            const time = new Date().getTime();

            new Promise((resolve, reject) => {
              setTimeout(function () {
                const now = new Date().getTime();
                if (now - time < 2500 && document.hasFocus()) {
                  reject();
                } else {
                  resolve();
                }
              }, 2000);
            }).catch(() => {
              document.location = link;
            });
          }
        }

        if (!app && !link) {
          e.preventDefault();
        }
      };

  const CustomIcon =
    typeof icon === "string" ? Icons[icon] || null : icon || null;

  return noClick ? (
    <div className={Style.Container}>
      <div
        className={`${Style.Icon} ${isSingle ? Style.Single : Style.Double}`}
        style={{
          background: background ?? null,
          color: foreground ?? null,
        }}
      >
        <CustomIcon {...rest} />
        {details?.length &&
          details.map((detail, index) => {
            if (!detail.value && detail.hiddenElse) {
              return null;
            }

            return (
              <div className={Style.detail} key={index}>
                <span className={Style.label} title={detail.label}>
                  {detail.label}
                </span>
                {!isNil(detail.value) && (
                  <span className={Style.value}>
                    {detail.value}{" "}
                    <span className={Style.appendix}>
                      {!isNil(detail.value) && detail.appendix
                        ? ` ${detail.appendix}`
                        : ""}
                    </span>
                  </span>
                )}
                {detail.valueLoader && (
                  <span className={Style.valueLoader}>
                    {detail.valueLoader}
                  </span>
                )}
              </div>
            );
          })}
      </div>
      <label className={Style.Label}>{label}</label>
    </div>
  ) : (
    <a
      href={link || "#"}
      target="_blank"
      rel="noreferrer"
      onClick={onClick}
      className={Style.Container}
    >
      <div
        className={`${Style.Icon} ${isSingle ? Style.Single : Style.Double}`}
      >
        <CustomIcon />
      </div>
      <label className={Style.Label}>{label}</label>
    </a>
  );
}

export default Icon;
