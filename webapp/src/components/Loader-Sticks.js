import PropTypes from "prop-types";
import Style from "./Loader.module.scss";
import LottieIcon from "./LottieIcon";

export function Loader({
  label,
  hidden = false,
  className = "",
  iconClassName = "",
  iconStyle = {},
  ...props
}) {
  return hidden ? null : (
    <div className={`${Style.loader} ${className}`} {...props}>
      <span className={Style.title}>{label}</span>
      <LottieIcon name="LoadingSticks" loop />
    </div>
  );
}

Loader.propTypes = {
  label: PropTypes.string,
  hidden: PropTypes.bool,
  className: PropTypes.string,
  iconClassName: PropTypes.string,
};

export default Loader;
