import { useEffect, useMemo, useState } from 'react';
import { Image, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View, useWindowDimensions, type ImageSourcePropType } from 'react-native';
import { useRouter } from 'expo-router';
import { SymbolView } from 'expo-symbols';
import * as ImagePicker from 'expo-image-picker';
import { AppHeader, BrandLogo, PrimaryButton } from '../components/Branding';
import { CategoryChip, EmptyState, materialPlaceholder } from '../components/RebuildUI';
import { colors, categories, radius, shadows, typography } from '../constants/theme';
import { findDemoMatches, readSavedDemoPublications, webDemoPublications, WEB_DEMO_PUBLICATIONS_STORAGE_KEY, coordinatesForLocation, type DemoMatch, type DemoPublication, type PublicationIntent } from '../data/webDemo';

type Stage = 'home' | 'publish' | 'explore' | 'matches' | 'detail' | 'connect';
type PublicationForm = Omit<DemoPublication, 'id' | 'owner' | 'intent' | 'quantity'> & { quantity: string };

const emptyForm: PublicationForm = {
  material: '',
  type: '',
  quantity: '',
  unit: '',
  condition: '',
  location: '',
  description: '',
};

const conditions = ['Excelente', 'Buena', 'Usada', 'Necesita reparación'];
const units = ['m²', 'pieza', 'unidad', 'tablas', 'botes', 'metros', 'kilogramos', 'sets'];
const locations = ['Ciudad de México', 'Roma Norte, CDMX', 'Coyoacán, CDMX', 'Guadalajara', 'Monterrey'];
const demoOffers = webDemoPublications.filter((publication) => publication.intent === 'offer');
const publicationPhotos: Record<string, ImageSourcePropType> = {
  'mat-01': require('../assets/materials/wood.jpg'),
  'mat-02': require('../assets/materials/bricks.jpg'),
  'mat-03': require('../assets/materials/paint.jpg'),
  'web-azulejo-01': require('../assets/materials/tile.jpg'),
  'web-azulejo-02': require('../assets/materials/tile.jpg'),
  'web-azulejo-03': require('../assets/materials/tile.jpg'),
  'web-brick-01': require('../assets/materials/bricks.jpg'),
  'web-wood-01': require('../assets/materials/wood.jpg'),
  'web-paint-01': require('../assets/materials/paint.jpg'),
};

function publicationPhoto(publication: Pick<DemoPublication, 'photoUri'> & Partial<Pick<DemoPublication, 'id'>>) {
  if (publication.photoUri) return { uri: publication.photoUri };
  return publication.id ? publicationPhotos[publication.id] : undefined;
}

function compressPhoto(source: string) {
  return new Promise<string>((resolve, reject) => {
    const image = new window.Image();
    image.onload = () => {
      const scale = Math.min(1, 1400 / Math.max(image.naturalWidth, image.naturalHeight));
      const canvas = document.createElement('canvas');
      canvas.width = Math.max(1, Math.round(image.naturalWidth * scale));
      canvas.height = Math.max(1, Math.round(image.naturalHeight * scale));
      const context = canvas.getContext('2d');
      if (!context) {
        reject(new Error('No se pudo preparar la imagen.'));
        return;
      }
      context.drawImage(image, 0, 0, canvas.width, canvas.height);
      resolve(canvas.toDataURL('image/jpeg', 0.78));
    };
    image.onerror = () => reject(new Error('No se pudo abrir la imagen seleccionada.'));
    image.src = source;
  });
}

function displayCategory(publication: DemoPublication) {
  if (publication.type === 'Cerámico' || publication.type === 'Ladrillo') return 'Construcción';
  if (publication.type === 'Tubería') return 'Plástico';
  return categories.includes(publication.type as typeof categories[number]) ? publication.type : 'Otros';
}

function demoReason(match: DemoMatch) {
  return match.reason
    .replace('material compatible', 'material compatible')
    .replace('tipo coincidente', 'tipo coincidente')
    .replace('misma zona de CDMX', 'misma ubicación aproximada');
}

