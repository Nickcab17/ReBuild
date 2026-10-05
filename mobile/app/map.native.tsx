import { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import MapView, { Callout, Marker, Region } from 'react-native-maps';
import * as Location from 'expo-location';
import { Link, useLocalSearchParams } from 'expo-router';
import { colors } from '../constants/theme';
import { api } from '../services/api';
import type { Material } from '../types';

const defaultRegion: Region = { latitude: 19.4326, longitude: -99.1332, latitudeDelta: 0.25, longitudeDelta: 0.25 };
type ListedMaterial = Material & { distanceKm?: number };

export default function NativeMapScreen() {
  const { materialId } = useLocalSearchParams<{ materialId?: string }>();
  const [region, setRegion] = useState(defaultRegion);
  const [materials, setMaterials] = useState<ListedMaterial[]>([]);
  const [locationDenied, setLocationDenied] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    const load = async () => {
      const permission = await Location.requestForegroundPermissionsAsync();
      let nextRegion = defaultRegion;
      if (permission.granted) {
        const current = await Location.getCurrentPositionAsync({});
        nextRegion = { ...nextRegion, latitude: current.coords.latitude, longitude: current.coords.longitude };
      } else {
        setLocationDenied(true);
      }
      setRegion(nextRegion);
      // The demo shows all available seed materials; GPS only controls the initial viewport.
      const data = await api.listMaterials();
      setMaterials((data as ListedMaterial[]).filter((material) => material.latitude !== undefined && material.longitude !== undefined));
      setLoading(false);
    };
    load().catch(() => { setLoading(false); setError(true); Alert.alert('No se pudo cargar el mapa', 'Revisa tu conexión e inténtalo nuevamente.'); });
  }, []);

  return <View style={styles.container}>
    {locationDenied && <View style={styles.notice}><Text style={styles.noticeText}>No compartiste tu ubicación. Mostramos materiales cerca de Ciudad de México.</Text></View>}
    {loading && <View style={styles.state}><ActivityIndicator color={colors.primary} /><Text style={styles.stateText}>Cargando materiales...</Text></View>}
    {error && <View style={styles.state}><Text style={styles.stateText}>No pudimos cargar los materiales del mapa.</Text></View>}
    {!loading && !error && materials.length === 0 && <View style={styles.state}><Text style={styles.stateText}>No hay materiales con ubicación disponible.</Text></View>}
    <MapView style={styles.map} region={region} onRegionChangeComplete={setRegion}>
      {materials.map((material) => <Marker key={material.id} coordinate={{ latitude: material.latitude!, longitude: material.longitude! }} pinColor={material.id === materialId ? colors.danger : colors.primary}>
        <Callout><View style={styles.callout}><Text style={styles.calloutTitle}>{material.name}</Text><Text style={styles.calloutText}>{material.category} · {material.location}</Text><Link href={{ pathname: '/material/[id]', params: { id: material.id } }} asChild><TouchableOpacity><Text style={styles.link}>Ver material</Text></TouchableOpacity></Link></View></Callout>
      </Marker>)}
    </MapView>
  </View>;
}

const styles = StyleSheet.create({ container: { flex: 1, backgroundColor: colors.background }, map: { flex: 1 }, notice: { backgroundColor: colors.surface, padding: 12, zIndex: 1 }, noticeText: { color: colors.text, textAlign: 'center' }, state: { position: 'absolute', top: 80, left: 20, right: 20, zIndex: 2, backgroundColor: colors.surface, borderRadius: 12, padding: 16, alignItems: 'center' }, stateText: { color: colors.text, textAlign: 'center' }, callout: { width: 180, padding: 4 }, calloutTitle: { color: colors.text, fontWeight: '800' }, calloutText: { color: colors.muted, marginTop: 4 }, link: { color: colors.primary, fontWeight: '700', marginTop: 8 } });
