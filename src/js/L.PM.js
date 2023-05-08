/* A Leaflet Plugin For Editing Geometry Layers in Leaflet 1.0
 * Copyright (C) Geoman.io and Sumit Kumar - All Rights Reserved
 * Unauthorized copying of this file, via any medium is strictly prohibited
 * Proprietary and confidential
 * Written by Sumit Kumar <sumit@geoman.io>, January 2020
 * Twitter: @TweetsOfSumit
 * OSS Repo: https://github.com/geoman-io/leaflet-geoman
 * Get Pro: https://geoman.io/leaflet-geoman#pro
 */

import L from 'leaflet';
import './leaflet-rotate-src';
import { arrayGeom } from './data';

import './polyfills';
import packageInfo from '../../package.json';

import Map from './L.PM.Map';
import Toolbar from './Toolbar/L.PM.Toolbar';

import Draw from './Draw/L.PM.Draw';
import './Draw/L.PM.Draw.Marker';
import './Draw/L.PM.Draw.Line';
import './Draw/L.PM.Draw.Polygon';
import './Draw/L.PM.Draw.Rectangle';
import './Draw/L.PM.Draw.Circle';
import './Draw/L.PM.Draw.CircleMarker';
import './Draw/L.PM.Draw.Cut';
import './Draw/L.PM.Draw.Text';

import Edit from './Edit/L.PM.Edit';
import './Edit/L.PM.Edit.LayerGroup';
import './Edit/L.PM.Edit.Marker';
import './Edit/L.PM.Edit.Line';
import './Edit/L.PM.Edit.Polygon';
import './Edit/L.PM.Edit.Rectangle';
import './Edit/L.PM.Edit.Circle';
import './Edit/L.PM.Edit.CircleMarker';
import './Edit/L.PM.Edit.ImageOverlay';
import './Edit/L.PM.Edit.Text';

import '../css/layers.css';
import '../css/controls.css';
import '../css/leaflet.css';

import Matrix from './helpers/Matrix';

import Utils from './L.PM.Utils';

