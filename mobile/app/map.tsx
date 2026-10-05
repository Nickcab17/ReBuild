import { useEffect, useMemo, useRef, useState } from 'react';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useRouter } from 'expo-router';
import L, { type Map as LeafletMap, type Marker as LeafletMarker } from 'leaflet';
import 'leaflet/dist/leaflet.css';
import '../styles/map.css';
import { Logo } from '../components/Branding';
import { colors, radius, shadows, typography } from '../constants/theme';
import {
  coordinatesForLocation,
  readSavedDemoPublications,
  webDemoPublications,
  type DemoPublication,
} from '../data/webDemo';

type MapFilter = 'all' | 'offer' | 'need';
const mapElementId = 'rebuild-community-map';

function escapeHtml(value: string) {
  return value.replace(/[&<>"']/g, (character) => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;',
  })[character] ?? character);
}

function publicationCoordinates(publication: DemoPublication) {
  if (Number.isFinite(publication.latitude) && Number.isFinite(publication.longitude)) {
    return [publication.latitude as number, publication.longitude as number] as [number, number];
  }
  const coordinates = coordinatesForLocation(publication.location, publication.id);
  return [coordinates.latitude, coordinates.longitude] as [number, number];
}

export default function MapScreen() {
  const router = useRouter();
  const mapRef = useRef<LeafletMap | null>(null);
  const markersRef = useRef(new Map<string, LeafletMarker>());
  const [mapReady, setMapReady] = useState(false);
  const [publications, setPublications] = useState(webDemoPublications);
  const [filter, setFilter] = useState<MapFilter>('all');
  const [selected, setSelected] = useState<DemoPublication | null>(null);
  const [storageError, setStorageError] = useState('');

  const visiblePublications = useMemo(
    () => publications.filter((publication) => filter === 'all' || publication.intent === filter),
    [filter, publications],
  );

  useEffect(() => {
    try {
      setPublications([...webDemoPublications, ...readSavedDemoPublications()]);
    } catch {
      setStorageError('No se pudieron leer algunas publicaciones guardadas.');
    }
  }, []);

  useEffect(() => {
    const element = document.getElementById(mapElementId);
    if (!element) return undefined;

    const map = L.map(element, { scrollWheelZoom: false }).setView([19.4326, -99.1332], 12);
    mapRef.current = map;
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
      maxZoom: 19,
    }).addTo(map);
    map.whenReady(() => {
      map.invalidateSize();
      setMapReady(true);
    });

    return () => {
      map.remove();
      mapRef.current = null;
      markersRef.current.clear();
    };
  }, []);

  useEffect(() => {
    const map = mapRef.current;
    if (!mapReady || !map) return;
    markersRef.current.clear();
    map.eachLayer((layer) => {
      if (layer instanceof L.Marker) map.removeLayer(layer);
    });

    for (const publication of visiblePublications) {
      const [latitude, longitude] = publicationCoordinates(publication);
      const offer = publication.intent === 'offer';
      const icon = L.divIcon({
        className: 'rebuild-marker-shell',
        html: `<span class="rebuild-map-pin rebuild-pin-${offer ? 'offer' : 'need'}"><span></span></span>`,
        iconSize: [28, 28],
        iconAnchor: [14, 14],
      });
      const marker = L.marker([latitude, longitude], { icon }).addTo(map);
      marker.bindPopup(
        `<strong>${escapeHtml(publication.material)}</strong><br />${escapeHtml(publication.type)} · ${publication.quantity} ${escapeHtml(publication.unit)}<br />${escapeHtml(publication.location)}`,
      );
      marker.on('click', () => setSelected(publication));
      markersRef.current.set(publication.id, marker);
    }
  }, [mapReady, visiblePublications]);

  const selectPublication = (publication: DemoPublication) => {
    setSelected(publication);
    const coordinates = publicationCoordinates(publication);
    mapRef.current?.flyTo(coordinates, 14, { duration: 0.5 });
    markersRef.current.get(publication.id)?.openPopup();
  };

  const goBack = () => {
    if (router.canGoBack()) router.back();
    else router.replace('/');
  };

  const contact = (publication: DemoPublication) => {
    router.push({
      pathname: '/chat/[id]',
      params: { id: publication.id, person: publication.owner, material: publication.material },
    });
  };

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
      <View style={styles.header}>
        <TouchableOpacity accessibilityRole="button" accessibilityLabel="Volver" onPress={goBack} style={styles.back}>
          <Text style={styles.backText}>‹</Text>
        </TouchableOpacity>
        <Logo compact />
      </View>
      <View style={styles.body}>
        <Text style={styles.eyebrow}>MAPA DE LA COMUNIDAD</Text>
        <Text style={styles.title}>Materiales cerca de proyectos en CDMX.</Text>
        <Text style={styles.subtitle}>Ofertas y necesidades con ubicaciones aproximadas. No rastreamos tu ubicación.</Text>
        <View style={styles.legend}>
          <View style={styles.legendItem}><View style={styles.offerDot} /><Text style={styles.legendText}>Material disponible</Text></View>
          <View style={styles.legendItem}><View style={styles.needDot} /><Text style={styles.legendText}>Material que se necesita</Text></View>
        </View>
        <View nativeID={mapElementId} style={styles.mapPanel} />
        {storageError ? <Text accessibilityRole="alert" style={styles.storageError}>{storageError}</Text> : null}

        {selected ? (
          <View style={styles.selectedCard}>
              <View style={styles.selectedHeading}>
              <Text style={styles.selectedName}>{selected.material}</Text>
              <View style={[styles.intentPill, selected.intent === 'need' && styles.needPill]}>
                <Text style={styles.intentText}>{selected.intent === 'offer' ? 'Disponible' : 'Necesidad'}</Text>
              </View>
            </View>
            <Text style={styles.offerMeta}>{selected.type} · {selected.quantity} {selected.unit} · {selected.condition}</Text>
            <Text style={styles.offerLocation}>{selected.location}</Text>
            <Text style={styles.description}>{selected.description}</Text>
            <TouchableOpacity accessibilityRole="button" onPress={() => contact(selected)} style={styles.contactButton}>
              <Text style={styles.contactText}>Contactar</Text>
            </TouchableOpacity>
          </View>
        ) : null}

        <View style={styles.listHeading}>
          <Text style={styles.listTitle}>Ofertas y necesidades</Text>
          <Text style={styles.count}>{visiblePublications.length}</Text>
        </View>
        <View style={styles.filters}>
          {([
            ['all', 'Todas'],
            ['offer', 'Disponibles'],
            ['need', 'Necesidades'],
          ] as const).map(([value, label]) => (
            <TouchableOpacity
              key={value}
              accessibilityRole="button"
              accessibilityState={{ selected: filter === value }}
              onPress={() => setFilter(value)}
              style={[styles.filterChip, filter === value && styles.filterChipActive]}
            >
              <Text style={[styles.filterText, filter === value && styles.filterTextActive]}>{label}</Text>
            </TouchableOpacity>
          ))}
        </View>
        {visiblePublications.map((publication) => (
          <TouchableOpacity
            key={publication.id}
            accessibilityRole="button"
            onPress={() => selectPublication(publication)}
            style={[styles.offerCard, selected?.id === publication.id && styles.offerCardSelected]}
          >
            <View style={[styles.offerDot, publication.intent === 'need' && styles.needDot]} />
            <View style={styles.offerInfo}>
              <View style={styles.selectedHeading}>
                <Text style={styles.offerName}>{publication.material}</Text>
                <Text style={[styles.listIntent, publication.intent === 'need' && styles.listNeed]}>{publication.intent === 'offer' ? 'OFRECE' : 'NECESITA'}</Text>
              </View>
              <Text style={styles.offerMeta}>{publication.type} · {publication.quantity} {publication.unit} · {publication.condition}</Text>
              <Text style={styles.offerLocation}>{publication.location}</Text>
            </View>
          </TouchableOpacity>
        ))}
        <TouchableOpacity accessibilityRole="button" onPress={goBack} style={styles.backLink}>
          <Text style={styles.linkText}>← Volver a ReBuild</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  content: { paddingHorizontal: 24, paddingBottom: 40 },
  header: { width: '100%', maxWidth: 1180, alignSelf: 'center', minHeight: 80, flexDirection: 'row', alignItems: 'center', gap: 14, borderBottomWidth: 1, borderColor: colors.border },
  back: { width: 30, height: 40, justifyContent: 'center' },
  backText: { color: colors.primary, fontSize: 36 },
  body: { width: '100%', maxWidth: 900, alignSelf: 'center', paddingTop: 38 },
  eyebrow: { ...typography.small, color: colors.terracotta, letterSpacing: 1 },
  title: { ...typography.h1, marginTop: 10 },
  subtitle: { ...typography.bodyMuted, marginTop: 8 },
  legend: { flexDirection: 'row', flexWrap: 'wrap', gap: 16, marginTop: 18, marginBottom: 12 },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 7 },
  legendText: { ...typography.small, color: colors.text },
  offerDot: { width: 11, height: 11, borderRadius: 6, backgroundColor: colors.primary },
  needDot: { backgroundColor: colors.terracotta },
  mapPanel: { width: '100%', height: 420, overflow: 'hidden', borderRadius: radius.xl, backgroundColor: '#E4E8D9', ...shadows.card },
  storageError: { ...typography.small, color: colors.secondary, marginTop: 10 },
  selectedCard: { padding: 16, marginTop: 16, borderRadius: radius.xl, backgroundColor: colors.surface, ...shadows.card },
  selectedHeading: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 10 },
  selectedName: { ...typography.bodyBold, flex: 1 },
  intentPill: { paddingHorizontal: 9, paddingVertical: 5, borderRadius: 999, backgroundColor: colors.accent },
  needPill: { backgroundColor: '#F4E5DE' },
  intentText: { color: colors.primary, fontFamily: 'Sora_700Bold', fontSize: 10 },
  offerMeta: { ...typography.small, marginTop: 5 },
  offerLocation: { ...typography.small, fontSize: 11, marginTop: 2 },
  description: { ...typography.bodyMuted, marginTop: 8 },
  contactButton: { alignSelf: 'flex-start', marginTop: 14, paddingVertical: 11, paddingHorizontal: 20, borderRadius: 14, backgroundColor: colors.primary },
  contactText: { color: colors.white, fontFamily: 'Sora_700Bold', fontSize: 13 },
  listHeading: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 26, marginBottom: 12 },
  listTitle: { ...typography.h3 },
  count: { color: colors.primary, fontFamily: 'Sora_700Bold', fontSize: 12 },
  filters: { flexDirection: 'row', flexWrap: 'wrap', marginBottom: 4 },
  filterChip: { paddingHorizontal: 12, paddingVertical: 8, marginRight: 8, marginBottom: 8, borderRadius: 999, backgroundColor: colors.surface },
  filterChipActive: { backgroundColor: colors.primary },
  filterText: { color: colors.text, fontFamily: 'Sora_600SemiBold', fontSize: 11 },
  filterTextActive: { color: colors.white },
  offerCard: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 14, marginTop: 8, borderRadius: 16, backgroundColor: colors.surface, ...shadows.card },
  offerCardSelected: { borderWidth: 1, borderColor: colors.primary },
  offerInfo: { flex: 1 },
  offerName: { ...typography.bodyBold, flex: 1 },
  listIntent: { color: colors.primary, fontFamily: 'Sora_700Bold', fontSize: 9 },
  listNeed: { color: colors.terracotta },
  backLink: { alignSelf: 'flex-start', paddingVertical: 18 },
  linkText: { ...typography.label, color: colors.primary },
});
