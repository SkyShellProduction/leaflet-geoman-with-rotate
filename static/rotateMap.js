import './leaflet-rotate-src';
import { arrayGeom } from '../src/js/data';

export function rotateMap(){
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
    minZoom: 11,
    maxZoom: 23,
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
  
  
  // rotateMap(map);
  
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
  
  const sorted = (a, b) => a.render_order - b.render_order;
  
  arrayGeom.sort(sorted).forEach((item) => {
    L.geoJson(JSON.parse(item.geom), {
      style: {
        weight: 1,
        color: 'grey',
      },
      onEachFeature: (feature, l) => {
        map.addLayer(l);
        l.on('click', (ev) => {
          if(map.pm.globalDrawModeEnabled()) return;
          if(map.pm.globalRemovalModeEnabled()) return;
          if(map.pm.globalDragModeEnabled()) return;
          if (selectedFeature) {
            selectedFeature.setStyle({ color: 'grey' });
            selectedFeature.pm.disable();
          }
  
          selectedFeature = ev.target;
          // console.log(selectedFeature.getElement(), selectedFeature);
          ev.target.setStyle({ color: 'aqua' });
          ev.target.pm.enable({
            snappable: true,
            limitMarkersToCount: 100,
            snapDistance: 10,
            // snapSegment: false
          });
        });
      },
    });
  });
  const rotateControlBtns = document.querySelectorAll('.rotateControls button');
  rotateControlBtns.forEach((c) => {
    c.addEventListener('click', (e) => {
      const rotate = e.target.getAttribute('data-rotate');
      map.setBearing(rotate);
      map.setBearingClone(rotate);
    });
  });

  window.addEventListener("keydown",(e) => {
    const key = e.key.toLowerCase();
    if(key === "h") map.pm.Draw.handleMagnit();
  })
}