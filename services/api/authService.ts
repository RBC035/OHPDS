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

export interface ChangeRolePayload {
  username: string;
  role: 'admin' | 'teacher' | 'parent';
}

// Self change-password (teacher / parent / admin): current + new required.
export interface ChangePasswordPayload {
  currentPassword: string;
  newPassword: string;
}

// Admin override: only target username + new password.
export interface AdminChangePasswordPayload {
  username: string;
  newPassword: string;
}

// OTP password reset (logged out), phone-based.
export interface RequestOtpPayload {
  phone: string;
}

export interface VerifyOtpPayload {
  phone: string;
  otp: string;
}

export interface ResetPasswordPayload {
  phone: string;
  otp: string;
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

    // Backend returns role inside `user`, not at the top level.
    const role: string | undefined = response.data.user?.role;

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

  changeRole(payload: ChangeRolePayload) {
    return api.post('/change-role', payload);
  },

  // Logged-in user changes their own password (current password required).
  changePassword(payload: ChangePasswordPayload) {
    return api.post('/change-password', payload);
  },

  // Admin changes any user's password (no current password needed).
  adminChangePassword(payload: AdminChangePasswordPayload) {
    return api.post('/admin/change-password', payload);
  },

  // --- OTP password reset (logged out) ---

  // Step 1: send OTP to the phone registered for this user.
  requestOtp(payload: RequestOtpPayload) {
    return api.post('/forgot-password', payload);
  },

  // Step 2: verify the OTP (optional standalone check before the reset form).
  verifyOtp(payload: VerifyOtpPayload) {
    return api.post('/verify-otp', payload);
  },

  // Step 3: reset the password with a valid OTP.
  resetPassword(payload: ResetPasswordPayload) {
    return api.post('/reset-password', payload);
  },

  async logout() {
    await AsyncStorage.multiRemove(['token', 'user']);
  },
};