L.PM = L.PM || {
  version: packageInfo.version,
  Map,
  Toolbar,
  Draw,
  Edit,
  Utils,
  Matrix,
  activeLang: 'en',
  optIn: false,
  initialize(options) {
    this.addInitHooks(options);
  },
  setOptIn(value) {
    this.optIn = !!value;
  },
  addInitHooks() {
    function initMap() {
      this.pm = undefined;

      if (L.PM.optIn) {
        if (this.options.pmIgnore === false) {
          this.pm = new L.PM.Map(this);
        }
      } else if (!this.options.pmIgnore) {
        this.pm = new L.PM.Map(this);
      }

      if (this.pm) {
        this.pm.setGlobalOptions({});
      }
    }

    L.Map.addInitHook(initMap);

    function initLayerGroup() {
      this.pm = undefined;
      if (L.PM.optIn) {
        if (this.options.pmIgnore === false) {
          this.pm = new L.PM.Edit.LayerGroup(this);
        }
      } else if (!this.options.pmIgnore) {
        this.pm = new L.PM.Edit.LayerGroup(this);
      }
    }

    L.LayerGroup.addInitHook(initLayerGroup);

    function initMarker() {
      this.pm = undefined;

      if (L.PM.optIn) {
        if (this.options.pmIgnore === false) {
          if (this.options.textMarker) {
            this.pm = new L.PM.Edit.Text(this);
            if (!this.options._textMarkerOverPM) {
              this.pm._initTextMarker();
            }
            delete this.options._textMarkerOverPM;
          } else {
            this.pm = new L.PM.Edit.Marker(this);
          }
        }
      } else if (!this.options.pmIgnore) {
        if (this.options.textMarker) {
          this.pm = new L.PM.Edit.Text(this);
          if (!this.options._textMarkerOverPM) {
            this.pm._initTextMarker();
          }
          delete this.options._textMarkerOverPM;
        } else {
          this.pm = new L.PM.Edit.Marker(this);
        }
      }
    }
    L.Marker.addInitHook(initMarker);

    function initCircleMarker() {
      this.pm = undefined;

      if (L.PM.optIn) {
        if (this.options.pmIgnore === false) {
          this.pm = new L.PM.Edit.CircleMarker(this);
        }
      } else if (!this.options.pmIgnore) {
        this.pm = new L.PM.Edit.CircleMarker(this);
      }
    }
    L.CircleMarker.addInitHook(initCircleMarker);

    function initPolyline() {
      this.pm = undefined;

      if (L.PM.optIn) {
        if (this.options.pmIgnore === false) {
          this.pm = new L.PM.Edit.Line(this);
        }
      } else if (!this.options.pmIgnore) {
        this.pm = new L.PM.Edit.Line(this);
      }
    }

    L.Polyline.addInitHook(initPolyline);

    function initPolygon() {
      this.pm = undefined;

      if (L.PM.optIn) {
        if (this.options.pmIgnore === false) {
          this.pm = new L.PM.Edit.Polygon(this);
        }
      } else if (!this.options.pmIgnore) {
        this.pm = new L.PM.Edit.Polygon(this);
      }
    }

    L.Polygon.addInitHook(initPolygon);

    function initRectangle() {
      this.pm = undefined;

      if (L.PM.optIn) {
        if (this.options.pmIgnore === false) {
          this.pm = new L.PM.Edit.Rectangle(this);
        }
      } else if (!this.options.pmIgnore) {
        this.pm = new L.PM.Edit.Rectangle(this);
      }
    }

    L.Rectangle.addInitHook(initRectangle);

    function initCircle() {
      this.pm = undefined;

      if (L.PM.optIn) {
        if (this.options.pmIgnore === false) {
          this.pm = new L.PM.Edit.Circle(this);
        }
      } else if (!this.options.pmIgnore) {
        this.pm = new L.PM.Edit.Circle(this);
      }
    }

    L.Circle.addInitHook(initCircle);

    function initImageOverlay() {
      this.pm = undefined;

      if (L.PM.optIn) {
        if (this.options.pmIgnore === false) {
          this.pm = new L.PM.Edit.ImageOverlay(this);
        }
      } else if (!this.options.pmIgnore) {
        this.pm = new L.PM.Edit.ImageOverlay(this);
      }
    }

    L.ImageOverlay.addInitHook(initImageOverlay);
  },
  reInitLayer(layer) {
    if (layer instanceof L.LayerGroup) {
      layer.eachLayer((_layer) => {
        this.reInitLayer(_layer);
      });
    }
    if (layer.pm) {
      // PM is already added to the layer
    } else if (L.PM.optIn && layer.options.pmIgnore !== false) {
      // Opt-In is true and pmIgnore is not false
    } else if (layer.options.pmIgnore) {
      // pmIgnore is true
    } else if (layer instanceof L.Map) {
      layer.pm = new L.PM.Map(layer);
    } else if (layer instanceof L.Marker) {
      if (layer.options.textMarker) {
        layer.pm = new L.PM.Edit.Text(layer);
        layer.pm._initTextMarker();
        layer.pm._createTextMarker(false);
      } else {
        layer.pm = new L.PM.Edit.Marker(layer);
      }
    } else if (layer instanceof L.Circle) {
      layer.pm = new L.PM.Edit.Circle(layer);
    } else if (layer instanceof L.CircleMarker) {
      layer.pm = new L.PM.Edit.CircleMarker(layer);
    } else if (layer instanceof L.Rectangle) {
      layer.pm = new L.PM.Edit.Rectangle(layer);
    } else if (layer instanceof L.Polygon) {
      layer.pm = new L.PM.Edit.Polygon(layer);
    } else if (layer instanceof L.Polyline) {
      layer.pm = new L.PM.Edit.Line(layer);
    } else if (layer instanceof L.LayerGroup) {
      layer.pm = new L.PM.Edit.LayerGroup(layer);
    } else if (layer instanceof L.ImageOverlay) {
      layer.pm = new L.PM.Edit.ImageOverlay(layer);
    }
  },
};

