import { useEffect, useMemo, useState } from 'react';
import { Image, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View, useWindowDimensions, type ImageSourcePropType } from 'react-native';
import { useRouter } from 'expo-router';
import { SymbolView } from 'expo-symbols';
import * as ImagePicker from 'expo-image-picker';
import { AppHeader, BrandLogo, PrimaryButton } from '../components/Branding';
import { CategoryChip, EmptyState, materialPlaceholder } from '../components/RebuildUI';
import { colors, categories, radius, shadows, typography } from '../constants/theme';
import { findDemoMatches, readSavedDemoPublications, webDemoPublications, WEB_DEMO_PUBLICATIONS_STORAGE_KEY, coordinatesForLocation, type DemoMatch, type DemoPublication, type PublicationIntent } from '../data/webDemo';
import { clearLegacyDemoStorage, clearWebAuthToken, readWebAuthSession, saveWebAuthToken } from '../data/webAuth';
import { isApiConfigured, type ApiUser, api } from '../services/api';
import { loadPersistedWebData } from '../services/webPersistence';

type Stage = 'home' | 'publish' | 'explore' | 'matches' | 'detail' | 'connect' | 'login' | 'register' | 'profile' | 'recover' | 'recoverySent' | 'resetPassword' | 'passwordUpdated';
type PublicationForm = Omit<DemoPublication, 'id' | 'owner' | 'intent' | 'quantity'> & { quantity: string };
type DemoAccount = Pick<ApiUser, 'id' | 'name' | 'email' | 'city' | 'role' | 'createdAt'> & { password: string };

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
const useLocalDemo = !isApiConfigured && process.env.NODE_ENV !== 'production';
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
  if (publication.category && categories.includes(publication.category as typeof categories[number])) return publication.category;
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

