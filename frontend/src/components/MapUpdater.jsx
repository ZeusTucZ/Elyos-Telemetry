import { useMap } from 'react-leaflet';
import { useEffect } from 'react';

const MapUpdater = ({ position }) => {
  const map = useMap();

  useEffect(() => {
    if (position && position.length === 2) {
      const [lat, lng] = position;
      if (Number.isFinite(lat) && Number.isFinite(lng)) {
        map.setView(position, map.getZoom());
      }
    }
  }, [position, map]);

  return null;
};

export default MapUpdater;
