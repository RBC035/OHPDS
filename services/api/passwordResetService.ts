import api from './axios';

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

export interface ApiResult {
  success: boolean;
  message: string;
}

export const PasswordResetService = {

  async requestOtp(payload: RequestOtpPayload): Promise<ApiResult> {
    const res = await api.post('/forgot-password', payload);
    return res.data;
  },

  async verifyOtp(payload: VerifyOtpPayload): Promise<ApiResult> {
    const res = await api.post('/verify-otp', payload);
    return res.data;
  },

  async resetPassword(payload: ResetPasswordPayload): Promise<ApiResult> {
    const res = await api.post('/reset-password', payload);
    return res.data;
  },
};