function matchCriteria(match: DemoMatch) {
  const symbol = (status: 'match' | 'partial' | 'mismatch') => status === 'match' ? '✓' : status === 'partial' ? '~' : '—';
  return `Material ${symbol(match.criteria.material)} · Tipo ${symbol(match.criteria.type)} · Cantidad ${symbol(match.criteria.quantity)} · Unidad ${symbol(match.criteria.unit)} · Condición ${symbol(match.criteria.condition)} · Ubicación ${symbol(match.criteria.location)}`;
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
  const [currentUser, setCurrentUser] = useState<DemoAccount | ApiUser | null>(null);
  const [demoAccounts, setDemoAccounts] = useState<DemoAccount[]>([]);
  const [authToken, setAuthToken] = useState<string | null>(null);
  const [persistedMatches, setPersistedMatches] = useState<Array<{ source: DemoPublication; match: DemoMatch }>>([]);
  const [authName, setAuthName] = useState('');
  const [authEmail, setAuthEmail] = useState('');
  const [authPassword, setAuthPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [recoverySession, setRecoverySession] = useState<{ accessToken: string; refreshToken: string } | null>(null);
  const [authError, setAuthError] = useState('');

  const visibleOffers = useMemo(() => [
    ...localPublications.filter((publication) => publication.intent === 'offer').reverse(),
    ...(useLocalDemo ? demoOffers : []),
  ].filter((offer) => {
    const matchesSearch = `${offer.material} ${offer.type} ${offer.description} ${offer.location}`
      .toLowerCase()
      .includes(search.trim().toLowerCase());
    return matchesSearch && (selectedCategory === 'Todos' || displayCategory(offer) === selectedCategory);
  }), [localPublications, search, selectedCategory]);
  const myPublications = useMemo(
    () => currentUser ? localPublications.filter((publication) => publication.ownerId === currentUser.id) : [],
    [currentUser, localPublications],
  );
  const myMatches = useMemo(() => {
    if (!currentUser) return [];
    if (!useLocalDemo) return persistedMatches;
    const candidates = [...webDemoPublications, ...localPublications];
    return myPublications.flatMap((source) =>
      findDemoMatches(source, candidates).map((match) => ({ source, match })),
    );
  }, [currentUser, localPublications, myPublications, persistedMatches]);

  useEffect(() => {
    const recoveryParams = new URLSearchParams(window.location.hash.replace(/^#/, ''));
    if (recoveryParams.get('type') === 'recovery') {
      const accessToken = recoveryParams.get('access_token');
      const refreshToken = recoveryParams.get('refresh_token');
      window.history.replaceState(null, '', `${window.location.pathname}${window.location.search}`);
      if (accessToken && refreshToken) {
        setRecoverySession({ accessToken, refreshToken });
        setStage('resetPassword');
      } else {
        setAuthError('El enlace de recuperación no es válido. Solicita uno nuevo.');
        setStage('login');
      }
    }
    try {
      clearLegacyDemoStorage(!useLocalDemo);
    } catch {
      setAuthError('No se pudieron limpiar las credenciales locales anteriores.');
    }
    if (!useLocalDemo) {
      const restoreApiSession = async () => {
        let token: string | null = null;
        let user: ApiUser | null = null;
        let sessionError = '';
        try {
          const savedSession = readWebAuthSession();
          if (savedSession) {
            const session = await api.refreshSession(savedSession.refreshToken);
            token = session.token;
            user = session.user;
            saveWebAuthToken(session.token, session.refreshToken);
            setAuthToken(session.token);
            setCurrentUser(session.user);
          }
        } catch (restoreError) {
          clearWebAuthToken();
          token = null;
          setAuthToken(null);
          setCurrentUser(null);
          sessionError = restoreError instanceof Error ? restoreError.message : 'No se pudo recuperar la sesión.';
        }

        try {
          const data = await loadPersistedWebData(token, user);
          setLocalPublications(data.publications);
          setPersistedMatches(data.myMatches);
          setMatches(data.myMatches.map(({ match }) => match));
          setPublicationNotice(sessionError);
        } catch (loadError) {
          setPublicationNotice(loadError instanceof Error ? loadError.message : 'No se pudieron cargar los datos del servidor.');
        }
      };
      void restoreApiSession();
      return;
    }

    try {
      setLocalPublications(readSavedDemoPublications());
    } catch {
      setPublicationNotice('No se pudieron leer las publicaciones guardadas en este navegador.');
    }
  }, []);

  const requestPasswordRecovery = async () => {
    const email = authEmail.trim();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setAuthError('Escribe un correo válido.');
      return;
    }
    try {
      await api.requestPasswordRecovery(email);
      setAuthError('');
      setStage('recoverySent');
    } catch {
      // Keep account and provider details private; the confirmation stays generic.
      setStage('recoverySent');
    }
  };

  const updateRecoveredPassword = async () => {
    if (authPassword.length < 6) {
      setAuthError('La contraseña debe tener al menos 6 caracteres.');
      return;
    }
    if (authPassword !== confirmPassword) {
      setAuthError('Las contraseñas no coinciden.');
      return;
    }
    if (!recoverySession) {
      setAuthError('El enlace de recuperación venció o no es válido. Solicita uno nuevo.');
      return;
    }
    try {
      await api.updatePassword({ ...recoverySession, password: authPassword });
      setRecoverySession(null);
      setAuthPassword('');
      setConfirmPassword('');
      setAuthError('');
      setStage('passwordUpdated');
    } catch (updateError) {
      setAuthError(updateError instanceof Error ? updateError.message : 'No se pudo actualizar la contraseña.');
    }
  };

  const returnToLogin = () => {
    setRecoverySession(null);
    setAuthPassword('');
    setConfirmPassword('');
    setAuthError('');
    setStage('login');
  };

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

  const openAuth = (nextStage: 'login' | 'register') => {
    setAuthName('');
    setAuthEmail('');
    setAuthPassword('');
    setAuthError('');
    setStage(nextStage);
  };

  const register = async () => {
    const name = authName.trim();
    const email = authEmail.trim();
    if (!name || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || !authPassword) {
      setAuthError('Completa nombre, correo válido y contraseña.');
      return;
    }

    if (useLocalDemo) {
      if (demoAccounts.some((account) => account.email.toLowerCase() === email.toLowerCase())) {
        setAuthError('Ya existe una cuenta con ese correo.');
        return;
      }
      const account: DemoAccount = {
        id: `demo-user-${Date.now()}`,
        name,
        email,
        city: 'Ciudad de México',
        role: 'user',
        createdAt: new Date().toISOString(),
        password: authPassword,
      };
      setDemoAccounts((accounts) => [...accounts, account]);
      setCurrentUser(account);
      setAuthError('');
      setStage('profile');
      return;
    }

    try {
      const session = await api.register({ name, email, password: authPassword });
      saveWebAuthToken(session.token, session.refreshToken);
      setAuthToken(session.token);
      setCurrentUser(session.user);
      setAuthError('');
      setStage('profile');
      try {
        const data = await loadPersistedWebData(session.token, session.user);
        setLocalPublications(data.publications);
        setPersistedMatches(data.myMatches);
        setMatches(data.myMatches.map(({ match }) => match));
        setPublicationNotice('');
      } catch (loadError) {
        setPublicationNotice(loadError instanceof Error ? loadError.message : 'No se pudieron cargar tus datos.');
      }
    } catch (registerError) {
      setAuthError(registerError instanceof Error ? registerError.message : 'No se pudo crear la cuenta.');
    }
  };

  const login = async () => {
    if (!authEmail.trim() || !authPassword) {
      setAuthError('Escribe tu correo y contraseña.');
      return;
    }
    if (useLocalDemo) {
      const account = demoAccounts.find((saved) =>
        saved.email.toLowerCase() === authEmail.trim().toLowerCase() && saved.password === authPassword,
      );
      if (!account) {
        setAuthError('Correo o contraseña incorrectos.');
        return;
      }
      setCurrentUser(account);
      setAuthError('');
      setStage('profile');
      return;
    }

    try {
      const session = await api.login({ email: authEmail.trim(), password: authPassword });
      saveWebAuthToken(session.token, session.refreshToken);
      setAuthToken(session.token);
      setCurrentUser(session.user);
      setAuthError('');
      setStage('profile');
      try {
        const data = await loadPersistedWebData(session.token, session.user);
        setLocalPublications(data.publications);
        setPersistedMatches(data.myMatches);
        setMatches(data.myMatches.map(({ match }) => match));
        setPublicationNotice('');
      } catch (loadError) {
        setPublicationNotice(loadError instanceof Error ? loadError.message : 'No se pudieron cargar tus datos.');
      }
    } catch (loginError) {
      setAuthError(loginError instanceof Error ? loginError.message : 'No se pudo iniciar sesión.');
    }
  };

  const logout = () => {
    try {
      if (!useLocalDemo) clearWebAuthToken();
      setAuthToken(null);
      setCurrentUser(null);
      setPersistedMatches([]);
      setStage('home');
    } catch {
      setAuthError('No se pudo cerrar la sesión.');
    }
  };

  const openProfileMatch = (source: DemoPublication, match: DemoMatch) => {
    setIntent(source.intent);
    setForm({
      material: source.material,
      type: source.type,
      quantity: String(source.quantity),
      unit: source.unit,
      condition: source.condition,
      location: source.location,
      description: source.description,
      photoUri: source.photoUri,
    });
    setCategory(displayCategory(source));
    setSelectedMatch(match);
    setStage('detail');
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

  const publish = async () => {
    const quantity = Number(form.quantity.replace(',', '.'));
    if (!form.material.trim() || !category || !form.type.trim() || !Number.isFinite(quantity) || quantity <= 0 || !form.unit.trim() || !form.condition.trim() || !form.location.trim() || !form.description.trim()) {
      setError('Completa los campos obligatorios antes de publicar.');
      return;
    }

    if (useLocalDemo) {
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
        owner: currentUser?.name ?? 'Tú',
        ownerId: currentUser?.id ?? 'guest',
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
      return;
    }

    if (!currentUser || !authToken) {
      setError('Inicia sesión para guardar tu publicación.');
      return;
    }

    try {
      const common = {
        category,
        type: form.type.trim(),
        quantity,
        unit: form.unit.trim(),
        condition: form.condition.trim(),
        location: form.location.trim(),
        description: form.description.trim(),
      };
      const created = intent === 'offer'
        ? await api.createMaterial({
          ...common,
          name: form.material.trim(),
          availability: 'Disponible',
          photos: [],
        }, authToken)
        : await api.createRequest({
          ...common,
          material: form.material.trim(),
          neededBy: new Date().toISOString(),
        }, authToken);

      if (!created || typeof created !== 'object' || !('id' in created) || typeof created.id !== 'string') {
        throw new Error('La API no devolvió el identificador de la publicación guardada.');
      }
      if (!('role' in currentUser)) throw new Error('Inicia sesión de nuevo para publicar.');
      const data = await loadPersistedWebData(authToken, currentUser);
      const savedPublication = data.publications.find((publication) => publication.id === created.id);
      if (!savedPublication) throw new Error('El servidor guardó la publicación, pero no pudo devolverla al cargar tus datos.');
      const publication = { ...savedPublication, photoUri: form.photoUri };
      setLocalPublications(data.publications.map((item) => item.id === publication.id ? publication : item));
      setPersistedMatches(data.myMatches);
      setMatches(data.myMatches
        .filter(({ source }) => source.id === publication.id)
        .map(({ match }) => match));
      setPublicationNotice('');
      setStage('matches');
    } catch (publishError) {
      setError(publishError instanceof Error ? publishError.message : 'No se pudo guardar la publicación en el servidor.');
    }
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
    { label: 'Publicar', icon: { ios: 'plus', android: 'add', web: 'add' }, target: 'publish' },
    { label: 'Publicaciones', icon: { ios: 'magnifyingglass', android: 'search', web: 'search' }, target: 'explore' },
    { label: 'Coincidencias', icon: { ios: 'sparkles', android: 'auto_awesome', web: 'auto_awesome' }, target: 'matches' },
    { label: 'Perfil', icon: { ios: 'person.crop.circle', android: 'person', web: 'person' }, target: 'profile' },
  ] as const;

  const selectTab = (target: Stage) => {
    if (target === 'publish') startPublish('need');
    else setStage(target);
  };

  const topHeader = (
    <View style={[styles.screenHeader, desktop && styles.screenHeaderDesktop]}>
      <BrandLogo compact />
    </View>
  );

  const homeScreen = () => (
    <>
      <View style={styles.homeHeaderCard}>
        <BrandLogo compact />
        <Text style={styles.homeTitle}>Tú describes. La IA conecta.</Text>
        <Text style={styles.homeSubtitle}>Materiales reutilizables para tus proyectos.</Text>
        <Text style={styles.homeHint}>Publica → Encuentra → Conecta</Text>
      </View>
      {publicationNotice ? <Text accessibilityRole="alert" style={styles.matchNotice}>{publicationNotice}</Text> : null}

      <View style={styles.sectionRow}>
        <Text style={styles.sectionTitle}>Publicaciones recientes</Text>
        <TouchableOpacity accessibilityRole="button" onPress={() => setStage('explore')}>
          <Text style={styles.linkText}>Ver todas</Text>
        </TouchableOpacity>
      </View>

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
        <TouchableOpacity accessibilityRole="button" onPress={() => router.push('/map')}><Text style={styles.linkText}>Ver mapa</Text></TouchableOpacity>
      </View>

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
    </>
  );

  const publishScreen = () => (
    <>
      {topHeader}
      <Text style={styles.screenTitle}>Publicar material</Text>
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
        <Text style={styles.photoPickerText}>Elige una imagen</Text>
      </TouchableOpacity>
      )}
      <Text style={styles.photoNote}>La IA compara el texto, no la foto.</Text>
      {photoError ? <Text accessibilityRole="alert" style={styles.error}>{photoError}</Text> : null}

      <Text style={styles.label}>Material *</Text>
      <TextInput value={form.material} onChangeText={(value) => update('material', value)} placeholder="Ej. Azulejo" style={styles.input} placeholderTextColor={colors.muted} />

      <Text style={styles.label}>Descripción *</Text>
      <TextInput
        multiline
        value={form.description}
        onChangeText={(value) => update('description', value)}
        placeholder="Ej. Sobrante limpio y reutilizable"
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
      <Text style={styles.screenTitle}>Publicaciones</Text>
      {publicationNotice ? <Text accessibilityRole="alert" style={styles.matchNotice}>{publicationNotice}</Text> : null}
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
        <EmptyState title="No encontramos materiales" message="Prueba otra búsqueda o categoría." />
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
      <TouchableOpacity accessibilityRole="button" onPress={() => setStage('connect')} style={styles.conversationsLink}>
        <Text style={styles.linkText}>Ver conversaciones</Text>
      </TouchableOpacity>
      {publicationNotice ? <Text accessibilityRole="alert" style={styles.matchNotice}>{publicationNotice}</Text> : null}
      <View style={styles.matchList}>
        {matches.length ? matches.map((match) => (
          <View key={match.publication.id} style={styles.matchCard}>
            <Text style={styles.matchBadge}>Coincidencia</Text>
            {publicationPhoto(match.publication) ? <Image source={publicationPhoto(match.publication)!} resizeMode="cover" style={styles.matchPhoto} /> : null}
            <Text style={styles.matchName}>{match.publication.material}</Text>
            <Text style={styles.matchMeta}>{intent === 'offer' ? 'Ofreces' : 'Buscas'}: {form.material}</Text>
            <Text style={styles.matchMeta}>Tipo: {match.publication.type}</Text>
            <Text style={styles.matchMeta}>{match.publication.quantity} {match.publication.unit} · {match.publication.location}</Text>
            <Text style={styles.matchMeta}>Condición: {match.publication.condition}</Text>
            <Text style={styles.matchReason}>{match.score}% · {match.level}</Text>
            <Text style={styles.matchMeta}>{matchCriteria(match)}</Text>
            <Text style={styles.matchReason}>{useLocalDemo ? demoReason(match) : match.reason}</Text>
            <PrimaryButton title="Ver detalle" onPress={() => openDetail(match)} style={styles.matchButton} />
          </View>
        )) : (
          <EmptyState title="Aún no hay coincidencias" message="Publica lo que tienes o necesitas." action={<PrimaryButton title="Publicar" onPress={() => setStage('publish')} style={styles.matchButton} />} />
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
    const unitsMatch = selectedMatch.criteria.unit === 'match';
    const covered = unitsMatch ? Math.min(Number(need.quantity), Number(offer.quantity)) : 0;
    const enough = unitsMatch && Number(offer.quantity) >= Number(need.quantity);
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
          <Text style={styles.reasonLine}>{selectedMatch.criteria.type === 'match' ? '• Tipo coincidente.' : '• El tipo difiere; el material es compatible.'}</Text>
          <Text style={styles.reasonLine}>{unitsMatch
            ? `• Cantidad: ${covered} de ${need.quantity} ${need.unit}${enough ? ' disponibles.' : ` (${Math.round((covered / Number(need.quantity)) * 100)}% cubierto).`}`
            : `• Unidades distintas: ${need.unit} y ${offer.unit}; cantidades no comparables.`}</Text>
          <Text style={styles.reasonLine}>• Condición: {offer.condition} ({selectedMatch.criteria.condition === 'match' ? 'compatible' : 'diferente'}).</Text>
          <Text style={styles.reasonLine}>• Ubicación: {offer.location} ({selectedMatch.criteria.location === 'match' ? 'cercana' : 'distinta'}).</Text>
          <Text style={styles.compatibility}>{selectedMatch.score}% · {selectedMatch.level}</Text>
          <Text style={styles.reasonLine}>{matchCriteria(selectedMatch)}</Text>
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
      <AppHeader title="Conversaciones" />
      {activeChats.length === 0 ? (
        <EmptyState
          title="Aún no tienes conversaciones"
          message="Contacta desde una coincidencia."
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

  const authScreen = (mode: 'login' | 'register') => (
    <>
      {topHeader}
      <Text style={styles.screenTitle}>{mode === 'register' ? 'Crear cuenta' : 'Iniciar sesión'}</Text>
      <Text style={styles.screenSubtitle}>{mode === 'register' ? 'Crea una cuenta para guardar tus publicaciones.' : 'Entra a tu cuenta de ReBuild.'}</Text>
      {mode === 'register' ? (
        <>
          <Text style={styles.label}>Nombre *</Text>
          <TextInput value={authName} onChangeText={setAuthName} placeholder="Tu nombre" style={styles.input} placeholderTextColor={colors.muted} autoCapitalize="words" />
        </>
      ) : null}
      <Text style={styles.label}>Correo electrónico *</Text>
      <TextInput value={authEmail} onChangeText={setAuthEmail} placeholder="correo@ejemplo.com" style={styles.input} placeholderTextColor={colors.muted} keyboardType="email-address" autoCapitalize="none" />
      <Text style={styles.label}>Contraseña *</Text>
      <TextInput value={authPassword} onChangeText={setAuthPassword} placeholder="Contraseña" style={styles.input} placeholderTextColor={colors.muted} secureTextEntry />
      {authError ? <Text accessibilityRole="alert" style={styles.error}>{authError}</Text> : null}
      <PrimaryButton title={mode === 'register' ? 'Crear cuenta' : 'Iniciar sesión'} onPress={mode === 'register' ? register : login} style={styles.submitButton} />
      {mode === 'login' ? <TouchableOpacity accessibilityRole="button" onPress={() => { setAuthError(''); setStage('recover'); }} style={styles.backLink}>
        <Text style={styles.linkText}>¿Olvidaste tu contraseña?</Text>
      </TouchableOpacity> : null}
      <TouchableOpacity accessibilityRole="button" onPress={() => openAuth(mode === 'register' ? 'login' : 'register')} style={styles.backLink}>
        <Text style={styles.linkText}>{mode === 'register' ? '¿Ya tienes cuenta? Inicia sesión' : '¿Primera vez? Crear cuenta'}</Text>
      </TouchableOpacity>
    </>
  );

  const recoveryScreen = () => (
    <>
      {topHeader}
      <Text style={styles.screenTitle}>{stage === 'resetPassword' ? 'Nueva contraseña' : stage === 'passwordUpdated' ? 'Contraseña actualizada' : stage === 'recoverySent' ? 'Correo enviado' : 'Recuperar contraseña'}</Text>
      {stage === 'recover' ? <>
        <Text style={styles.screenSubtitle}>Escribe el correo asociado a tu cuenta.</Text>
        <Text style={styles.label}>Correo electrónico *</Text>
        <TextInput value={authEmail} onChangeText={setAuthEmail} placeholder="correo@ejemplo.com" style={styles.input} placeholderTextColor={colors.muted} keyboardType="email-address" autoCapitalize="none" />
        {authError ? <Text accessibilityRole="alert" style={styles.error}>{authError}</Text> : null}
        <PrimaryButton title="Enviar enlace" onPress={requestPasswordRecovery} style={styles.submitButton} />
      </> : null}
      {stage === 'recoverySent' ? <Text style={styles.screenSubtitle}>Si existe una cuenta con ese correo, recibirás un enlace para restablecer tu contraseña.</Text> : null}
      {stage === 'resetPassword' ? <>
        <Text style={styles.label}>Nueva contraseña</Text>
        <TextInput value={authPassword} onChangeText={setAuthPassword} placeholder="Mínimo 6 caracteres" style={styles.input} placeholderTextColor={colors.muted} secureTextEntry />
        <Text style={styles.label}>Confirmar nueva contraseña</Text>
        <TextInput value={confirmPassword} onChangeText={setConfirmPassword} placeholder="Repite la contraseña" style={styles.input} placeholderTextColor={colors.muted} secureTextEntry />
        {authError ? <Text accessibilityRole="alert" style={styles.error}>{authError}</Text> : null}
        <PrimaryButton title="Actualizar contraseña" onPress={updateRecoveredPassword} style={styles.submitButton} />
      </> : null}
      {stage === 'passwordUpdated' ? <Text style={styles.screenSubtitle}>Contraseña actualizada correctamente.</Text> : null}
      <TouchableOpacity accessibilityRole="button" onPress={returnToLogin} style={styles.backLink}>
        <Text style={styles.linkText}>← Volver al login</Text>
      </TouchableOpacity>
    </>
  );

  const profileScreen = () => {
    if (!currentUser) {
      return (
        <>
          {topHeader}
          <Text style={styles.screenTitle}>Perfil</Text>
          <Text style={styles.screenSubtitle}>Inicia sesión para ver tus publicaciones y coincidencias.</Text>
          <PrimaryButton title="Iniciar sesión" onPress={() => openAuth('login')} style={styles.submitButton} />
          <TouchableOpacity accessibilityRole="button" onPress={() => openAuth('register')} style={styles.backLink}>
            <Text style={styles.linkText}>Crear cuenta</Text>
          </TouchableOpacity>
        </>
      );
    }

    return (
      <>
        {topHeader}
        <Text style={styles.screenTitle}>Perfil</Text>
        {publicationNotice ? <Text accessibilityRole="alert" style={styles.matchNotice}>{publicationNotice}</Text> : null}
        <View style={styles.detailCard}>
          <Text style={styles.detailTitle}>{currentUser.name}</Text>
          <Text style={styles.detailValue}>{currentUser.email}</Text>
        </View>

        <Text style={[styles.sectionTitle, styles.recentTitle]}>Mis publicaciones · {myPublications.filter((publication) => publication.intent === 'offer').length}</Text>
        {myPublications.some((publication) => publication.intent === 'offer') ? myPublications.filter((publication) => publication.intent === 'offer').map((publication) => (
          <View key={publication.id} style={styles.matchCard}>
            <Text style={styles.matchName}>{publication.material}</Text>
            <Text style={styles.matchMeta}>Ofreces · {publication.quantity} {publication.unit} · {publication.location}</Text>
          </View>
        )) : (
          <EmptyState title="Aún no ofreces materiales" message="Publica un material disponible." action={<PrimaryButton title="Publicar material" onPress={() => startPublish('offer')} style={styles.matchButton} />} />
        )}

        <Text style={[styles.sectionTitle, styles.recentTitle]}>Mis solicitudes · {myPublications.filter((publication) => publication.intent === 'need').length}</Text>
        {myPublications.some((publication) => publication.intent === 'need') ? myPublications.filter((publication) => publication.intent === 'need').map((publication) => (
          <View key={publication.id} style={styles.matchCard}>
            <Text style={styles.matchName}>{publication.material}</Text>
            <Text style={styles.matchMeta}>Buscas · {publication.quantity} {publication.unit} · {publication.location}</Text>
          </View>
        )) : (
          <EmptyState title="Aún no tienes solicitudes" message="Publica lo que necesitas." action={<PrimaryButton title="Publicar solicitud" onPress={() => startPublish('need')} style={styles.matchButton} />} />
        )}

        <Text style={[styles.sectionTitle, styles.recentTitle]}>Mis coincidencias · {myMatches.length}</Text>
        {myMatches.length ? myMatches.map(({ source, match }) => {
          const ownNeed = source.intent === 'need';
          return (
            <View key={`${source.id}:${match.publication.id}`} style={styles.matchCard}>
              <Text style={styles.matchName}>{source.material}</Text>
              <Text style={styles.matchMeta}>{ownNeed ? `Buscas: ${source.material}` : `Ofreces: ${source.material}`}</Text>
              <Text style={styles.matchMeta}>{ownNeed ? 'Ofrece' : 'Busca'}: {match.publication.material}</Text>
              <Text style={styles.matchMeta}>{source.location} · {match.publication.location}</Text>
              <Text style={styles.matchReason}>{match.score}% · {match.level}</Text>
              <Text style={styles.matchMeta}>{matchCriteria(match)}</Text>
              <View style={styles.quickActions}>
                <PrimaryButton title="Ver detalle" onPress={() => openProfileMatch(source, match)} style={styles.matchButton} />
                <TouchableOpacity accessibilityRole="button" onPress={() => contact(match.publication)} style={styles.quickSecondary}>
                  <Text style={styles.quickSecondaryText}>Contactar</Text>
                </TouchableOpacity>
              </View>
            </View>
          );
        }) : (
          <EmptyState title="Aún no hay coincidencias" message="Publica lo que tienes o necesitas para encontrar compatibilidades." />
        )}
        <PrimaryButton title="Cerrar sesión" onPress={logout} style={styles.submitButton} />
      </>
    );
  };

  const currentScreen = () => {
    switch (stage) {
      case 'publish': return publishScreen();
      case 'explore': return exploreScreen();
      case 'matches': return matchesScreen();
      case 'detail': return detailScreen();
      case 'connect': return connectScreen();
      case 'login': return authScreen('login');
      case 'register': return authScreen('register');
      case 'recover':
      case 'recoverySent':
      case 'resetPassword':
      case 'passwordUpdated': return recoveryScreen();
      case 'profile': return profileScreen();
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
  conversationsLink: { alignSelf: 'flex-start', marginTop: 4 },
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
