import * as SecureStore from 'expo-secure-store';

export const storage = {
  async setToken(token: string) {
    await SecureStore.setItemAsync('rebuild_token', token);
  },
  async getToken() {
    return await SecureStore.getItemAsync('rebuild_token');
  },
  async clearToken() {
    await SecureStore.deleteItemAsync('rebuild_token');
  },
};
