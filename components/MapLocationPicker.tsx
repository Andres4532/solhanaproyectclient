'use client';

import { useState, useEffect, useRef } from 'react';

interface MapLocationPickerProps {
  onLocationSelect: (address: string, lat: number, lng: number) => void;
  initialAddress?: string;
}

export default function MapLocationPicker({ onLocationSelect, initialAddress }: MapLocationPickerProps) {
  const mapRef = useRef<HTMLDivElement>(null);
  const [map, setMap] = useState<any>(null);
  const [marker, setMarker] = useState<any>(null);
  const [searchInput, setSearchInput] = useState(initialAddress || '');
  const [showMap, setShowMap] = useState(false);
  const [locationError, setLocationError] = useState<string | null>(null);

  // Cargar Google Maps
  useEffect(() => {
    // Verificar si Google Maps ya está cargado
    if (typeof window !== 'undefined' && !(window as any).google) {
      const script = document.createElement('script');
      script.src = `https://maps.googleapis.com/maps/api/js?key=${process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY}&libraries=places`;
      script.async = true;
      script.onload = initMap;
      document.body.appendChild(script);
    } else if ((window as any).google && mapRef.current && !map) {
      initMap();
    }
  }, [map]);

  // Cuando se muestra el mapa, inicializarlo o forzar resize/recenter
  useEffect(() => {
    if (!showMap) return;

    // Si el script ya cargó y aún no tenemos mapa, inicializar
    if ((window as any).google && mapRef.current && !map) {
      initMap();
      return;
    }

    // Si ya existe el mapa, forzar resize y recentrar para evitar mapa en blanco
    if (map) {
      try {
        (window as any).google.maps.event.trigger(map, 'resize');
        // recentrar en la posición del marcador si existe
        const pos = marker?.getPosition ? marker.getPosition() : null;
        if (pos) {
          const lat = typeof pos.lat === 'function' ? pos.lat() : pos.lat;
          const lng = typeof pos.lng === 'function' ? pos.lng() : pos.lng;
          map.setCenter({ lat, lng });
        }
      } catch (e) {
        // noop
      }
    }
  }, [showMap, map, marker]);

  const initMap = () => {
    if (!mapRef.current) return;

    const defaultLocation = { lat: -15.8402, lng: -48.0829 }; // Centro de Bolivia
    const newMap = new (window as any).google.maps.Map(mapRef.current, {
      zoom: 12,
      center: defaultLocation,
      mapTypeControl: true,
      fullscreenControl: true,
      streetViewControl: true,
    });

    setMap(newMap);

    // Crear marcador inicial
    const newMarker = new (window as any).google.maps.Marker({
      position: defaultLocation,
      map: newMap,
      draggable: true,
      title: 'Ubicación seleccionada',
    });

    setMarker(newMarker);

    // Listener para cuando se mueve el marcador
    newMarker.addListener('dragend', () => {
      const position = newMarker.getPosition();
      if (position) {
        geocodeLatLng(position, newMarker);
      }
    });

    // Listener para clicks en el mapa
    newMap.addListener('click', (e: any) => {
      const latLng = e.latLng;
      newMarker.setPosition(latLng);
      geocodeLatLng(latLng, newMarker);
    });

    // Intentar centrar en la ubicación del usuario si el navegador lo permite
    if (typeof navigator !== 'undefined' && navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          try {
            const lat = pos.coords.latitude;
            const lng = pos.coords.longitude;
            const latLng = { lat, lng };
            newMap.setCenter(latLng);
            newMarker.setPosition(latLng);
            // Obtener dirección mediante geocoding
            geocodeLatLng(latLng, newMarker);
            setLocationError(null);
          } catch (e) {
            // noop
          }
        },
        async (err) => {
          // usuario negó o error; intentar fallback por IP
          setLocationError(err?.message || 'No se pudo obtener la ubicación por GPS, intentando ubicación aproximada...');
          try {
            const res = await fetch('https://ipapi.co/json/');
            if (res.ok) {
              const data = await res.json();
              const lat = parseFloat(data.latitude) || parseFloat(data.lat) || data.latitude;
              const lng = parseFloat(data.longitude) || parseFloat(data.lon) || data.longitude || data.lon;
              if (lat && lng) {
                const latLng = { lat, lng };
                newMap.setCenter(latLng);
                newMarker.setPosition(latLng);
                geocodeLatLng(latLng, newMarker);
                setLocationError(null);
                return;
              }
            }
          } catch (e) {
            // noop
          }
        },
        { enableHighAccuracy: true, timeout: 10000 }
      );
    } else {
     
    }
  };

  const geocodeLatLng = async (location: any, marker: any) => {
    const geocoder = new (window as any).google.maps.Geocoder();

    geocoder.geocode({ location }, (results: any, status: any) => {
      if (status === 'OK' && results[0]) {
        const address = results[0].formatted_address;
        setSearchInput(address);
        // location may be LatLng or LatLngLiteral
        const lat = typeof location.lat === 'function' ? location.lat() : location.lat;
        const lng = typeof location.lng === 'function' ? location.lng() : location.lng;
        onLocationSelect(address, lat, lng);
      }
    });
  };

  const handleSearch = async () => {
    if (!searchInput.trim() || !map) return;

    const geocoder = new (window as any).google.maps.Geocoder();

    geocoder.geocode({ address: searchInput }, (results: any, status: any) => {
      if (status === 'OK' && results[0]) {
        const location = results[0].geometry.location;
        map.setCenter(location);
        
        if (marker) {
          marker.setPosition(location);
        }
        
        const lat = typeof location.lat === 'function' ? location.lat() : location.lat;
        const lng = typeof location.lng === 'function' ? location.lng() : location.lng;
        onLocationSelect(results[0].formatted_address, lat, lng);
      } else {
        alert('No se encontró la dirección. Intenta nuevamente.');
      }
    });
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleSearch();
    }
  };

  // Método removido

  return (
    <div className="space-y-3">
      <button
        type="button"
        onClick={() => setShowMap(!showMap)}
        className="w-full px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors text-sm font-medium flex items-center justify-center gap-2"
      >
        <span className="material-symbols-outlined">location_on</span>
        {showMap ? 'Ocultar Mapa' : 'Seleccionar Ubicación en Mapa'}
      </button>

      {showMap && (
        <div className="space-y-3 bg-gray-50 dark:bg-gray-800/50 p-4 rounded-lg">
          {/* Barra de búsqueda */}
          <div className="flex gap-2">
            <input
              type="text"
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder="Busca una dirección..."
              className="flex-1 rounded-lg border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white shadow-sm focus:border-blue-600 focus:ring-blue-600 px-3 py-2 text-sm"
            />
            <button
              type="button"
              onClick={handleSearch}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors text-sm font-medium"
            >
              Buscar
            </button>
          </div>

          {/* Mapa */}
          <div
            ref={mapRef}
            className="w-full h-96 rounded-lg border border-gray-300 dark:border-gray-600 shadow-sm"
          />

          <p className="text-xs text-gray-600 dark:text-gray-400">
            Haz clic en el mapa o arrastra el marcador para seleccionar tu ubicación
          </p>
          {locationError && (
            <p className="text-sm text-red-600 dark:text-red-400">{locationError}. Asegúrate de que el sitio se cargue sobre HTTPS o en localhost y que hayas permitido el acceso a la ubicación.</p>
          )}
        </div>
      )}
    </div>
  );
}