export default function WebDemoHome() {
  const router = useRouter();
  const { width } = useWindowDimensions();
  const desktop = width >= 760;
  const [stage, setStage] = useState<Stage>('home');
  const [intent, setIntent] = useState<PublicationIntent>('need');
  const [form, setForm] = useState<PublicationForm>(emptyForm);
  const [category, setCategory] = useState('');
  const [matches, setMatches] = useState<DemoMatch[]>([]);
  const [selectedMatch, setSelectedMatch] = useState<DemoMatch | null>(null);
  const [activeChats, setActiveChats] = useState<DemoPublication[]>([]);
  const [localPublications, setLocalPublications] = useState<DemoPublication[]>([]);
  const [photoError, setPhotoError] = useState('');
  const [publicationNotice, setPublicationNotice] = useState('');
  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('Todos');
  const [error, setError] = useState('');

  const visibleOffers = useMemo(() => [...localPublications.filter((publication) => publication.intent === 'offer').reverse(), ...demoOffers].filter((offer) => {
    const matchesSearch = `${offer.material} ${offer.type} ${offer.description} ${offer.location}`
      .toLowerCase()
      .includes(search.trim().toLowerCase());
    return matchesSearch && (selectedCategory === 'Todos' || displayCategory(offer) === selectedCategory);
  }), [localPublications, search, selectedCategory]);

  useEffect(() => {
    try {
      setLocalPublications(readSavedDemoPublications());
    } catch {
      setPublicationNotice('No se pudieron leer las publicaciones guardadas en este navegador.');
    }
  }, []);

  const update = (field: keyof PublicationForm, value: string) => {
    setForm((current) => ({ ...current, [field]: value }));
    setError('');
  };

  const startPublish = (nextIntent: PublicationIntent) => {
    setIntent(nextIntent);
    setForm(emptyForm);
    setCategory('');
    setError('');
    setPhotoError('');
    setStage('publish');
  };

  const selectPhoto = async () => {
    setPhotoError('');
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsEditing: false,
        quality: 0.7,
        base64: true,
      });
      if (result.canceled) return;
      const asset = result.assets[0];
      if (!asset?.base64) {
        setPhotoError('No pudimos leer la imagen seleccionada. Intenta con otra fotografía.');
        return;
      }
      if (asset.mimeType && !/^image\/(?:jpeg|png|webp|gif)$/i.test(asset.mimeType)) {
        setPhotoError('Elige una imagen JPG, PNG, WEBP o GIF.');
        return;
      }
      const mimeType = asset.mimeType ?? 'image/jpeg';
      const photoUri = await compressPhoto(`data:${mimeType};base64,${asset.base64}`);
      setForm((current) => ({ ...current, photoUri }));
    } catch {
      setPhotoError('No se pudo abrir la fotografía. Intenta de nuevo.');
    }
  };

  const publish = () => {
    const quantity = Number(form.quantity.replace(',', '.'));
    if (!form.material.trim() || !category || !form.type.trim() || !Number.isFinite(quantity) || quantity <= 0 || !form.unit.trim() || !form.condition.trim() || !form.location.trim() || !form.description.trim()) {
      setError('Completa material, descripción, categoría, tipo, cantidad, unidad, condición y ubicación para continuar.');
      return;
    }

    const publicationId = `web-${Date.now()}`;
    const publication: DemoPublication = {
      ...form,
      quantity,
      material: form.material.trim(),
      type: form.type.trim(),
      unit: form.unit.trim(),
      location: form.location.trim(),
      description: form.description.trim(),
      id: publicationId,
      intent,
      owner: 'Tú',
      ...coordinatesForLocation(form.location.trim(), publicationId),
    };
    const nextPublications = [...localPublications.filter((saved) => saved.id !== publication.id), publication];
    setLocalPublications(nextPublications);
    try {
      window.localStorage.setItem(WEB_DEMO_PUBLICATIONS_STORAGE_KEY, JSON.stringify(nextPublications));
      setPublicationNotice('');
    } catch {
      setPublicationNotice('La publicación está disponible durante esta sesión, pero el navegador no pudo guardarla para la próxima visita.');
    }
    setMatches(findDemoMatches(publication, [...webDemoPublications, ...localPublications]));
    setStage('matches');
  };

  const openListing = (offer: DemoPublication) => {
    setForm({
      material: offer.material,
      type: offer.type,
      quantity: String(offer.quantity),
      unit: offer.unit,
      condition: offer.condition,
      location: offer.location,
      description: offer.description,
      photoUri: offer.photoUri,
    });
    setCategory(displayCategory(offer));
    setIntent('need');
    setStage('publish');
  };

  const contact = (publication: DemoPublication) => {
    setActiveChats((current) => current.some((chat) => chat.id === publication.id) ? current : [...current, publication]);
    router.push({
      pathname: '/chat/[id]',
      params: {
        id: publication.id,
        person: publication.owner,
        material: publication.material,
      },
    });
  };

  const openDetail = (match: DemoMatch) => {
    setSelectedMatch(match);
    setStage('detail');
  };

  const tabs = [
    { label: 'Inicio', icon: { ios: 'house.fill', android: 'home', web: 'home' }, target: 'home' },
    { label: 'Explorar', icon: { ios: 'magnifyingglass', android: 'search', web: 'search' }, target: 'explore' },
    { label: 'Publicar', icon: { ios: 'plus', android: 'add', web: 'add' }, target: 'publish' },
    { label: 'Mapa', icon: { ios: 'map.fill', android: 'map', web: 'map' }, target: 'map' },
    { label: 'Conectar', icon: { ios: 'bubble.left.and.bubble.right', android: 'forum', web: 'forum' }, target: 'connect' },
  ] as const;

  const selectTab = (target: Stage | 'map') => {
    if (target === 'map') router.push('/map');
    else if (target === 'publish') startPublish('need');
    else setStage(target);
  };

  const topHeader = (
    <View style={[styles.screenHeader, desktop && styles.screenHeaderDesktop]}>
      <BrandLogo compact />
      <Text style={styles.eventLabel}>NAUFest 2026 · #AIForImpact</Text>
    </View>
  );

  const homeScreen = () => (
    <>
      <View style={styles.homeHeaderCard}>
        <BrandLogo compact />
        <Text style={styles.homeTitle}>Tú describes. La IA conecta.</Text>
        <Text style={styles.homeSubtitle}>ReBuild conecta materiales de construcción que todavía tienen vida útil con las personas que los necesitan.</Text>
        <Text style={styles.homeHint}>PUBLICA → ENCUENTRA → CONECTA</Text>
        <TextInput
          value={search}
          onChangeText={setSearch}
          placeholder="Buscar materiales"
          placeholderTextColor={colors.muted}
          style={styles.searchInput}
        />
      </View>

      <View style={styles.sectionRow}>
        <Text style={styles.sectionTitle}>Materiales cerca de ti</Text>
        <TouchableOpacity accessibilityRole="button" onPress={() => setStage('explore')}>
          <Text style={styles.linkText}>Explorar</Text>
        </TouchableOpacity>
      </View>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.categoryRow}>
        {['Todos', ...categories].map((item) => (
          <CategoryChip key={item} label={item} active={selectedCategory === item} onPress={() => setSelectedCategory(item)} />
        ))}
      </ScrollView>

      <View style={[styles.quickActions, desktop && styles.quickActionsDesktop]}>
        <PrimaryButton title="Tengo un material" onPress={() => startPublish('offer')} style={styles.quickPrimary} />
        <TouchableOpacity
          accessibilityRole="button"
          onPress={() => startPublish('need')}
          style={styles.quickSecondary}
        >
          <Text style={styles.quickSecondaryText}>Necesito un material</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.navigationRow}>
        <TouchableOpacity accessibilityRole="button" onPress={() => setStage('matches')}><Text style={styles.linkText}>Coincidencias</Text></TouchableOpacity>
        <TouchableOpacity accessibilityRole="button" onPress={() => setStage('connect')}><Text style={styles.linkText}>Conectar</Text></TouchableOpacity>
        <TouchableOpacity accessibilityRole="button" onPress={() => router.push('/map')}><Text style={styles.linkText}>Mapa</Text></TouchableOpacity>
      </View>

      <Text style={[styles.sectionTitle, styles.recentTitle]}>Publicaciones recientes</Text>
      {visibleOffers.length === 0 ? (
        <EmptyState title="No encontramos materiales" message="Prueba cambiando la búsqueda o la categoría." />
      ) : visibleOffers.slice(0, 3).map((offer) => (
        <TouchableOpacity key={offer.id} activeOpacity={0.9} onPress={() => openListing(offer)} style={styles.materialCard}>
          <Image source={publicationPhoto(offer) ?? { uri: materialPlaceholder(offer.material.slice(0, 14), colors.terracotta) }} resizeMode="cover" style={styles.materialImage} />
          <View style={styles.materialContent}>
            <View style={styles.materialHeading}>
              <Text style={styles.materialName}>{offer.material}</Text>
              <View style={styles.availabilityPill}><Text style={styles.availabilityText}>Disponible</Text></View>
            </View>
            <Text style={styles.materialMeta}>{displayCategory(offer)} · {offer.condition}</Text>
            <Text style={styles.materialMeta}>{offer.quantity} {offer.unit} · {offer.location}</Text>
            <Text numberOfLines={2} style={styles.materialDescription}>{offer.description}</Text>
          </View>
        </TouchableOpacity>
      ))}

      <View style={styles.aiCard}>
        <Text style={styles.sectionTitle}>¿Cómo conecta la IA?</Text>
        <Text style={styles.aiDescription}>Analiza las publicaciones, compara sus características y prioriza las coincidencias que mejor responden a cada necesidad.</Text>
        <Text style={styles.aiSteps}>INTERPRETA → COMPARA → CALCULA COMPATIBILIDAD → PRIORIZA</Text>
        <Text style={styles.aiNote}>Considera material, tipo, cantidad, condición y ubicación. No identifica materiales mediante fotografías.</Text>
      </View>
    </>
  );

  const publishScreen = () => (
    <>
      {topHeader}
      <Text style={styles.screenTitle}>Publicar material</Text>
      <Text style={styles.screenSubtitle}>Describe tu material y agrega una foto para que la comunidad pueda verlo.</Text>
      <View style={styles.intentRow}>
        <CategoryChip label="Tengo un material" active={intent === 'offer'} onPress={() => setIntent('offer')} />
        <CategoryChip label="Necesito un material" active={intent === 'need'} onPress={() => setIntent('need')} />
      </View>

      <Text style={styles.label}>Fotografía (opcional)</Text>
      {form.photoUri ? (
      <View style={styles.photoPreview}>
        <Image source={{ uri: form.photoUri }} style={styles.photoPreviewImage} />
        <View style={styles.photoActions}>
          <TouchableOpacity accessibilityRole="button" onPress={selectPhoto} style={styles.photoAction}>
            <Text style={styles.photoActionText}>Cambiar foto</Text>
          </TouchableOpacity>
          <TouchableOpacity accessibilityRole="button" onPress={() => setForm((current) => ({ ...current, photoUri: undefined }))} style={styles.photoAction}>
            <Text style={styles.photoActionText}>Eliminar</Text>
          </TouchableOpacity>
        </View>
      </View>
      ) : (
      <TouchableOpacity accessibilityRole="button" onPress={selectPhoto} style={styles.photoPicker}>
        <Text style={styles.photoPickerIcon}>＋</Text>
        <Text style={styles.photoPickerTitle}>Agregar foto</Text>
        <Text style={styles.photoPickerText}>Elige una imagen desde tu computadora</Text>
      </TouchableOpacity>
      )}
      <Text style={styles.photoNote}>La foto complementa la publicación; la IA compara las descripciones para encontrar coincidencias.</Text>
      {photoError ? <Text accessibilityRole="alert" style={styles.error}>{photoError}</Text> : null}

      <Text style={styles.label}>Material *</Text>
      <TextInput value={form.material} onChangeText={(value) => update('material', value)} placeholder="Ej. Azulejo" style={styles.input} placeholderTextColor={colors.muted} />

      <Text style={styles.label}>Descripción *</Text>
      <TextInput
        multiline
        value={form.description}
        onChangeText={(value) => update('description', value)}
        placeholder="Describe el material y su estado"
        style={[styles.input, styles.textArea]}
        placeholderTextColor={colors.muted}
      />

      <Text style={styles.label}>Categoría *</Text>
      <View style={styles.chipRow}>
        {categories.map((item) => <CategoryChip key={item} label={item} active={category === item} onPress={() => setCategory(item)} />)}
      </View>

      <Text style={styles.label}>Tipo *</Text>
      <TextInput value={form.type} onChangeText={(value) => update('type', value)} placeholder="Ej. Cerámico" style={styles.input} placeholderTextColor={colors.muted} />

      <Text style={styles.label}>Cantidad * y unidad *</Text>
      <TextInput
        keyboardType="numeric"
        value={form.quantity}
        onChangeText={(value) => update('quantity', value)}
        placeholder="12"
        style={[styles.input, styles.quantityInput]}
        placeholderTextColor={colors.muted}
      />
      <View style={[styles.chipRow, styles.unitRow]}>
        {units.map((item) => <CategoryChip key={item} label={item} active={form.unit === item} onPress={() => update('unit', item)} />)}
      </View>

      <Text style={styles.label}>Condición *</Text>
      <View style={styles.chipRow}>
        {conditions.map((item) => <CategoryChip key={item} label={item} active={form.condition === item} onPress={() => update('condition', item)} />)}
      </View>

      <Text style={styles.label}>Ubicación *</Text>
      <View style={styles.chipRow}>
        {locations.map((item) => <CategoryChip key={item} label={item} active={form.location === item} onPress={() => update('location', item)} />)}
      </View>
      <TextInput value={form.location} onChangeText={(value) => update('location', value)} placeholder="Otra ciudad o colonia" style={styles.input} placeholderTextColor={colors.muted} />

      {error ? <Text accessibilityRole="alert" style={styles.error}>{error}</Text> : null}
      <PrimaryButton title={intent === 'offer' ? 'Publicar material' : 'Publicar solicitud'} onPress={publish} style={styles.submitButton} />
    </>
  );

  const exploreScreen = () => (
    <>
      {topHeader}
      <Text style={styles.screenTitle}>Explorar materiales</Text>
      <Text style={styles.screenSubtitle}>Encuentra materiales disponibles cerca de ti.</Text>
      <TextInput
        value={search}
        onChangeText={setSearch}
        placeholder="Buscar madera, pintura..."
        style={styles.input}
        placeholderTextColor={colors.muted}
      />
      <Text style={styles.label}>Categoría</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filterRow}>
        {['Todos', ...categories].map((item) => <CategoryChip key={item} label={item} active={selectedCategory === item} onPress={() => setSelectedCategory(item)} />)}
      </ScrollView>
      {visibleOffers.length === 0 ? (
        <EmptyState title="No encontramos materiales" message="Prueba cambiando la búsqueda o la categoría." />
      ) : visibleOffers.map((offer) => (
        <TouchableOpacity key={offer.id} activeOpacity={0.9} onPress={() => openListing(offer)} style={styles.materialCard}>
          <Image source={publicationPhoto(offer) ?? { uri: materialPlaceholder(offer.material.slice(0, 14), colors.terracotta) }} resizeMode="cover" style={styles.materialImage} />
          <View style={styles.materialContent}>
            <View style={styles.materialHeading}>
              <Text style={styles.materialName}>{offer.material}</Text>
              <View style={styles.availabilityPill}><Text style={styles.availabilityText}>Disponible</Text></View>
            </View>
            <Text style={styles.materialMeta}>{displayCategory(offer)} · {offer.condition}</Text>
            <Text style={styles.materialMeta}>{offer.quantity} {offer.unit} · {offer.location}</Text>
            <Text numberOfLines={2} style={styles.materialDescription}>{offer.description}</Text>
          </View>
        </TouchableOpacity>
      ))}
    </>
  );

  const matchesScreen = () => (
    <>
      {topHeader}
      <Text style={styles.screenTitle}>Coincidencias</Text>
      <Text style={styles.screenSubtitle}>La IA prioriza las publicaciones que mejor se relacionan con lo que describes.</Text>
      {publicationNotice ? <Text accessibilityRole="alert" style={styles.matchNotice}>{publicationNotice}</Text> : null}
      <View style={styles.matchList}>
        {matches.length ? matches.map((match) => (
          <View key={match.publication.id} style={styles.matchCard}>
            <Text style={styles.matchBadge}>✨ Encontramos una coincidencia</Text>
            {publicationPhoto(match.publication) ? <Image source={publicationPhoto(match.publication)!} resizeMode="cover" style={styles.matchPhoto} /> : null}
            <Text style={styles.matchName}>{match.publication.material}</Text>
            <Text style={styles.matchMeta}>{intent === 'offer' ? 'Oferta publicada' : 'Necesidad detectada'}: {form.material}</Text>
            <Text style={styles.matchMeta}>{match.publication.quantity} {match.publication.unit} · {match.publication.location}</Text>
            <Text style={styles.matchMeta}>Condición: {match.publication.condition}</Text>
            <Text style={styles.matchReason}>{demoReason(match)}</Text>
            <PrimaryButton title="Ver detalle" onPress={() => openDetail(match)} style={styles.matchButton} />
          </View>
        )) : (
          <EmptyState title="Todavía no hay coincidencias" message="Describe un material para encontrar ofertas y solicitudes compatibles." action={<PrimaryButton title="Publicar una descripción" onPress={() => setStage('publish')} style={styles.matchButton} />} />
        )}
      </View>
    </>
  );

  const detailScreen = () => {
    if (!selectedMatch) return matchesScreen();
    const need = intent === 'need'
      ? { material: form.material, type: form.type, quantity: form.quantity, unit: form.unit, condition: form.condition, location: form.location, photoUri: form.photoUri }
      : selectedMatch.publication;
    const offer = intent === 'offer'
      ? { material: form.material, type: form.type, quantity: form.quantity, unit: form.unit, condition: form.condition, location: form.location, photoUri: form.photoUri }
      : selectedMatch.publication;
    const covered = Math.min(Number(need.quantity), Number(offer.quantity));
    const enough = Number(offer.quantity) >= Number(need.quantity);
    const needPhoto = publicationPhoto(need);
    const offerPhoto = publicationPhoto(offer);

    return (
      <>
        {topHeader}
        <Text style={styles.screenTitle}>Detalle de coincidencia</Text>
        <View style={[styles.comparison, desktop && styles.comparisonDesktop]}>
          <View style={styles.detailCard}>
            <Text style={styles.detailLabel}>NECESIDAD</Text>
            {needPhoto ? <Image source={needPhoto} resizeMode="cover" style={styles.detailPhoto} /> : null}
            <Text style={styles.detailTitle}>{need.material}</Text>
            <View style={styles.detailGrid}>
              <View style={styles.detailBox}><Text style={styles.detailCaption}>Tipo</Text><Text style={styles.detailValue}>{need.type}</Text></View>
              <View style={styles.detailBox}><Text style={styles.detailCaption}>Cantidad</Text><Text style={styles.detailValue}>{need.quantity} {need.unit}</Text></View>
              <View style={styles.detailBox}><Text style={styles.detailCaption}>Condición</Text><Text style={styles.detailValue}>{need.condition}</Text></View>
              <View style={styles.detailBox}><Text style={styles.detailCaption}>Ubicación</Text><Text style={styles.detailValue}>{need.location}</Text></View>
            </View>
          </View>
          <Text style={styles.versus}>vs.</Text>
          <View style={[styles.detailCard, styles.offerDetailCard]}>
            <Text style={styles.offerDetailLabel}>OFERTA</Text>
            {offerPhoto ? <Image source={offerPhoto} resizeMode="cover" style={styles.detailPhoto} /> : null}
            <Text style={styles.detailTitle}>{offer.material}</Text>
            <View style={styles.detailGrid}>
              <View style={styles.detailBox}><Text style={styles.detailCaption}>Tipo</Text><Text style={styles.detailValue}>{offer.type}</Text></View>
              <View style={styles.detailBox}><Text style={styles.detailCaption}>Cantidad</Text><Text style={styles.detailValue}>{offer.quantity} {offer.unit}</Text></View>
              <View style={styles.detailBox}><Text style={styles.detailCaption}>Condición</Text><Text style={styles.detailValue}>{offer.condition}</Text></View>
              <View style={styles.detailBox}><Text style={styles.detailCaption}>Ubicación</Text><Text style={styles.detailValue}>{offer.location}</Text></View>
            </View>
          </View>
        </View>
        <View style={styles.reasonCard}>
          <Text style={styles.reasonTitle}>Por qué coincide</Text>
          <Text style={styles.reasonLine}>• Material compatible: {need.material}.</Text>
          <Text style={styles.reasonLine}>• Tipo de material: {need.type}.</Text>
          <Text style={styles.reasonLine}>• Cantidad compatible: {covered} de {need.quantity} {need.unit}{enough ? ' disponibles.' : ` (${Math.round((covered / Number(need.quantity)) * 100)}% cubierto).`}</Text>
          <Text style={styles.reasonLine}>• Condición: {offer.condition}.</Text>
          <Text style={styles.reasonLine}>• Ubicación: {offer.location}.</Text>
          <Text style={styles.compatibility}>Compatibilidad priorizada · {selectedMatch.score}%</Text>
        </View>
        <PrimaryButton title="Contactar" onPress={() => contact(selectedMatch.publication)} style={styles.submitButton} />
        <TouchableOpacity accessibilityRole="button" onPress={() => setStage('matches')} style={styles.backLink}>
          <Text style={styles.linkText}>← Volver a coincidencias</Text>
        </TouchableOpacity>
      </>
    );
  };

  const connectScreen = () => (
    <>
      <AppHeader title="Conectar" subtitle="Conversaciones nacidas de coincidencias de materiales." />
      {activeChats.length === 0 ? (
        <EmptyState
          title="Aún no tienes conversaciones"
          message="Cuando contactes desde una coincidencia, el chat aparecerá aquí."
          action={<PrimaryButton title="Ver coincidencias" onPress={() => setStage('matches')} style={styles.matchButton} />}
        />
      ) : activeChats.map((chat) => (
        <TouchableOpacity key={chat.id} activeOpacity={0.82} style={styles.conversationRow} onPress={() => contact(chat)}>
          <View style={styles.conversationAvatar}><Text style={styles.conversationInitial}>{chat.owner.slice(0, 1).toUpperCase()}</Text></View>
          <View style={styles.conversationBody}>
            <Text style={styles.conversationName}>{chat.owner}</Text>
            <Text style={styles.conversationSubtitle}>{chat.type} · {chat.material}</Text>
            <Text style={styles.conversationPreview}>Inicia la conversación</Text>
          </View>
        </TouchableOpacity>
      ))}
    </>
  );

  const currentScreen = () => {
    switch (stage) {
      case 'publish': return publishScreen();
      case 'explore': return exploreScreen();
      case 'matches': return matchesScreen();
      case 'detail': return detailScreen();
      case 'connect': return connectScreen();
      default: return homeScreen();
    }
  };

  return (
    <View style={styles.app}>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={[styles.content, desktop && styles.contentDesktop]}
        keyboardShouldPersistTaps="handled"
      >
        {currentScreen()}
      </ScrollView>
      <View style={styles.tabBar}>
        <View style={[styles.tabBarInner, desktop && styles.tabBarInnerDesktop]}>
          {tabs.map((tab) => {
            const active = tab.target === stage || (tab.target === 'explore' && stage === 'detail');
            return (
              <TouchableOpacity
                key={tab.label}
                accessibilityRole="button"
                accessibilityState={{ selected: active }}
                onPress={() => selectTab(tab.target)}
                style={styles.tab}
              >
                <SymbolView name={tab.icon} tintColor={active ? colors.primary : colors.sage} size={24} />
                <Text style={[styles.tabLabel, active && styles.tabLabelActive]}>{tab.label}</Text>
              </TouchableOpacity>
            );
          })}
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  app: { flex: 1, minHeight: '100%', backgroundColor: colors.background },
  scroll: { flex: 1, backgroundColor: colors.background },
  content: { width: '100%', padding: 20, paddingBottom: 30, backgroundColor: colors.background },
  contentDesktop: { maxWidth: 860, alignSelf: 'center', paddingHorizontal: 28 },
  screenHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 },
  screenHeaderDesktop: { paddingTop: 4 },
  eventLabel: { ...typography.small, color: colors.secondary, fontSize: 10, textAlign: 'right' },
  homeHeaderCard: { backgroundColor: colors.surface, borderRadius: 24, padding: 20, marginBottom: 20, ...shadows.soft },
  homeTitle: { ...typography.h2, marginTop: 14 },
  homeSubtitle: { ...typography.bodyMuted, marginTop: 6 },
  homeHint: { ...typography.small, color: colors.primary, marginTop: 14, letterSpacing: 1.1 },
  searchInput: { marginTop: 16, borderRadius: 12, padding: 12, backgroundColor: '#F0F6F3', color: colors.text, fontFamily: 'Sora_400Regular', fontSize: 14 },
  sectionRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 16 },
  sectionTitle: { ...typography.h3 },
  linkText: { color: colors.primary, fontFamily: 'Sora_600SemiBold', fontSize: 13 },
  categoryRow: { marginTop: 16, marginBottom: 8 },
  quickActions: { flexDirection: 'row', gap: 12, marginTop: 18, marginBottom: 20 },
  quickActionsDesktop: { maxWidth: 560 },
  quickPrimary: { flex: 1, minHeight: 50, borderRadius: 14, paddingVertical: 14 },
  quickSecondary: { flex: 1, backgroundColor: colors.accent, paddingVertical: 14, paddingHorizontal: 10, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  quickSecondaryText: { color: colors.text, fontFamily: 'Sora_700Bold', fontSize: 14, textAlign: 'center' },
  navigationRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 16, marginBottom: 20 },
  recentTitle: { marginBottom: 12 },
  materialCard: { backgroundColor: colors.surface, borderRadius: 22, overflow: 'hidden', marginBottom: 16, ...shadows.card },
  materialImage: { width: '100%', height: 172 },
  materialContent: { padding: 14 },
  materialHeading: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', gap: 10 },
  materialName: { flex: 1, color: colors.text, fontFamily: 'Sora_800ExtraBold', fontSize: 18 },
  availabilityPill: { backgroundColor: colors.accent, borderRadius: 999, paddingHorizontal: 8, paddingVertical: 4 },
  availabilityText: { color: colors.primaryDark, fontFamily: 'Sora_700Bold', fontSize: 11 },
  materialMeta: { color: colors.muted, fontFamily: 'Sora_500Medium', fontSize: 13, marginTop: 5 },
  materialDescription: { color: colors.text, fontFamily: 'Sora_400Regular', fontSize: 14, marginTop: 8 },
  aiCard: { marginTop: 8, marginBottom: 18, padding: 18, borderRadius: radius.xl, backgroundColor: colors.surface, ...shadows.card },
  aiDescription: { ...typography.bodyMuted, marginTop: 8 },
  aiSteps: { ...typography.label, color: colors.primary, fontSize: 11, lineHeight: 21, marginTop: 14 },
  aiNote: { ...typography.small, marginTop: 10 },
  screenTitle: { ...typography.h2, marginTop: 8 },
  screenSubtitle: { ...typography.bodyMuted, marginTop: 6, marginBottom: 12 },
  intentRow: { flexDirection: 'row', flexWrap: 'wrap', marginTop: 14 },
  label: { marginTop: 18, marginBottom: 8, ...typography.label },
  photoPicker: { minHeight: 142, alignItems: 'center', justifyContent: 'center', padding: 18, borderWidth: 1, borderStyle: 'dashed', borderColor: colors.sage, borderRadius: radius.lg, backgroundColor: colors.surface },
  photoPickerIcon: { color: colors.primary, fontSize: 30, lineHeight: 34 },
  photoPickerTitle: { color: colors.primary, fontFamily: 'Sora_700Bold', fontSize: 14, marginTop: 4 },
  photoPickerText: { ...typography.small, marginTop: 4, textAlign: 'center' },
  photoPreview: { overflow: 'hidden', borderRadius: radius.lg, backgroundColor: colors.surface, ...shadows.card },
  photoPreviewImage: { width: '100%', height: 210 },
  photoActions: { flexDirection: 'row', gap: 10, padding: 12 },
  photoAction: { paddingVertical: 9, paddingHorizontal: 12, borderRadius: radius.md, backgroundColor: colors.accent },
  photoActionText: { color: colors.primary, fontFamily: 'Sora_700Bold', fontSize: 12 },
  photoNote: { ...typography.small, marginTop: 8 },
  input: { backgroundColor: colors.surface, borderRadius: radius.md, padding: 13, color: colors.text, borderWidth: 1, borderColor: colors.border, fontFamily: 'Sora_400Regular', fontSize: 14 },
  textArea: { minHeight: 100, textAlignVertical: 'top' },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap' },
  quantityInput: { width: 140 },
  unitRow: { marginTop: 8 },
  filterRow: { marginBottom: 12 },
  error: { marginTop: 10, color: colors.danger, fontFamily: 'Sora_600SemiBold', fontSize: 13 },
  submitButton: { marginTop: 28 },
  matchList: { width: '100%' },
  matchCard: { backgroundColor: colors.surface, borderRadius: radius.xl, padding: 18, marginTop: 14, ...shadows.card },
  matchNotice: { ...typography.small, color: colors.secondary, marginTop: 8 },
  matchBadge: { color: colors.primary, fontFamily: 'Sora_800ExtraBold', fontSize: 13, marginBottom: 8 },
  matchPhoto: { width: '100%', height: 170, borderRadius: radius.md, marginBottom: 12 },
  matchName: { color: colors.text, fontFamily: 'Sora_800ExtraBold', fontSize: 18 },
  matchMeta: { color: colors.muted, fontFamily: 'Sora_500Medium', fontSize: 13, marginTop: 6 },
  matchReason: { color: colors.text, fontFamily: 'Sora_400Regular', fontSize: 14, lineHeight: 21, marginTop: 10 },
  matchButton: { marginTop: 14 },
  comparison: { marginTop: 18 },
  comparisonDesktop: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  detailCard: { flex: 1, backgroundColor: colors.surface, borderRadius: radius.xl, padding: 18, marginBottom: 12, ...shadows.card },
  offerDetailCard: { backgroundColor: '#F0F6F3' },
  detailPhoto: { width: '100%', height: 190, borderRadius: radius.md, marginTop: 12 },
  detailLabel: { ...typography.small, color: colors.secondary, fontSize: 11, letterSpacing: 1.1 },
  offerDetailLabel: { ...typography.small, color: colors.primary, fontSize: 11, letterSpacing: 1.1 },
  detailTitle: { ...typography.h3, marginTop: 10, marginBottom: 12 },
  detailGrid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between' },
  detailBox: { width: '48%', backgroundColor: colors.background, borderRadius: 14, padding: 12, marginBottom: 9 },
  detailCaption: { color: colors.muted, fontFamily: 'Sora_700Bold', fontSize: 11, marginBottom: 4 },
  detailValue: { color: colors.text, fontFamily: 'Sora_400Regular', fontSize: 13 },
  versus: { ...typography.label, color: colors.secondary, textAlign: 'center', marginBottom: 12 },
  reasonCard: { marginTop: 4, backgroundColor: colors.surface, borderRadius: radius.xl, padding: 18, ...shadows.card },
  reasonTitle: { ...typography.bodyBold },
  reasonLine: { ...typography.bodyMuted, color: colors.text, marginTop: 8 },
  compatibility: { ...typography.label, color: colors.primary, marginTop: 14 },
  backLink: { alignSelf: 'flex-start', paddingVertical: 16 },
  conversationRow: { flexDirection: 'row', alignItems: 'center', minHeight: 88, paddingHorizontal: 14, paddingVertical: 12, backgroundColor: colors.surface, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.border },
  conversationAvatar: { width: 48, height: 48, alignItems: 'center', justifyContent: 'center', borderRadius: 24, backgroundColor: colors.accent },
  conversationInitial: { ...typography.label, color: colors.primary },
  conversationBody: { flex: 1, minWidth: 0, marginLeft: 12 },
  conversationName: { ...typography.bodyBold },
  conversationSubtitle: { ...typography.small, marginTop: 3 },
  conversationPreview: { ...typography.bodyMuted, fontSize: 13, marginTop: 4 },
  tabBar: { minHeight: 66, backgroundColor: colors.surface, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.border },
  tabBarInner: { width: '100%', minHeight: 66, flexDirection: 'row', justifyContent: 'space-around', alignItems: 'center', paddingHorizontal: 8 },
  tabBarInnerDesktop: { maxWidth: 860, alignSelf: 'center' },
  tab: { flex: 1, minHeight: 62, justifyContent: 'center', alignItems: 'center', gap: 2 },
  tabLabel: { color: colors.sage, fontFamily: 'Sora_500Medium', fontSize: 10 },
  tabLabelActive: { color: colors.primary, fontFamily: 'Sora_700Bold' },
});
