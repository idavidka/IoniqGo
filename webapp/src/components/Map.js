import { chunk, findLast, isNil, last } from "lodash";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  MapContainer,
  TileLayer,
  Marker,
  Popup,
  Polyline,
  useMapEvents,
} from "react-leaflet";
import Leaflet from "leaflet";
import "leaflet.heat";
import "leaflet-routing-machine";
import { getColorForPercentage, getDistance } from "../utils";
import Style from "./Map.module.scss";
import YellowIcon from "./icons/marker-yellow.svg";
import GreenIcon from "./icons/marker-green.svg";
import BlueIcon from "./icons/marker-blue.svg";
import RedIcon from "./icons/marker-red.svg";
import moment from "moment";

const controlsInstance = Leaflet.Control.extend({
  options: {
    position: "topright",
  },

  onAdd: function (map) {
    const container = Leaflet.DomUtil.create("div");
    container.setAttribute("class", "leaflet-bar leaflet-control");

    const closeButton = Leaflet.DomUtil.create("a");
    closeButton.href = "#";
    closeButton.title = "Close";
    closeButton.innerHTML = "Close";
    closeButton.classList.add(Style.closeButton);

    closeButton.onclick = (e) => {
      e.preventDefault();
      this.options?.onClicks?.close?.(map);
    };
    container.append(closeButton);

    // const snapButton = Leaflet.DomUtil.create("a");
    // snapButton.href = "#";
    // snapButton.title = "Snap to road";
    // snapButton.innerHTML = "Snap to road";
    // snapButton.classList.add(Style.snapButton);

    // snapButton.onclick = (e) => {
    //   e.preventDefault();
    //   this.options?.onClicks?.snap?.(map);
    // };
    // container.append(snapButton);

    return container;
  },
});

function MapController({ noControl, center, heatmapData, onClicks }) {
  const lastCenter = useRef();
  const heatmapLayer = useRef();
  const map = useMapEvents({
    // click: () => {
    //   onClick?.(map);
    // },
    locationfound: (location) => {
      console.log("location found:", location);
    },
  });
  const controlsContainer = useMemo(
    () =>
      new controlsInstance({
        position: "topright",
        onClicks,
      }),
    [onClicks]
  );

  useEffect(() => {
    if (lastCenter.current !== JSON.stringify(center)) {
      lastCenter.current = JSON.stringify(center);
      map.setView(center);
    }
  }, [center, map]);

  useEffect(() => {
    const method = noControl ? "disable" : "enable";
    map.scrollWheelZoom[method]?.();
    map.dragging[method]?.();
    map.zoomControl[method]?.();

    if (!noControl) {
      map.addControl(controlsContainer);
    } else {
      map.removeControl(controlsContainer);
    }

    return () => {
      map?.removeControl(controlsContainer);
    };
  }, [noControl, map, controlsContainer]);

  useEffect(() => {
    if (heatmapData?.length) {
      heatmapLayer.current?.removeFrom(map);
      heatmapLayer.current = Leaflet.heatLayer(heatmapData).addTo(map);
    } else {
      heatmapLayer.current?.removeFrom(map);
    }
  }, [heatmapData, map]);

  return null;
}

