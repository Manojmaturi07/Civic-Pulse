import { useEffect, useRef } from 'react'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'

export default function LeafletMap({
  height = '420px',
  center = [16.44, 80.55], // Capital Region (Vijayawada-Guntur)
  zoom = 11,
  hotspots = [],
  issues = [],
  activeItem = null,
  onItemSelect = null,
  pickerMode = false,
  selectedLocation = null,
  onLocationSelect = null,
}) {
  const mapContainerRef = useRef(null)
  const mapInstanceRef = useRef(null)
  const markersLayerRef = useRef(null)
  const circlesLayerRef = useRef(null)
  const pickerMarkerRef = useRef(null)

  // Initialize Map
  useEffect(() => {
    if (!mapContainerRef.current) return

    // Clean up if already exists
    if (mapInstanceRef.current) {
      mapInstanceRef.current.remove()
      mapInstanceRef.current = null
    }

    // Create Leaflet Map
    const map = L.map(mapContainerRef.current, {
      center: center,
      zoom: zoom,
      scrollWheelZoom: true,
      zoomControl: true,
    })

    // OpenStreetMap standard tile layer
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 19,
      attribution:
        '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
    }).addTo(map)

    const circlesLayer = L.layerGroup().addTo(map)
    const markersLayer = L.layerGroup().addTo(map)

    mapInstanceRef.current = map
    markersLayerRef.current = markersLayer
    circlesLayerRef.current = circlesLayer

    // In picker mode, allow clicking to set location
    if (pickerMode) {
      map.on('click', (e) => {
        const { lat, lng } = e.latlng

        // Reverse identify rough area if near known locations
        let detectedCity = 'Vijayawada'
        let detectedArea = 'Geotagged Location'

        if (lat < 16.38 && lng < 80.50) {
          detectedCity = 'Guntur'
          detectedArea = 'Guntur Central'
        } else if (lat < 16.28) {
          detectedCity = 'Tenali'
          detectedArea = 'Tenali Town'
        } else if (lat >= 16.38 && lat <= 16.46) {
          detectedCity = 'Mangalagiri'
          detectedArea = 'NH-16 Corridor'
        } else {
          detectedCity = 'Vijayawada'
          detectedArea = 'Krishna District'
        }

        if (onLocationSelect) {
          onLocationSelect({
            lat: parseFloat(lat.toFixed(5)),
            lng: parseFloat(lng.toFixed(5)),
            city: detectedCity,
            area: detectedArea,
          })
        }
      })
    }

    return () => {
      map.remove()
      mapInstanceRef.current = null
    }
  }, [pickerMode])

  // Update Center if requested externally
  useEffect(() => {
    if (!mapInstanceRef.current || !activeItem) return
    if (activeItem.lat && activeItem.lng) {
      mapInstanceRef.current.setView([activeItem.lat, activeItem.lng], 13, {
        animate: true,
      })
    }
  }, [activeItem])

  // Render Hotspots & Circles
  useEffect(() => {
    if (!mapInstanceRef.current || !markersLayerRef.current || !circlesLayerRef.current) return

    markersLayerRef.current.clearLayers()
    circlesLayerRef.current.clearLayers()

    // 1. Render Hotspot Clusters
    hotspots.forEach((h) => {
      if (!h.lat || !h.lng) return

      const priority = (h.priority || 'medium').toLowerCase()
      const color =
        priority === 'critical'
          ? '#c2412d'
          : priority === 'high'
          ? '#c97a12'
          : '#d4a017'

      // Density circle
      const radius = priority === 'critical' ? 1400 : priority === 'high' ? 1000 : 700
      const circle = L.circle([h.lat, h.lng], {
        radius: radius,
        color: color,
        fillColor: color,
        fillOpacity: 0.2,
        weight: 2,
      }).addTo(circlesLayerRef.current)

      circle.bindTooltip(`<b>${h.name}</b><br/>${h.issues} Clustered Issues (${h.priority})`, {
        direction: 'top',
        className: 'leaflet-custom-tooltip',
      })

      // Hotspot pin marker
      const isSelected = activeItem && activeItem.name === h.name
      const iconHtml = `
        <div class="custom-map-pin pin-${priority} ${isSelected ? 'pin-selected' : ''}">
          <span>${h.issues}</span>
        </div>
      `

      const customIcon = L.divIcon({
        className: 'custom-leaflet-divicon',
        html: iconHtml,
        iconSize: [32, 32],
        iconAnchor: [16, 16],
      })

      const marker = L.marker([h.lat, h.lng], { icon: customIcon }).addTo(
        markersLayerRef.current,
      )

      const popupHtml = `
        <div style="font-family: Manrope, sans-serif; font-size: 13px; line-height: 1.5; min-width: 200px;">
          <strong style="font-size: 14px; color: #12241c; display: block; margin-bottom: 4px;">${h.name}</strong>
          <div style="display: flex; gap: 6px; margin-bottom: 8px;">
            <span style="background: ${color}20; color: ${color}; font-weight: 800; padding: 2px 8px; border-radius: 99px; font-size: 11px;">
              ${h.priority.toUpperCase()} HOTSPOT
            </span>
            <span style="background: #eef3ef; color: #0f3d2e; font-weight: 700; padding: 2px 8px; border-radius: 99px; font-size: 11px;">
              ${h.issues} REPORTS
            </span>
          </div>
          <div style="color: #5c6d64; font-size: 12px;">
            Recurring cluster index requiring coordinated departmental crew dispatch.
          </div>
        </div>
      `
      marker.bindPopup(popupHtml)

      marker.on('click', () => {
        if (onItemSelect) onItemSelect(h)
      })
    })

    // 2. Render Individual Issues
    issues.forEach((i) => {
      if (!i.lat || !i.lng) return

      const status = (i.status || 'pending').toLowerCase().replace(/\s+/g, '-')
      const statusColor =
        status === 'resolved'
          ? '#1f7a4d'
          : status === 'in-progress' || status === 'assigned'
          ? '#28527a'
          : '#c97a12'

      const isSelected = activeItem && activeItem.id === i.id

      // Type-based emoji
      const typeIcons = {
        'Road Damage': '🕳️',
        'Water Leakage': '💧',
        'Drainage Blockage': '🌊',
        'Garbage Accumulation': '🚯',
        'Streetlight Failure': '💡',
      }
      const iconChar = typeIcons[i.type] || '⚠️'

      const markerHtml = `
        <div class="custom-issue-pin issue-pin-${status} ${isSelected ? 'pin-selected' : ''}" style="border-color: ${statusColor}">
          <span style="font-size: 14px;">${iconChar}</span>
        </div>
      `

      const customIcon = L.divIcon({
        className: 'custom-leaflet-divicon',
        html: markerHtml,
        iconSize: [28, 28],
        iconAnchor: [14, 14],
      })

      const marker = L.marker([i.lat, i.lng], { icon: customIcon }).addTo(
        markersLayerRef.current,
      )

      const popupHtml = `
        <div style="font-family: Manrope, sans-serif; font-size: 13px; line-height: 1.5; min-width: 220px;">
          <div style="display: flex; justify-content: space-between; align-items: baseline; margin-bottom: 4px;">
            <strong style="color: #0f3d2e;">${i.id}</strong>
            <span style="font-size: 11px; font-weight: 700; color: ${statusColor}; text-transform: uppercase;">${i.status}</span>
          </div>
          <strong style="font-size: 14px; color: #12241c; display: block;">${i.type}</strong>
          <div style="color: #5c6d64; font-size: 12px; margin: 4px 0;">📍 ${i.area}, ${i.city}</div>
          <div style="font-size: 12px; color: #333; margin-top: 6px; padding-top: 6px; border-top: 1px solid #e0e6e1;">
            ${i.description}
          </div>
          <div style="display: flex; justify-content: space-between; margin-top: 8px; font-size: 11px; color: #777;">
            <span>Dept: ${i.department || 'Public Works'}</span>
            <span>Priority: <b>${i.priority}</b></span>
          </div>
        </div>
      `
      marker.bindPopup(popupHtml)

      marker.on('click', () => {
        if (onItemSelect) onItemSelect(i)
      })
    })

    // 3. Render Selected Location in Picker Mode
    if (pickerMode && selectedLocation && selectedLocation.lat && selectedLocation.lng) {
      if (pickerMarkerRef.current) {
        pickerMarkerRef.current.remove()
      }

      const pickerIcon = L.divIcon({
        className: 'custom-leaflet-divicon',
        html: `
          <div class="custom-picker-pin">
            <span>📍</span>
          </div>
        `,
        iconSize: [36, 36],
        iconAnchor: [18, 36],
      })

      const pickerMarker = L.marker([selectedLocation.lat, selectedLocation.lng], {
        icon: pickerIcon,
      }).addTo(markersLayerRef.current)

      pickerMarker
        .bindPopup(
          `<b>Pinned Location</b><br/>Lat: ${selectedLocation.lat}<br/>Lng: ${selectedLocation.lng}`,
        )
        .openPopup()

      pickerMarkerRef.current = pickerMarker
    }
  }, [hotspots, issues, activeItem, pickerMode, selectedLocation])

  return (
    <div
      ref={mapContainerRef}
      style={{
        height: height,
        width: '100%',
        borderRadius: '16px',
        overflow: 'hidden',
        border: '1px solid var(--line)',
        boxShadow: 'inset 0 1px 3px rgba(0, 0, 0, 0.05)',
        zIndex: 1,
      }}
    />
  )
}
