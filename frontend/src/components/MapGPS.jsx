import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import MapUpdater from './MapUpdater';

const carIcon = new L.Icon({
  iconUrl: 'https://cdn-icons-png.flaticon.com/512/130/130276.png',
  iconSize: [40, 40],
  iconAnchor: [20, 20],
  popupAnchor: [0, -20],
});

const MapGPS = ({ position = [0, 0] }) => {
  return (
    <div className="w-full h-96 rounded-xl overflow-hidden">
      <MapContainer center={position} zoom={17} className="w-full h-full">
        {/* Este componente mueve el mapa cuando cambia la posición */}
        <MapUpdater position={position} />

        <TileLayer
          attribution='&copy; <a href="http://osm.org/copyright">OpenStreetMap</a>'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        <Marker position={position} icon={carIcon}>
          <Popup>Position of the car</Popup>
        </Marker>
      </MapContainer>
    </div>
  );
};

export default MapGPS;