if (L.version === '1.7.1') {
  // Canvas Mode: After dragging the map the target layer can't be dragged anymore until it is clicked
  // https://github.com/Leaflet/Leaflet/issues/7775 a fix is already merged for the Leaflet 1.8.0 version
  L.Canvas.include({
    _onClick(e) {
      const point = this._map.mouseEventToLayerPoint(e);
      let layer;
      let clickedLayer;

      for (let order = this._drawFirst; order; order = order.next) {
        layer = order.layer;
        if (layer.options.interactive && layer._containsPoint(point)) {
          // changing e.type !== 'preclick' to e.type === 'preclick' fix the issue
          if (
            !(e.type === 'click' || e.type === 'preclick') ||
            !this._map._draggableMoved(layer)
          ) {
            clickedLayer = layer;
          }
        }
      }
      if (clickedLayer) {
        L.DomEvent.fakeStop(e);
        this._fireEvent([clickedLayer], e);
      }
    },
  });
}

// initialize leaflet-geoman
L.PM.initialize();

// L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
//     attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
// }).addTo(map);
// L.tileLayer(
//   'https://api.maptiler.com/tiles/v3-28992/?key=5ANCg0GQkNdZP3z4mMX3#7.0/52.15517/5.38720'
// ).addTo(map);
const map = L.map('map', {
  rotate: true,
  rotateControl: {
    closeOnZeroBearing: false,
    // position: 'bottomleft',
  },
  shiftKeyRotate: true,
  compassBearing: true,
  trackContainerMutation: true,
  // shiftKeyRotate: false,
  touchGestures: true,
  touchRotate: true,
});
map.setView([25.205598, 55.352221], 17);

L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
  attribution:
    '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
}).addTo(map);

map.pm.addControls({
  position: 'topleft',
  drawPolyline: true,
  drawPolygon: true,
  drawMarker: true,
  drawText: false,
  drawCircle: true,
  drawRectangle: false,
  drawCircleMarker: false,
  editMode: false,
  dragMode: true,
  rotateMode: false,
  cutPolygon: false,
  removalMode: true,
});

const rotateControlBtns = document.querySelectorAll('.rotateControls button');
rotateControlBtns.forEach((c) => {
  c.addEventListener('click', (e) => {
    const rotate = e.target.getAttribute('data-rotate');
    map.setBearing(rotate);
    map.setBearingClone(rotate);
  });
});
let selectedFeature;
map.on('pm:create', (e) => {
  let { layer } = e;
  const itemData =
    e.shape === 'Circle' ? L.PM.Utils.circleToPolygon(e.layer, 60) : layer;
  map.removeLayer(layer);
  L.geoJson(itemData.toGeoJSON(12), {
    style: {
      weight: itemData.toGeoJSON(12).geometry.type === 'LineString' ? 10 : 3,
    },
    onEachFeature: (feature, l) => {
      layer = l;
      map.addLayer(l);
      l.on('click', (ev) => {
        if (selectedFeature) {
          selectedFeature.pm.disable();
        }
        selectedFeature = ev.target;
        ev.target.pm.enable({ snappable: true, limitMarkersToCount: 100 });
      });
    },
  });
});

map.on("pm:snap", (e) => {
  console.log(e);
})
map.on("pm:snapdrag", (e) => {
  console.log(e);
})

const sorted = (a, b) => a.render_order - b.render_order;

setTimeout(() => {
  arrayGeom.sort(sorted).forEach((item) => {
    L.geoJson(JSON.parse(item.geom), {
      style: {
        weight: 1,
        color: "grey"
      },
      onEachFeature: (feature, l) => {
        map.addLayer(l);
        l.on('click', (ev) => {
          if (selectedFeature) {
            selectedFeature.setStyle({color: "grey"})
            selectedFeature.pm.disable();
          }
          selectedFeature = ev.target;
          ev.target.setStyle({color: "aqua"})
          ev.target.pm.enable({ snappable: true, limitMarkersToCount: 100 });
        });
      },
    });
  })
}, 2000);
