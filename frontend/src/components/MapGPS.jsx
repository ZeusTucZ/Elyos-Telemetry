import { MapContainer, Marker, Popup, TileLayer } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import MapUpdater from './MapUpdater';

const carIcon = new L.DivIcon({
  className: 'telemetry-map-marker',
  html: `
    <div style="
      position: relative;
      width: 20px;
      height: 20px;
      border-radius: 9999px;
      background: radial-gradient(circle at 30% 30%, #e0f2fe 0%, #38bdf8 45%, #f59e0b 100%);
      box-shadow: 0 0 0 4px rgba(56, 189, 248, 0.18), 0 0 20px rgba(245, 158, 11, 0.35);
      border: 2px solid rgba(255,255,255,0.85);
    ">
      <div style="
        position: absolute;
        inset: -6px;
        border-radius: 9999px;
        border: 1px solid rgba(255,255,255,0.2);
      "></div>
    </div>
  `,
  iconSize: [20, 20],
  iconAnchor: [10, 10],
  popupAnchor: [0, -8]
});

const DEFAULT_LATITUDE = 39.792149;
const DEFAULT_LONGITUDE = -86.238707;

const formatCoord = (value) => Number(value).toFixed(5);

const MapGPS = ({ latitude = DEFAULT_LATITUDE, longitud = DEFAULT_LONGITUDE }) => {
  const safeLat = Number(latitude);
  const safeLng = Number(longitud);
  const hasValidPosition = Number.isFinite(safeLat) && Number.isFinite(safeLng);
  const mapCenter = hasValidPosition ? [safeLat, safeLng] : [DEFAULT_LATITUDE, DEFAULT_LONGITUDE];

  return (
    <div className="relative h-full min-h-[220px] w-full overflow-hidden rounded-xl border border-slate-700/60 bg-[#0D1526] shadow-[0_18px_40px_rgba(2,6,23,0.45)]">
      <div className="pointer-events-none absolute inset-0 z-[450] bg-[radial-gradient(circle_at_top,rgba(56,189,248,0.12),transparent_32%),radial-gradient(circle_at_bottom_right,rgba(245,158,11,0.09),transparent_26%)]" />
      <div className="pointer-events-none absolute inset-x-0 bottom-0 z-[450] h-24 bg-gradient-to-t from-[#08111f]/85 via-[#08111f]/30 to-transparent" />

      <div className="pointer-events-none absolute left-16 top-4 z-[500] flex flex-wrap items-start gap-2 md:left-20">
        <div className="rounded-full border border-cyan-400/20 bg-slate-950/80 px-3 py-2 shadow-[0_12px_24px_rgba(2,6,23,0.45)] backdrop-blur-sm">
          <p className="text-[0.62rem] font-semibold uppercase tracking-[0.24em] text-slate-400">
            Track Position
          </p>
          <p className="text-sm font-semibold text-slate-100">
            Live GPS
          </p>
        </div>

        <div className="rounded-full border border-slate-600/70 bg-slate-950/80 px-3 py-2 shadow-[0_12px_24px_rgba(2,6,23,0.45)] backdrop-blur-sm">
          <p className="text-[0.62rem] font-semibold uppercase tracking-[0.24em] text-slate-500">
            Lat / Lng
          </p>
          <p className="font-mono text-xs text-slate-200">
            {formatCoord(mapCenter[0])}, {formatCoord(mapCenter[1])}
          </p>
        </div>
      </div>

      <MapContainer center={mapCenter} zoom={17} className="h-full w-full [&_.leaflet-control-zoom]:!border-slate-700 [&_.leaflet-control-zoom]:!shadow-[0_10px_24px_rgba(2,6,23,0.35)] [&_.leaflet-control-zoom_a]:!bg-[#0D1526] [&_.leaflet-control-zoom_a]:!text-slate-200 [&_.leaflet-control-zoom_a]:hover:!bg-[#162133] [&_.leaflet-control-attribution]:!bg-[#08111f]/80 [&_.leaflet-control-attribution]:!text-slate-400 [&_.leaflet-popup-content-wrapper]:!rounded-2xl [&_.leaflet-popup-content-wrapper]:!border [&_.leaflet-popup-content-wrapper]:!border-slate-700/60 [&_.leaflet-popup-content-wrapper]:!bg-[#0D1526] [&_.leaflet-popup-content-wrapper]:!text-slate-100 [&_.leaflet-popup-tip]:!bg-[#0D1526]">
        <MapUpdater position={hasValidPosition ? [safeLat, safeLng] : null} />

        <TileLayer
          attribution='&copy; <a href="http://osm.org/copyright">OpenStreetMap</a>'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />

        <Marker position={mapCenter} icon={carIcon}>
          <Popup>Vehicle position</Popup>
        </Marker>
      </MapContainer>
    </div>
  );
};

export default MapGPS;
