import PropTypes from "prop-types";
import Style from "./Loader.module.scss";
import LottieIcon, { getSrc } from "./LottieIcon";

export function Loader({
  label,
  hidden = false,
  className = "",
  iconClassName = "",
  ...props
}) {
  return hidden ? null : (
    <div className={`${Style.loader} ${className}`} {...props}>
      <span className={Style.title}>{label}</span>
      <LottieIcon {...props} name="Loading" loop />
    </div>
  );
}

Loader.propTypes = {
  label: PropTypes.string,
  hidden: PropTypes.bool,
  className: PropTypes.string,
  iconClassName: PropTypes.string,
};

export const LoaderJSON = getSrc("Loading");

export default Loader;
