import { Tabs, useSegments } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useFonts } from 'expo-font';
import { Sora_400Regular, Sora_500Medium, Sora_600SemiBold, Sora_700Bold, Sora_800ExtraBold } from '@expo-google-fonts/sora';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { AuthProvider } from '../contexts/AuthContext';

export default function RootLayout() {
  const segments = useSegments();
  const hideTabBar = segments.includes('login') || segments.includes('register') || segments.includes('material');
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
        <Tabs screenOptions={{ headerShown: false, tabBarActiveTintColor: '#1E8E5A', tabBarStyle: hideTabBar ? { display: 'none' } : undefined }}>
          <Tabs.Screen name="index" options={{ title: 'Inicio' }} />
          <Tabs.Screen name="explore" options={{ title: 'Explorar' }} />
          <Tabs.Screen name="publish" options={{ title: 'Publicar' }} />
          <Tabs.Screen name="map" options={{ title: 'Mapa' }} />
          <Tabs.Screen name="profile" options={{ title: 'Perfil' }} />
          <Tabs.Screen name="login" options={{ href: null }} />
          <Tabs.Screen name="register" options={{ href: null }} />
          <Tabs.Screen name="request" options={{ href: null }} />
          <Tabs.Screen name="requests" options={{ href: null }} />
          <Tabs.Screen name="matches" options={{ href: null }} />
          <Tabs.Screen name="material/[id]" options={{ href: null }} />
        </Tabs>
      </AuthProvider>
    </SafeAreaProvider>
  );
}
