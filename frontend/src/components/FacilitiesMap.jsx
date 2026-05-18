import { useEffect, useMemo, useRef, useState } from 'react';
import { Badge, Box, Card, Group, Stack, Text, Title } from '@mantine/core';
import { IconMapPin } from '@tabler/icons-react';

const YANDEX_MAPS_SRC = 'https://api-maps.yandex.ru/2.1/?lang=ru_RU';
const MARKER_SIZE = [34, 42];
const MARKER_OFFSET = [-17, -42];
const BALLOON_CLOSE_DELAY = 220;
const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://127.0.0.1:8000';

let yandexMapsPromise;

function loadYandexMaps() {
  if (window.ymaps) return Promise.resolve(window.ymaps);
  if (yandexMapsPromise) return yandexMapsPromise;

  yandexMapsPromise = new Promise((resolve, reject) => {
    const script = document.createElement('script');
    script.src = YANDEX_MAPS_SRC;
    script.async = true;
    script.onload = () => window.ymaps.ready(() => resolve(window.ymaps));
    script.onerror = reject;
    document.head.appendChild(script);
  });

  return yandexMapsPromise;
}

function getFacilityPrice(facility) {
  return facility.min_price ?? facility.price_per_hour;
}

function getImageUrl(imagePath) {
  return imagePath.startsWith('http') ? imagePath : `${API_BASE_URL}${imagePath}`;
}

