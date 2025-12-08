import Swal from 'sweetalert2';

export const showSuccess = (message: string, title: string = '¡Éxito!') => {
  return Swal.fire({
    icon: 'success',
    title,
    text: message,
    confirmButtonColor: '#10b981',
    timer: 3000,
    timerProgressBar: true,
  });
};

export const showError = (message: string, title: string = 'Error') => {
  return Swal.fire({
    icon: 'error',
    title,
    text: message,
    confirmButtonColor: '#ef4444',
  });
};

export const showConfirm = (
  message: string,
  title: string = '¿Estás seguro?',
  confirmText: string = 'Sí, continuar',
  cancelText: string = 'Cancelar'
) => {
  return Swal.fire({
    icon: 'question',
    title,
    text: message,
    showCancelButton: true,
    confirmButtonColor: '#10b981',
    cancelButtonColor: '#6b7280',
    confirmButtonText: confirmText,
    cancelButtonText: cancelText,
  });
};

export const showInfo = (message: string, title: string = 'Información') => {
  return Swal.fire({
    icon: 'info',
    title,
    text: message,
    confirmButtonColor: '#3b82f6',
  });
};

export const showLoading = (message: string = 'Cargando...') => {
  Swal.fire({
    title: message,
    allowOutsideClick: false,
    allowEscapeKey: false,
    didOpen: () => {
      Swal.showLoading();
    },
  });
};

export const closeLoading = () => {
  Swal.close();
};

