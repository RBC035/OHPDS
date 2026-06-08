import AsyncStorage from '@react-native-async-storage/async-storage';
import api from './axios';

export interface LoginPayload {
  username: string;
  password: string;
}

export interface SetupAdminPayload {
  username: string;
  password: string;
}

export const AuthService = {
  async login(payload: LoginPayload) {
    const response = await api.post('/login', payload);

    const token = response.data.token;
    if (token) {
      await AsyncStorage.setItem('token', token);
    }

    let userToStore = response.data.user ?? {};
    const role = response.data.role ?? response.data.user?.role;

    // Auth table only has username/password. email === username for both
    // teachers and parents, so fetch the relevant table and merge the full
    // record (id, name, phone, email, …) so the rest of the app has the
    // correct primary key and profile details.
    if (role === 'teacher') {
      try {
        const res = await api.get('/teachers');
        const list: any[] = res.data?.data ?? res.data ?? [];
        const matched = list.find(
          (t: any) => t.email?.toLowerCase() === payload.username.toLowerCase(),
        );
        if (matched) userToStore = { ...userToStore, ...matched };
      } catch {
        /* proceed with auth data only if fetch fails */
      }
    }

    if (role === 'parent') {
      try {
        const res = await api.get('/parents');
        const list: any[] = res.data?.data ?? res.data ?? [];
        const matched = list.find(
          (p: any) => p.email?.toLowerCase() === payload.username.toLowerCase(),
        );
        if (matched) userToStore = { ...userToStore, ...matched };
      } catch {
        /* proceed with auth data only if fetch fails */
      }
    }

    // Guarantee role is always present in the stored user object
    if (role) userToStore = { ...userToStore, role };
    await AsyncStorage.setItem('user', JSON.stringify(userToStore));

    return response.data;
  },

  setupAdmin(payload: SetupAdminPayload) {
    return api.post('/setup/admin', payload);
  },

  changeRole(data: {
    username: string;
    role: string;
  }) {
    return api.post('/change-role', data);
  },

  logout() {
    return AsyncStorage.removeItem('token');
  },
};