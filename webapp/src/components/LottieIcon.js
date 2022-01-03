import { Player } from "@lottiefiles/react-lottie-player";
import { getColors, replaceColor } from "lottie-colorify";
import * as Icons from "./LottieIcons";
import toHex from "colornames";
import { shortHexToLongHex } from "../utils";

function LottieIcon({ name, colors, ...props }) {
  if (colors && !Array.isArray(colors)) {
    colors = [colors];
  }

  if (!Icons[name]) {
    console.warn(`Missing icon: ${name}`);
    return null;
  }

  let Icon = Icons[name];
  if (colors) {
    const lottieColors = getColors(Icons[name]);
    Icon = colors.reduce(
      (acc, curr, index) =>
        replaceColor(
          lottieColors[index],
          toHex(curr) ?? shortHexToLongHex(curr),
          acc
        ),
      Icons[name]
    );
  }

  return (
    <Player
      autoplay
      src={Icon}
      speed="1"
      {...props}
      style={{
        ...(props.style ?? {}),
      }}
    />
  );
}

export const getSrc = (name) => Icons[name];

export default LottieIcon;
