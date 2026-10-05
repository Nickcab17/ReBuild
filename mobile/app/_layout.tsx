import { Tabs, useSegments } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useFonts } from 'expo-font';
import { Sora_400Regular, Sora_500Medium, Sora_600SemiBold, Sora_700Bold, Sora_800ExtraBold } from '@expo-google-fonts/sora';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { AuthProvider } from '../contexts/AuthContext';
import { colors } from '../constants/theme';
import { SymbolView } from 'expo-symbols';

export default function RootLayout() {
  const [fontsLoaded] = useFonts({
    Sora_400Regular,
    Sora_500Medium,
    Sora_600SemiBold,
    Sora_700Bold,
    Sora_800ExtraBold,
  });

  if (!fontsLoaded) {
    return null;
  }

  return (
    <SafeAreaProvider>
      <StatusBar style="dark" />
      <AuthProvider>
        <AppTabs />
      </AuthProvider>
    </SafeAreaProvider>
  );
}

function AppTabs() {
  const segments = useSegments();
  const hideTabBar = segments.includes('login') || segments.includes('register') || segments.includes('material') || segments.includes('chat');

  return (
        <Tabs screenOptions={{ headerShown: false, tabBarActiveTintColor: colors.primary, tabBarInactiveTintColor: colors.sage, tabBarStyle: hideTabBar ? { display: 'none' } : undefined }}>
          <Tabs.Screen name="index" options={{ title: 'Inicio', tabBarIcon: ({ color }) => <SymbolView name={{ ios: 'house.fill', android: 'home', web: 'home' }} tintColor={color} size={24} /> }} />
          <Tabs.Screen name="publish" options={{ title: 'Publicar', tabBarIcon: ({ color }) => <SymbolView name={{ ios: 'plus', android: 'add', web: 'add' }} tintColor={color} size={24} /> }} />
          <Tabs.Screen name="explore" options={{ title: 'Publicaciones', tabBarIcon: ({ color }) => <SymbolView name={{ ios: 'magnifyingglass', android: 'search', web: 'search' }} tintColor={color} size={24} /> }} />
          <Tabs.Screen name="matches" options={{ title: 'Coincidencias', tabBarIcon: ({ color }) => <SymbolView name={{ ios: 'sparkles', android: 'auto_awesome', web: 'auto_awesome' }} tintColor={color} size={24} /> }} />
          <Tabs.Screen name="profile" options={{ title: 'Perfil', tabBarIcon: ({ color }) => <SymbolView name={{ ios: 'person.crop.circle', android: 'person', web: 'person' }} tintColor={color} size={24} /> }} />
          <Tabs.Screen name="map" options={{ href: null }} />
          <Tabs.Screen name="conectar" options={{ href: null }} />
          <Tabs.Screen name="login" options={{ href: null }} />
          <Tabs.Screen name="register" options={{ href: null }} />
          <Tabs.Screen name="request" options={{ href: null }} />
          <Tabs.Screen name="requests" options={{ href: null }} />
          <Tabs.Screen name="material/[id]" options={{ href: null }} />
          <Tabs.Screen name="chat/[id]" options={{ href: null }} />
        </Tabs>
  );
}
