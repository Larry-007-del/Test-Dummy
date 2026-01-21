import { Platform, ToastAndroid, Alert } from 'react-native';
import { showToast } from './toastService';

export default function showMessage(message, title = '') {
  // Prefer in-app toast host when registered
  try {
    showToast(message);
    return;
  } catch (e) {
    // fall through to platform-specific fallback
  }

  if (Platform.OS === 'android') {
    ToastAndroid.show(message, ToastAndroid.SHORT);
  } else {
    // iOS fallback uses Alert (short text only)
    Alert.alert(title || '', message);
  }
}