function escapeHtml(value) {
  return String(value ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');
}

function getCenter(facilities) {
  return [
    facilities.reduce((sum, item) => sum + Number(item.latitude), 0) / facilities.length,
    facilities.reduce((sum, item) => sum + Number(item.longitude), 0) / facilities.length,
  ];
}

function getMarkerLabelContent(facility) {
  return `
    <div style="max-width:220px;padding:2px 4px;font-family:Arial,sans-serif;">
      <strong style="display:block;font-size:13px;line-height:1.25;">${escapeHtml(facility.name)}</strong>
      <div style="color:#666;margin-top:3px;font-size:12px;line-height:1.2;">${escapeHtml(facility.complex_name)}</div>
      <div style="color:#1971c2;font-weight:700;margin-top:5px;font-size:12px;">от ${escapeHtml(getFacilityPrice(facility))} ₽</div>
    </div>
  `;
}

function getFacilityImagesContent(facility) {
  const images = facility.images || [];
  if (images.length === 0) return '';

  const mainImage = images.find((image) => image.is_main) || images[0];
  const mainImageUrl = getImageUrl(mainImage.image);

  return `
    <img src="${escapeHtml(mainImageUrl)}" alt="${escapeHtml(facility.name)}" style="width:100%;height:150px;object-fit:cover;border-radius:7px;display:block;margin-bottom:10px;" />
  `;
}

function getActiveCardContent(facility) {
  const description = facility.description
    ? `<div style="font-size:12px;line-height:1.35;margin-top:6px;color:#1f2937;">${escapeHtml(facility.description)}</div>`
    : '';

  return `
    <div style="width:280px;max-width:calc(100vw - 48px);padding:12px;background:#fff;border:1px solid #dbe4ff;border-radius:8px;box-shadow:0 10px 28px rgba(15,23,42,.18);font-family:Arial,sans-serif;">
      ${getFacilityImagesContent(facility)}
      <div style="display:flex;gap:6px;align-items:center;">
        <span style="width:16px;height:16px;display:inline-flex;align-items:center;justify-content:center;color:#1971c2;">●</span>
        <strong style="font-size:14px;line-height:1.25;">${escapeHtml(facility.name)}</strong>
      </div>
      <div style="font-size:12px;color:#666;margin-top:4px;">${escapeHtml(facility.complex_name)}</div>
      ${description}
      <div style="display:flex;align-items:center;justify-content:space-between;margin-top:8px;">
        <span style="font-size:12px;font-weight:700;color:#1971c2;">от ${escapeHtml(getFacilityPrice(facility))} ₽</span>
        <span style="font-size:12px;color:#1f2937;">★ ${Number(facility.rating || 0).toFixed(1)}</span>
      </div>
      <a href="/facility/${facility.id}" style="display:block;text-align:center;margin-top:8px;padding:5px 8px;border-radius:6px;background:#1971c2;color:#fff;text-decoration:none;font-size:12px;font-weight:700;">Подробнее</a>
    </div>
  `;
}

function getMarkerIcon(color) {
  const svg = `
    <svg xmlns="http://www.w3.org/2000/svg" width="34" height="42" viewBox="0 0 34 42">
      <ellipse cx="17" cy="39" rx="10" ry="3" fill="#000" opacity="0.18"/>
      <path d="M17 1C8.2 1 1 8.1 1 16.9c0 11.9 16 24.2 16 24.2s16-12.3 16-24.2C33 8.1 25.8 1 17 1z" fill="${color}"/>
      <circle cx="17" cy="16.8" r="6.1" fill="#fff"/>
    </svg>
  `;

  return `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(svg)}`;
}

function createActiveCardControl(ymaps) {
  const layout = ymaps.templateLayoutFactory.createClass(
    '<div style="pointer-events:auto;">$[data.content]</div>'
  );

  return new ymaps.control.Button({
    data: { content: '' },
    options: {
      layout,
      maxWidth: 340,
      position: { top: 16, left: 16 },
      selectOnClick: false,
    },
  });
}

function renderActiveCard(control, facility) {
  if (!control) return;
  control.data.set('content', facility ? getActiveCardContent(facility) : '');
}

function updateMarkerColors(markers, activeFacilityId, selectedFacilityId) {
  markers.forEach(({ facility, placemark }) => {
    const isActive = String(facility.id) === String(activeFacilityId || selectedFacilityId);
    placemark.options.set('iconImageHref', getMarkerIcon(isActive ? '#fa5252' : '#064c9b'));
  });
}

export function FacilitiesMap({ facilities, title = 'Карта объектов', selectedFacilityId }) {
  const mapRef = useRef(null);
  const mapInstanceRef = useRef(null);
  const markersRef = useRef([]);
  const activeCardControlRef = useRef(null);
  const activeFacilityRef = useRef(null);
  const [mapError, setMapError] = useState(false);

  const mappedFacilities = useMemo(
    () => facilities.filter((facility) => facility.latitude && facility.longitude),
    [facilities]
  );

  useEffect(() => {
    if (mappedFacilities.length === 0) {
      return undefined;
    }

    let disposed = false;
    let closeTimer;

    loadYandexMaps()
      .then((ymaps) => {
        if (disposed || !mapRef.current) return;

        const center = getCenter(mappedFacilities);

        if (!mapInstanceRef.current) {
          mapInstanceRef.current = new ymaps.Map(mapRef.current, {
            center,
            zoom: mappedFacilities.length > 1 ? 11 : 15,
            controls: ['zoomControl', 'fullscreenControl'],
          });
        } else {
          mapInstanceRef.current.setCenter(center);
          mapInstanceRef.current.setZoom(mappedFacilities.length > 1 ? 11 : 15);
          mapInstanceRef.current.geoObjects.removeAll();
        }

        if (!activeCardControlRef.current) {
          activeCardControlRef.current = createActiveCardControl(ymaps);
          mapInstanceRef.current.controls.add(activeCardControlRef.current);
        }

        markersRef.current = mappedFacilities.map((facility) => {
          const isSelected = String(selectedFacilityId) === String(facility.id);
          const placemark = new ymaps.Placemark(
            [Number(facility.latitude), Number(facility.longitude)],
            {
              balloonContent: getMarkerLabelContent(facility),
            },
            {
              iconLayout: 'default#image',
              iconImageHref: getMarkerIcon(isSelected ? '#fa5252' : '#064c9b'),
              iconImageSize: MARKER_SIZE,
              iconImageOffset: MARKER_OFFSET,
              hideIconOnBalloonOpen: false,
              balloonCloseButton: false,
              balloonShadow: false,
              balloonOffset: [0, -44],
              balloonAutoPan: false,
            }
          );

          placemark.events.add('mouseenter', () => {
            window.clearTimeout(closeTimer);
            if (!placemark.balloon.isOpen()) {
              placemark.balloon.open();
            }
          });
          placemark.events.add('mouseleave', () => {
            closeTimer = window.setTimeout(() => placemark.balloon.close(), BALLOON_CLOSE_DELAY);
          });
          placemark.events.add('click', () => {
            activeFacilityRef.current = facility;
            renderActiveCard(activeCardControlRef.current, facility);
            updateMarkerColors(markersRef.current, facility.id, selectedFacilityId);
          });

          mapInstanceRef.current.geoObjects.add(placemark);
          return { facility, placemark };
        });

        if (mappedFacilities.length > 1) {
          mapInstanceRef.current.setBounds(mapInstanceRef.current.geoObjects.getBounds(), {
            checkZoomRange: true,
            zoomMargin: 40,
          });
        }

        const selectedFacility = mappedFacilities.find((facility) => String(facility.id) === String(selectedFacilityId));
        activeFacilityRef.current = selectedFacility || activeFacilityRef.current;
        renderActiveCard(activeCardControlRef.current, activeFacilityRef.current);
        updateMarkerColors(markersRef.current, activeFacilityRef.current?.id, selectedFacilityId);
      })
      .catch(() => setMapError(true));

    return () => {
      disposed = true;
      window.clearTimeout(closeTimer);
    };
  }, [mappedFacilities, selectedFacilityId]);

  useEffect(() => () => {
    if (mapInstanceRef.current) {
      mapInstanceRef.current.destroy();
      mapInstanceRef.current = null;
      activeCardControlRef.current = null;
    }
  }, []);

  useEffect(() => {
    if (mappedFacilities.length === 0) {
      activeFacilityRef.current = null;
      renderActiveCard(activeCardControlRef.current, null);
    }
  }, [mappedFacilities.length]);

  return (
    <Card withBorder radius="md" p="lg">
      <Group justify="space-between" mb="md">
        <Title order={4}>{title}</Title>
        <Badge variant="light" color="blue">{mappedFacilities.length} на карте</Badge>
      </Group>

      <Box
        pos="relative"
        h={{ base: 320, md: 420 }}
        style={{
          overflow: 'hidden',
          borderRadius: 8,
          border: '1px solid #dbe4ff',
          backgroundColor: '#f8f9fa',
        }}
      >
        {mappedFacilities.length === 0 || mapError ? (
          <Stack align="center" justify="center" h="100%" gap={4}>
            <IconMapPin size={34} color="#868e96" />
            <Text c="dimmed" ta="center">
              {mapError ? 'Не удалось загрузить Яндекс.Карты.' : 'У объектов пока не указаны координаты.'}
            </Text>
          </Stack>
        ) : (
          <Box ref={mapRef} h="100%" style={{ position: 'relative' }} />
        )}
      </Box>
    </Card>
  );
}