const Map = ({
  onClick,
  className = "",
  noControl = false,
  width = null,
  height = null,
  data = [],
  fullSize = false,
  style = {},
}) => {
  const [map, setMap] = useState();
  // const linesRenderer = useRef();
  // const [selectedSegment, setSelectedSegment] = useState("");
  const linesRef = useRef({});
  const linesCoordsRef = useRef({});
  const routedLines = useRef({});
  const controlsRef = useRef([]);
  const markersRef = useRef({});
  const speedMinMax = useMemo(() => {
    const minMax = { min: 0, max: 0 };

    data.forEach(({ payload }) => {
      const absSpeed = Math.abs(parseInt(payload.Speed.value));
      if (absSpeed < minMax.min) {
        minMax.min = absSpeed;
      }
      if (absSpeed > minMax.max) {
        minMax.max = absSpeed;
      }
    });

    return minMax;
  }, [data]);

  const getSpeedPercent = useCallback(
    (speed) => {
      const absSpeed = Math.abs(parseInt(speed));

      return absSpeed / ((speedMinMax.max - speedMinMax.min) / 100);
    },
    [speedMinMax.max, speedMinMax.min]
  );

  const heatmapData = useMemo(() => {
    return data.map(({ value }) => [
      parseFloat(value[0]),
      parseFloat(value[1]),
    ]);
  }, [data]);

  const polygonData = useMemo(() => {
    const newData = [];

    let segment = 0;
    data.forEach(({ value, time, hasCharging, payload, today }, index) => {
      if (!today) {
        return;
      }
      const prevData = data[index - 1];
      const nextData = data[index + 1];
      const newPoint =
        !prevData || moment(time).diff(prevData.time, "minute") > 5;
      const lastPoint =
        !nextData || moment(nextData.time).diff(time, "minute") > 5;

      if (newPoint) {
        segment++;
      }

      const segmentId = `segment-${segment}`;
      const newDatum = {
        payload,
        time,
        id: segmentId,
        percent: getSpeedPercent(payload.Speed.value),
        markerColor: hasCharging
          ? "yellow"
          : newPoint || index === 0
          ? "green"
          : lastPoint
          ? "red"
          : "blue",
        color: !isNil(payload.Speed.value)
          ? getColorForPercentage(getSpeedPercent(payload.Speed.value))
          : "black",
        start: newPoint ? null : prevData?.value,
        end: value,
        distance: prevData?.value ? getDistance(prevData?.value, value) : null,
      };

      newData.push(newDatum);
    });

    return newData;
  }, [getSpeedPercent, data]);

  const addLineToRef = useCallback((segmentId, index, line, coords) => {
    if (!linesRef.current[segmentId]) {
      linesRef.current[segmentId] = {};
    }
    linesRef.current[segmentId][index] = line;

    const lineKey = JSON.stringify(coords);
    linesCoordsRef.current[lineKey] = line;

    // clearTimeout(linesRenderer.current);
    // linesRenderer.current = setTimeout(getRoute, 1000);
  }, []);

  const addMarkerToRef = useCallback((segmentId, index, line) => {
    if (!markersRef.current[segmentId]) {
      markersRef.current[segmentId] = {};
    }
    markersRef.current[segmentId][index] = line;
  }, []);

  const selectSegment = useCallback(
    (segmentId, hover = false, click = false) => {
      Object.keys(linesRef.current).forEach((key) => {
        Object.values(linesRef.current[key]).forEach((line) => {
          line.setStyle({ opacity: !hover || key === segmentId ? 1 : 0 });
          line.bringToFront();
        });

        Object.values(markersRef.current[key]).forEach((marker) => {
          marker.setOpacity(!hover || key === segmentId ? 1 : 0);
        });
      });
    },
    []
  );

  const getIcon = useCallback((index, color) => {
    let icon = BlueIcon;
    if (color === "red") {
      icon = RedIcon;
    } else if (color === "green") {
      icon = GreenIcon;
    } else if (color === "yellow") {
      icon = YellowIcon;
    }
    return new Leaflet.DivIcon({
      className: Style.marker,
      html: `<img class="${Style.markerIcon}" src="${icon}"/>
              ${
                index !== null
                  ? `<div class="${Style.markerLabel}">${index}</div>`
                  : ""
              }`,
      iconSize: [32, 32],
      iconAnchor: [16, 32],
      popupAnchor: [0, -30],
    });
  }, []);

  const lastDatum = useMemo(() => {
    // return last(Object.values(polygonData).flat());
    const lastPolygonDatum = last(polygonData);

    if (lastPolygonDatum) {
      return lastPolygonDatum;
    }

    const findAllDatum = findLast(data, ({ today }) => !today);

    if (findAllDatum) {
      return {
        end: findAllDatum.value,
      };
    }

    return undefined;
  }, [data, polygonData]);

  const center = useMemo(() => {
    return lastDatum?.end;
  }, [lastDatum]);

  const onSnap = useCallback(() => {
    if (!map || polygonData?.length <= 0 || !fullSize) {
      controlsRef.current.forEach((loopControl) =>
        map?.removeControl(loopControl)
      );
      return;
    }
    const lines = [];
    const chunks = chunk(polygonData, 40);

    chunks.forEach((lineChunks, index) => {
      const coords = (
        index === 0 && lineChunks[0].start ? [lineChunks[0].start] : []
      ).concat(lineChunks.map((lineChunk) => lineChunk.end));
      const keys = lineChunks.map((lineChunk) =>
        JSON.stringify(
          lineChunks[0].start
            ? [lineChunk.start, lineChunk.end]
            : [lineChunk.end]
        )
      );
      if (lineChunks[index + 1]?.end) {
        coords.push(lineChunks[index + 1].end);
      }

      const key = JSON.stringify(coords);

      if (!routedLines.current[key]) {
        const styles = lineChunks.map((lineChunk) => ({
          color: lineChunk.color,
          weight: 10,
        }));
        if (lineChunks[index + 1]?.end) {
          styles.push(styles[styles.length - 1]);
        }
        console.log("ASD", coords, styles);
        const control = Leaflet.Routing.control({
          waypoints: coords,
          waypointMode: "snap",
          fitSelectedRoutes: false,
          show: true,
          lineOptions: {
            styles,
          },
          draggableWaypoints: false,
          addWaypoints: false,
          showAlternatives: false,
          createStepsContainer: () => {},
          createStep: () => {},
          // itineraryFormatter: () => {},
          createMarker: () => {},
        }).addTo(map);

        routedLines.current[key] = control;
        controlsRef.current.push(control);

        control.on("routeselected", function (e) {
          keys.forEach((lineKey) => {
            linesCoordsRef.current[lineKey]?.removeFrom(map);
          });
        });
      } else {
        routedLines.current[key].addTo(map);
      }
    });

    return lines;
  }, [fullSize, map, polygonData]);

  return (
    <div
      onClick={() => !fullSize && onClick?.(map)}
      className={`${Style.Container} ${
        fullSize ? Style.FullScreen : ""
      } ${className}`}
      style={{ width, height, ...style }}
    >
      <MapContainer
        whenCreated={setMap}
        center={center}
        zoom={13}
        doubleClickZoom={false}
      >
        <TileLayer
          attribution='&copy; <a href="http://osm.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        {fullSize ? (
          <>
            {/* {Object.values(polygonData ?? {})
                .flat() */}
            {polygonData?.map(
              (
                {
                  start,
                  end,
                  color,
                  payload,
                  time,
                  markerColor,
                  id: segmentId,
                },
                index
              ) => {
                return (
                  <>
                    {start && end ? (
                      <Polyline
                        ref={(ref) =>
                          addLineToRef(segmentId, index, ref, [start, end])
                        }
                        pathOptions={{
                          color,
                          stroke: true,
                        }}
                        className={`${Style.line} ${segmentId}`}
                        eventHandlers={
                          {
                            // mouseover: () => selectSegment(segmentId, true),
                            // mouseout: () => selectSegment(segmentId, false),
                            // click: () =>
                            //   selectSegment(
                            //     segmentId,
                            //     true,
                            //     segmentId !== selectedSegment
                            //   ),
                          }
                        }
                        positions={[start, end]}
                        weight={10}
                      />
                    ) : null}
                    {(index === 0 && polygonData?.length > 1
                      ? [start, end]
                      : [null, end]
                    ).map(
                      (pos, posInd) =>
                        pos && (
                          <Marker
                            ref={(ref) =>
                              addMarkerToRef(segmentId, index + posInd + 1, ref)
                            }
                            position={pos}
                            icon={getIcon(
                              index + posInd,
                              posInd === 0 && markerColor !== "yellow"
                                ? "green"
                                : markerColor
                            )}
                            eventHandlers={{
                              mouseover: () => selectSegment(segmentId, true),
                              mouseout: () => selectSegment(segmentId, false),
                              // click: () =>
                              //   selectSegment(
                              //     segmentId,
                              //     true,
                              //     segmentId !== selectedSegment
                              //   ),
                            }}
                          >
                            <Popup>
                              <div class={Style.marketPopupTitle}>
                                Location at {time}
                              </div>
                              {Object.entries(payload).map(
                                ([key, { value, appendix }]) => (
                                  <div className={Style.markerPopupDetail}>
                                    <b>{key}: </b>
                                    {value}
                                    {appendix}
                                  </div>
                                )
                              )}
                            </Popup>
                          </Marker>
                        )
                    )}
                  </>
                );
              }
            )}
          </>
        ) : (
          <Marker position={lastDatum?.end} icon={getIcon(null, "blue")}>
            {/* <Popup>
              <div class={Style.marketPopupTitle}>
                Location at {lastDatum.time}
              </div>
              {Object.entries(lastDatum.payload).map(
                ([key, { value, appendix }]) => (
                  <div className={Style.markerPopupDetail}>
                    <b>{key}: </b>
                    {value}
                    {appendix}
                  </div>
                )
              )}
            </Popup> */}
          </Marker>
        )}
        <MapController
          onClicks={{ close: onClick, snap: onSnap }}
          noControl={noControl}
          heatmapData={fullSize ? heatmapData : []}
          center={center}
        />
      </MapContainer>
    </div>
  );
};

export default Map;
