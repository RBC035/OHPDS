import { useEffect } from 'react';
import { router } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';

export default function Index() {
  useEffect(() => {
    const init = async () => {
      const onboardingDone = await AsyncStorage.getItem('onboarding_done');
      const token = await AsyncStorage.getItem('token');

      // 1. FIRST TIME USER
      if (!onboardingDone) {
        router.replace('/onboarding');
        return;
      }

      // 2. LOGGED IN USER
      if (token) {
        router.replace('/(admin)/dashboard'); // or role-based later
        return;
      }

      // 3. DEFAULT → LOGIN
      router.replace('/(auth)/login');
    };

    init();
  }, []);

  return null;
}