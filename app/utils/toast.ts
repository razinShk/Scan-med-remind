import Toast from 'react-native-toast-message';

export const showSuccessToast = (message: string) => {
  Toast.show({
    type: 'success',
    text1: 'Success',
    text2: message,
    visibilityTime: 3000,
    position: 'bottom',
  });
};

export const showErrorToast = (message: string) => {
  Toast.show({
    type: 'error',
    text1: 'Error',
    text2: message,
    visibilityTime: 4000,
    position: 'bottom',
  });
};

export const showInfoToast = (message: string) => {
  Toast.show({
    type: 'info',
    text1: 'Info',
    text2: message,
    visibilityTime: 3000,
    position: 'bottom',
  });
}; 