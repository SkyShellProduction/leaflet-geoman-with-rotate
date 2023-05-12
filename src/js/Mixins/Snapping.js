import { hasValues, prioritiseSort } from '../helpers';

// import markerRed from '../../../static/marker-red.png';
let dragEventCounter = 0;
window.console.warn = function () {};
let currentMarker = null;
// let markerImage = null;
let lastDragMarkerLatLng = null;

const markersData = new L.FeatureGroup();

const SnapMixin = {
  mercatorX(lon) {
    /*
    Converts longitude to Mercator x-coordinate.
    */
    const rMajor = 6378137; // Earth's equatorial radius in meters
    const lonRadians = this.toRad(lon);
    const x = rMajor * lonRadians;
    return x;
  },
  toRad(value) {
    /*
    Converts degrees to radians.
    */
    return value * Math.PI;
  },
  mercatorY(lat) {
    /*
    Converts latitude to Mercator y-coordinate.
    */
    if (lat > 89.5) lat = 89.5; // Avoid infinite tangents
    if (lat < -89.5) lat = -89.5; // Avoid infinite tangents
    const rMajor = 6378137; // Earth's equatorial radius in meters
    const rMinor = 6356752.3142; // Earth's polar radius in meters
    const eccent = Math.sqrt(1 - rMinor / rMajor) ** 2;
    const phi = this.toRad(lat);
    const sinphi = Math.sin(phi);
    const con = eccent * sinphi;
    const com = eccent / 2;
    const con2 = Math.pow(con, 2);
    const con4 = Math.pow(con, 4);
    const con6 = Math.pow(con, 6);
    const con8 = Math.pow(con, 8);
    const ep2 = Math.pow(rMajor / rMinor, 2) - 1;
    const ep4 = Math.pow(ep2, 2);
    const ep6 = Math.pow(ep2, 3);
    const ep8 = Math.pow(ep2, 4);
    const denom =
      rMajor *
      (1 - Math.pow(eccent, 2)) *
      Math.pow(1 - Math.pow(eccent, 2) * Math.pow(sinphi, 2), 1.5);
    const t = Math.tan(phi);
    const t2 = t * t;
    const c1 = ep2 * Math.pow(Math.cos(phi), 2);
    const c2 = ep4 * Math.pow(Math.cos(phi), 4);
    const c3 = ep6 * Math.pow(Math.cos(phi), 6);
    const c4 = ep8 * Math.pow(Math.cos(phi), 8);
    const n = rMajor / Math.sqrt(1 - Math.pow(eccent, 2) * Math.pow(sinphi, 2));
    const r =
      (n * (1 - Math.pow(eccent, 2))) /
      (1 - Math.pow(eccent, 2) * Math.pow(sinphi, 2));
    const d = (x) => (x * 180) / Math.PI;
    const y =
      r *
      (phi -
        com *
          (1 + c1 + c2 + c3 + c4) *
          (phi -
            con *
              t *
              (1 +
                c1 * t2 +
                c2 * Math.pow(t, 4) +
                c3 * Math.pow(t, 6) +
                c4 * Math.pow(t, 8))));
    return y;
  },
  distanceBetweenPoints(lat1, lon1, lat2, lon2) {
    const deg2rad = (deg) => deg * (Math.PI / 180);

    const R = 6371; // Radius of the earth in km
    const dLat = deg2rad(lat2 - lat1); // deg2rad function converts degrees to radians
    const dLon = deg2rad(lon2 - lon1);

    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(deg2rad(lat1)) *
        Math.cos(deg2rad(lat2)) *
        Math.sin(dLon / 2) *
        Math.sin(dLon / 2);

    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    const distance = R * c; // Distance in km

    return distance;
  },

  _initSnappableMarkers() {
    this.options.snapDistance = this.options.snapDistance || 30;
    this.options.snapSegment =
      this.options.snapSegment === undefined ? true : this.options.snapSegment;

    this._assignEvents(this._markers);

    this._layer.off('pm:dragstart', this._unsnap, this);
    this._layer.on('pm:dragstart', this._unsnap, this);
  },
  _disableSnapping() {
    this._layer.off('pm:dragstart', this._unsnap, this);
  },
  _assignEvents(markerArr) {
    // loop through marker array and assign events to the markers
    markerArr.forEach((marker) => {
      // if the marker is another array (Multipolygon stuff), recursively do this again
      if (Array.isArray(marker)) {
        this._assignEvents(marker);
        return;
      }

      // add handleSnapping event on drag
      marker.off('drag', this._handleSnapping, this);
      marker.on('drag', this._handleSnapping, this);
      marker.on('click', this._handleClick, this);

      // cleanup event on dragend
      marker.off('dragend', this._cleanupSnapping, this);
      marker.on('dragend', this._cleanupSnapping, this);
      // marker.off('click', this._handleClick, this);
    });
  },
  _cleanupSnapping(e) {
    dragEventCounter += 1;
    if (dragEventCounter % 2 === 0) return false;
    // if(currentMarker && lastDragMarkerLatLng) {
    // console.log(e);
    if (!this._map.pm.Keyboard.isAltKeyPressed()) {
      // console.log(e, lastDragMarkerLatLng);
      // const markerIcon = L.icon({ iconUrl: markerRed, iconSize: [40, 40] });
      // const spec = L.marker(e.target.getLatLng(), { icon: markerIcon });
      // markersData.addLayer(spec);
      e.target.setLatLng(e.target.getLatLng());
    }
    // }
    document.removeEventListener('mousemove', this._handleMouseMove);
    if (e) {
      // reset snap flag of the dragged helper-marker
      const marker = e.target;
      marker._snapped = false;
    }
    // delete it, we need to refresh this with each start of a drag because
    // meanwhile, new layers could've been added to the map
    delete this._snapList;

    if (this.throttledList) {
      this._map.off('layeradd', this.throttledList, this);
      this.throttledList = undefined;
    }

    // remove map event
    this._map.off('pm:remove', this._handleSnapLayerRemoval, this);

    if (this.debugIndicatorLines) {
      this.debugIndicatorLines.forEach((line) => {
        line.remove();
      });
    }
  },
  _handleThrottleSnapping() {
    // we check if the throttledList is existing, else the function is deleted but the `layeradd` event calls it.
    // this made problems when layer was removed and added to the map in the `pm:create` event
    if (this.throttledList) {
      this._createSnapList();
    }
  },

  _handleClick(e) {
    currentMarker = e;
    currentMarker._shape = this._shape;
    currentMarker._layer = this._layer;
  },

  handleMagnit() {
    const key = this._map.pm.Keyboard.getPressedKey();
    if (key && key.toLowerCase() === 'h' && currentMarker) {
      this._handleSnapping(currentMarker);
    }
  },

  _handleMouseMove(e) {
    // console.log(e.offsetX, "mousemove");
  },

  _handleSnapping(e) {
    const marker = e.target;
    marker._snapped = false;
    // console.log(e.latlng, "origin");
    // console.log(this.mercatorX(e.originalEvent.offsetX), this.mercatorY(e.originalEvent.offsetY), "calc");
    // marker.setLatLng(e.latlng);
    // document.addEventListener("mousemove", this._handleMouseMove, this);
    // const dist3 = this.distanceBetweenPoints(e.oldLatLng.lat, e.oldLatLng.lng, e.latlng.lat, e.latlng.lng);
    // if(dist3 > 0.005) return false;
    marker.setLatLng(e.latlng);
    if (!this._map.hasLayer(markersData)) {
      this._map.addLayer(markersData);
    }
    markersData.clearLayers();
    // const xMin = e.originalEvent.clientX - 50;
    // const xMax = e.originalEvent.clientX + 50;
    // const yMin = e.originalEvent.clientY - 50;
    // const yMax = e.originalEvent.clientY + 50;
    // console.log(xMin, xMax, yMin, yMax);
    // const xy1 = [e.latlng.lat - 0.00015, e.latlng.lng - 0.00015];
    // const xy2 = [e.latlng.lat + 0.00015, e.latlng.lng - 0.00015];
    // const xy3 = [e.latlng.lat - 0.00015, e.latlng.lng + 0.00015];
    // const xy4 = [e.latlng.lat + 0.00015, e.latlng.lng + 0.00015];
    // markerImage = L.rectangle([xy1, xy2, xy3, xy4, xy1], {color: "red", fill: null}).addTo(this._map);
    // this._map.getContainer().addEventListener("mousemove", this._handleMouseMove, this);
    currentMarker = e;
    currentMarker._shape = this._shape || currentMarker._shape;
    currentMarker._layer = this._layer || currentMarker._layer;

    if (!this.throttledList) {
      this.throttledList = L.Util.throttle(
        this._handleThrottleSnapping,
        100,
        this
      );
    }
    // console.log(e);
    // if snapping is disabled via holding ALT during drag, stop right here
    if (this._map.pm.Keyboard.isAltKeyPressed()) {
      return false;
    }
    // create a list of layers that the marker could snap to
    // this isn't inside a movestart/dragstart callback because middlemarkers are initialized
    // after dragstart/movestart so it wouldn't fire for them
    if (this._snapList === undefined) {
      this._createSnapList();

      // re-create the snaplist again when a layer is added during draw
      this._map.off('layeradd', this.throttledList, this);
      this._map.on('layeradd', this.throttledList, this);
    }

    // if there are no layers to snap to, stop here
    if (this._snapList.length <= 0) {
      return false;
    }

    // alternate calculate all

    // get the closest layer, it's closest latlng, segment and the distance
    // closestLayer = closestLayers[0] || {};

    // get the closest layer, it's closest latlng, segment and the distance
    const closestLayer = this._calcClosestLayer(
      marker.getLatLng(),
      this._snapList
    );

    // if no layers found. Can happen when circle is the only visible layer on the map and the hidden snapping-border circle layer is also on the map
    if (Object.keys(closestLayer).length === 0) {
      return false;
    }

    const isMarker =
      closestLayer.layer instanceof L.Marker ||
      closestLayer.layer instanceof L.CircleMarker ||
      !this.options.snapSegment;

    // find the final latlng that we want to snap to
    let snapLatLng;
    if (!isMarker) {
      snapLatLng = this._checkPrioritiySnapping(closestLayer);
    } else {
      snapLatLng = closestLayer.latlng;
    }
    // minimal distance before marker snaps (in pixels)

    // event info for pm:snap and pm:unsnap
    // // console.log(closestLayer);
    const eventInfo = {
      marker,
      shape: this._shape || currentMarker._shape,
      snapLatLng,
      segment: closestLayer.segment || [],
      layer: this._layer || currentMarker._layer,
      workingLayer: this._layer || currentMarker._layer,
      layerInteractedWith: closestLayer.layer, // for lack of a better property name
      // distance: closestLayer.distance/100,
      distance: closestLayer.distance,
    };
    this._fireSnapDrag(eventInfo.marker, eventInfo);
    this._fireSnapDrag(this._layer || currentMarker._layer, eventInfo);

    // const key = this._map.pm.Keyboard.getPressedKey();
    // if (
    //   this._map.pm.globalDrawModeEnabled() ||
    //   (key && key.toLowerCase() === 'h')
    // ) {
    // }
    const cord = marker.getLatLng();
    const dist2 = this.distanceBetweenPoints(
      cord.lat,
      cord.lng,
      snapLatLng.lat,
      snapLatLng.lng
    );
    if (dist2 > 0.02) return false;
    // console.log(dist2);
    lastDragMarkerLatLng = snapLatLng;
    if (closestLayer.distance < this.options.snapDistance) {
      // console.log(closestLayer.distance);
      marker._orgLatLng = marker.getLatLng();
      marker.setLatLng(snapLatLng);
      marker._snapped = true;
      marker._snapInfo = eventInfo;
      const triggerSnap = () => {
        this._snapLatLng = snapLatLng;
        this._fireSnap(marker, eventInfo);
        this._fireSnap(this._layer || currentMarker._layer, eventInfo);
      };

      // check if the snapping position differs from the last snap
      // Thanks Max & car2go Team
      const a = this._snapLatLng || {};
      const b = snapLatLng || {};

      if (a.lat !== b.lat || a.lng !== b.lng) {
        triggerSnap();
      }
    } else if (this._snapLatLng) {
      // no more snapping

      // if it was previously snapped...
      // ...unsnap
      this._unsnap(eventInfo);

      marker._snapped = false;
      marker._snapInfo = undefined;

      // and fire unsnap event
      this._fireUnsnap(eventInfo.marker, eventInfo);
      this._fireUnsnap(this._layer || currentMarker._layer, eventInfo);
    }
    // if (closestLayer.distance < this.options.snapDistance) {
    //   // snap the marker
    //   // if (dist2 < 0.0015) {
    //   // }

    return true;
  },
  _createSnapList() {
    let layers = [];
    const debugIndicatorLines = [];
    const map = this._map;

    map.off('pm:remove', this._handleSnapLayerRemoval, this);
    map.on('pm:remove', this._handleSnapLayerRemoval, this);

    // find all layers that are or inherit from Polylines... and markers that are not
    // temporary markers of polygon-edits
    map.eachLayer((layer) => {
      if (
        (layer instanceof L.Polyline ||
          layer instanceof L.Marker ||
          layer instanceof L.CircleMarker ||
          layer instanceof L.ImageOverlay) &&
        layer.options.snapIgnore !== true
      ) {
        // if snapIgnore === false the layer will be always snappable
        if (
          layer.options.snapIgnore === undefined &&
          ((!L.PM.optIn && layer.options.pmIgnore === true) || // if optIn is not set and pmIgnore is true, the layer will be ignored
            (L.PM.optIn && layer.options.pmIgnore !== false)) // if optIn is true and pmIgnore is not false, the layer will be ignored
        ) {
          return;
        }

        // adds a hidden polygon which matches the border of the circle
        if (
          (layer instanceof L.Circle || layer instanceof L.CircleMarker) &&
          layer.pm &&
          layer.pm._hiddenPolyCircle
        ) {
          layers.push(layer.pm._hiddenPolyCircle);
        } else if (layer instanceof L.ImageOverlay) {
          layer = L.rectangle(layer.getBounds());
        }
        layers.push(layer);
        // if(layer.options.pane === "markerPane") {

        // }
        // this is for debugging
        const debugLine = L.polyline([], { color: 'red', pmIgnore: true });
        debugLine._pmTempLayer = true;
        debugIndicatorLines.push(debugLine);
        if (layer instanceof L.Circle || layer instanceof L.CircleMarker) {
          debugIndicatorLines.push(debugLine);
        }

        // uncomment 👇 this line to show helper lines for debugging
        // debugLine.addTo(map);
      }
    });

    // ...except myself
    layers = layers.filter((layer) => this._layer !== layer);

    // also remove everything that has no coordinates yet
    layers = layers.filter(
      (layer) => layer._latlng || (layer._latlngs && hasValues(layer._latlngs))
    );

    // finally remove everything that's leaflet-geoman specific temporary stuff
    layers = layers.filter((layer) => !layer._pmTempLayer);

    // save snaplist from layers and the other snap layers added from other classes/scripts
    if (this._otherSnapLayers) {
      this._otherSnapLayers.forEach(() => {
        // this is for debugging
        const debugLine = L.polyline([], { color: 'red', pmIgnore: true });
        debugLine._pmTempLayer = true;
        debugIndicatorLines.push(debugLine);
      });
      this._snapList = layers.concat(this._otherSnapLayers);
    } else {
      this._snapList = layers;
    }

    this.debugIndicatorLines = debugIndicatorLines;
  },
  _handleSnapLayerRemoval({ layer }) {
    // find the layers index in snaplist
    const index = this._snapList.findIndex(
      (e) => e._leaflet_id === layer._leaflet_id
    );
    // remove it from the snaplist
    this._snapList.splice(index, 1);
  },
  _calcClosestLayer(latlng, layers) {
    return this._calcClosestLayers(latlng, layers, 1)[0] || [];
  },
  _calcClosestLayers(latlng, layers, amount = 1) {
    // the closest polygon to our dragged marker latlng
    let closestLayers = [];
    let closestLayer = {};
    // const ownLatLngs = this._layer._latlngs;
    // loop through the layers version 2
    // layers.forEach((layer, index) => {
    //   if (layer._parentCopy && layer._parentCopy === this._layer) {
    //     return;
    //   }
    //   let allow = false;
    //   const biggerLayers = layer.getLatLngs()[0].filter((c) => c.lat >= latlng.lat && c.lng >= latlng.lng);
    //   biggerLayers.forEach((c, i) => {
    //     const dist = this.distanceBetweenPoints(latlng.lat, latlng.lng, c.lat, c.lng);
    //     if(dist < 0.1) {
    //       closestLayer = {
    //         distance: dist*100,
    //         layer,
    //         latlng: c,
    //         segment: [biggerLayers[0], biggerLayers[i+1] || c]
    //       };
    //       allow = true;
    //       return undefined;
    //     }
    //   });
    //   if(allow) {
    //     closestLayers.push(closestLayer);
    //     allow = false;
    //   }
    // })

    layers.forEach((layer, index) => {
      // For Circles and CircleMarkers to prevent that they snap to the own borders.

      // find the closest latlng, segment and the distance of this layer to the dragged marker latlng
      const results = this._calcLayerDistances(latlng, layer);
      if (!results) return;
      // console.log(results, "resluts");
      results.distance = Math.floor(results.distance);

      if (results.distance > 50) return;
      if (this.debugIndicatorLines) {
        if (!this.debugIndicatorLines[index]) {
          const debugLine = L.polyline([], { color: 'red', pmIgnore: true });
          debugLine._pmTempLayer = true;
          this.debugIndicatorLines[index] = debugLine;
        }

        // show indicator lines, it's for debugging
        this.debugIndicatorLines[index].setLatLngs([latlng, results.latlng]);
      }

      // save the info if it doesn't exist or if the distance is smaller than the previous one
      if (
        amount === 1 &&
        (closestLayer.distance === undefined ||
          results.distance <= closestLayer.distance)
      ) {
        if (results.distance < closestLayer.distance) {
          closestLayers = [];
        }
        closestLayer = results;
        closestLayer.layer = layer;
        closestLayers.push(closestLayer);
      } else if (amount !== 1) {
        closestLayer = {};
        closestLayer = results;
        closestLayer.layer = layer;
        closestLayers.push(closestLayer);
      }
    });
    // console.log(closestLayers);
    if (amount !== 1) {
      // sort the layers by distance
      closestLayers = closestLayers.sort((a, b) => a.distance - b.distance);
    }

    if (amount === -1) {
      amount = closestLayers.length;
    }
    // let minLat = 0;
    // let minLng = 0;
    // let elem;
    // let elem2;
    // closestLayers.forEach((c) => {
    //   const a = Math.min(...c.layer.getLatLngs()[0].map((d) => d.lat));
    //   const b = Math.min(...c.layer.getLatLngs()[0].map((d) => d.lng));
    //   if(minLat === 0 || minLat < a) {
    //     minLat = a
    //     elem = c;
    //   };
    //   if(minLng === 0 || minLng < b) {
    //     minLng = b;
    //     elem2 = c;
    //   }
    // });
    // console.log(minLat, minLng, elem, elem2, "calc");
    // console.log(closestLayers.length ? closestLayers[0] : undefined, latlng);
    // return the closest layer and it's data
    // if there is no closest layer, return an empty object
    let result = this._getClosestLayerByPriority(closestLayers, amount);
    if (!L.Util.isArray(result)) {
      result = [result];
    }
    // console.log(result);
    return result;
  },
  _calcLayerDistances(latlng, layer) {
    const map = this._map;

    // is this a marker?
    const isMarker =
      layer instanceof L.Marker || layer instanceof L.CircleMarker;

    // is it a polygon?
    const isPolygon = layer instanceof L.Polygon;

    // the point P which we want to snap (probpably the marker that is dragged)
    const P = latlng;

    // the coords of the layer

    if (isMarker) {
      // return the info for the marker, no more calculations needed
      const latlngs = layer.getLatLng();
      return {
        latlng: { ...latlngs },
        distance: this._getDistance(map, latlngs, P),
      };
    }
    return this._calcLatLngDistances(P, layer.getLatLngs(), map, isPolygon);
  },
  _calcLatLngDistances(latlng, latlngs, map, closedShape = false) {
    // the closest coord of the layer
    let closestCoord;

    // the shortest distance from latlng to closestCoord
    let shortestDistance;

    // the closest segment (line between two points) of the layer
    let closestSegment;

    const loopThroughCoords = (coords) => {
      coords.forEach((coord, index) => {
        if (Array.isArray(coord)) {
          loopThroughCoords(coord);
          return;
        }

        if (this.options.snapSegment) {
          // take this coord (A)...
          const A = coord;
          let nextIndex;

          // and the next coord (B) as points
          if (closedShape) {
            nextIndex = index + 1 === coords.length ? 0 : index + 1;
          } else {
            nextIndex = index + 1 === coords.length ? undefined : index + 1;
          }

          const B = coords[nextIndex];
          if (B) {
            // calc the distance between latlng and AB-segment
            const distance = this._getDistanceToSegment(map, latlng, A, B);

            // is the distance shorter than the previous one? Save it and the segment
            if (shortestDistance === undefined || distance < shortestDistance) {
              if (distance < 10) {
                shortestDistance = distance;
                closestSegment = [A, B];
              }
            }
          }
        } else {
          // Only snap on the coords
          const distancePoint = this._getDistance(map, latlng, coord);

          if (
            shortestDistance === undefined ||
            distancePoint < shortestDistance
          ) {
            shortestDistance = distancePoint;
            closestCoord = coord;
          }
        }
      });
    };

    loopThroughCoords(latlngs);

    if (shortestDistance > 9) return undefined;
    if (this.options.snapSegment) {
      // now, take the closest segment (closestSegment) and calc the closest point to latlng on it.
      if (!closestSegment) return undefined;
      const C = this._getClosestPointOnSegment(
        map,
        latlng,
        closestSegment[0],
        closestSegment[1]
      );

      // return the latlng of that sucker
      return {
        latlng: { ...C },
        segment: closestSegment,
        distance: shortestDistance,
      };
    }
    // Only snap on the coords
    // return the closest coord
    return {
      latlng: closestCoord,
      distance: shortestDistance,
    };
  },
  _getClosestLayerByPriority(layers, amount = 1) {
    // sort the layers by creation, so it is snapping to the oldest layer from the same shape
    layers = layers.sort((a, b) => a._leaflet_id - b._leaflet_id);
    const shapes = [
      'Marker',
      'CircleMarker',
      'Circle',
      'Line',
      'Polygon',
      'Rectangle',
    ];
    const order = this._map.pm.globalOptions.snappingOrder || [];

    let lastIndex = 0;
    const prioOrder = {};
    // merge user-preferred priority with default priority
    order.concat(shapes).forEach((shape) => {
      if (!prioOrder[shape]) {
        lastIndex += 1;
        prioOrder[shape] = lastIndex;
      }
    });

    // sort layers by priority
    layers.sort(prioritiseSort('instanceofShape', prioOrder));
    if (amount === 1) {
      return layers[0] || {};
    }
    return layers.slice(0, amount);
  },
  // we got the point we want to snap to (C), but we need to check if a coord of the polygon
  // receives priority over C as the snapping point. Let's check this here
  _checkPrioritiySnapping(closestLayer) {
    const map = this._map;

    // A and B are the points of the closest segment to P (the marker position we want to snap)
    const A = closestLayer.segment[0];
    const B = closestLayer.segment[1];

    // C is the point we would snap to on the segment.
    // The closest point on the closest segment of the closest polygon to P. That's right.
    const C = closestLayer.latlng;

    // distances from A to C and B to C to check which one is closer to C
    const distanceAC = this._getDistance(map, A, C);
    const distanceBC = this._getDistance(map, B, C);

    // closest latlng of A and B to C
    let closestVertexLatLng = distanceAC < distanceBC ? A : B;

    // distance between closestVertexLatLng and C
    let shortestDistance = distanceAC < distanceBC ? distanceAC : distanceBC;

    // snap to middle (M) of segment if option is enabled
    if (this.options.snapMiddle) {
      const M = L.PM.Utils.calcMiddleLatLng(map, A, B);
      const distanceMC = this._getDistance(map, M, C);

      if (distanceMC < distanceAC && distanceMC < distanceBC) {
        // M is the nearest vertex
        closestVertexLatLng = M;
        shortestDistance = distanceMC;
      }
    }

    // the distance that needs to be undercut to trigger priority
    const priorityDistance = this.options.snapDistance;

    // the latlng we ultemately want to snap to
    let snapLatlng;

    // if C is closer to the closestVertexLatLng (A, B or M) than the snapDistance,
    // the closestVertexLatLng has priority over C as the snapping point.
    if (shortestDistance < priorityDistance) {
      snapLatlng = closestVertexLatLng;
    } else {
      snapLatlng = C;
    }

    // return the copy of snapping point
    return { ...snapLatlng };
  },
  _unsnap() {
    // delete the last snap
    delete this._snapLatLng;
  },
  _getClosestPointOnSegment(map, latlng, latlngA, latlngB) {
    // console.log("distance", latlng, latlngA, latlngB);
    let maxzoom = map.getMaxZoom();
    if (maxzoom === Infinity) {
      maxzoom = map.getZoom();
    }
    const P = map.project(latlng, maxzoom);
    const A = map.project(latlngA, maxzoom);
    const B = map.project(latlngB, maxzoom);
    const closest = L.LineUtil.closestPointOnSegment(P, A, B);
    return map.unproject(closest, maxzoom);
  },
  _getDistanceToSegment(map, latlng, latlngA, latlngB) {
    const P = map.latLngToLayerPoint(latlng);
    const A = map.latLngToLayerPoint(latlngA);
    const B = map.latLngToLayerPoint(latlngB);
    // console.log(L.LineUtil.pointToSegmentDistance(P, A, B), "distance");
    return L.LineUtil.pointToSegmentDistance(P, A, B);
  },
  _getDistance(map, latlngA, latlngB) {
    return map
      .latLngToLayerPoint(latlngA)
      .distanceTo(map.latLngToLayerPoint(latlngB));
  },
};

export default SnapMixin;
