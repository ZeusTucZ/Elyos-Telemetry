import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import MapUpdater from './MapUpdater';

const carIcon = new L.Icon({
  iconUrl:
    'data:image/svg+xml;base64,' +
    btoa(
      `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16">
         <circle cx="8" cy="8" r="6" fill="red" />
       </svg>`
    ),
  iconSize: [16, 16],
  iconAnchor: [8, 8],
});

const DEFAULT_LATITUDE = 39.792149;
const DEFAULT_LONGITUDE = -86.238707;

const MapGPS = ({ latitude = DEFAULT_LATITUDE, longitud = DEFAULT_LONGITUDE }) => {
  const safeLat = Number(latitude);
  const safeLng = Number(longitud);
  const hasValidPosition = Number.isFinite(safeLat) && Number.isFinite(safeLng);
  const mapCenter = hasValidPosition ? [safeLat, safeLng] : [DEFAULT_LATITUDE, DEFAULT_LONGITUDE];

  return (
    <div className="w-full h-96 rounded-xl overflow-hidden">
      <MapContainer center={mapCenter} zoom={17} className="w-full h-full">
        {/* Este componente mueve el mapa cuando cambia la posición */}
        <MapUpdater position={hasValidPosition ? [safeLat, safeLng] : null} />

        <TileLayer
          attribution='&copy; <a href="http://osm.org/copyright">OpenStreetMap</a>'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        <Marker position={mapCenter} icon={carIcon}>
          <Popup>Position of the car</Popup>
        </Marker>
      </MapContainer>
    </div>
  );
};

export default MapGPS;
