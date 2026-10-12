const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

export const normalizeEmail = (value = '') => value.trim().toLowerCase();

export const validateEmail = (value) => {
  const email = normalizeEmail(value);
  if (!email) return 'Email address is required.';
  if (email.length > 254 || !EMAIL_PATTERN.test(email)) return 'Enter a valid email address.';
  return '';
};

export const validateName = (value) => {
  const name = String(value || '').trim();
  if (!name) return 'Full name is required.';
  if (name.length < 2) return 'Full name must contain at least 2 characters.';
  if (name.length > 80) return 'Full name must contain 80 characters or fewer.';
  return '';
};

export const validatePhone = (value) => {
  const phone = String(value || '').trim();
  if (!phone) return 'Phone number is required.';
  if (!/^\+?[0-9\s()-]+$/.test(phone)) return 'Phone number can only contain digits and +, spaces, brackets or hyphens.';
  const digits = phone.replace(/\D/g, '');
  if (digits.length < 9 || digits.length > 15) return 'Enter a valid phone number with 9 to 15 digits.';
  return '';
};

export const validatePassword = (value, strong = false) => {
  const password = String(value || '');
  if (!password) return 'Password is required.';
  if (password.length < 6) return 'Password must contain at least 6 characters.';
  if (strong && password.length < 8) return 'Password must contain at least 8 characters.';
  if (strong && !/[a-z]/.test(password)) return 'Password must include a lowercase letter.';
  if (strong && !/[A-Z]/.test(password)) return 'Password must include an uppercase letter.';
  if (strong && !/[0-9]/.test(password)) return 'Password must include a number.';
  return '';
};

export const validateProfessionalId = (role, value) => {
  const id = String(value || '').trim();
  const label = role === 'doctor' ? 'SLMC registration number' : role === 'pharmacist' ? 'Pharmacy registration number' : 'Nurse ID';
  if (!id) return `${label} is required.`;
  if (role === 'doctor' && !/^\d{4,10}$/.test(id)) return 'SLMC registration number must contain 4 to 10 digits.';
  if (role === 'nurse' && !/^[A-Za-z]{1,5}[-/]?\d{2,10}$/.test(id)) return 'Enter a valid Nurse ID, for example N-2041.';
  if (role === 'pharmacist' && !/^[A-Za-z0-9][A-Za-z0-9/-]{2,19}$/.test(id)) return 'Enter a valid pharmacy registration number, for example PH-778.';
  return '';
};

export const authErrorMessage = (error, fallback = 'Authentication failed. Please try again.') => ({
  'auth/email-already-in-use': 'An account already exists for this email. Sign in or reset the password.',
  'auth/invalid-email': 'Enter a valid email address.',
  'auth/invalid-credential': 'The email or password is incorrect.',
  'auth/wrong-password': 'The email or password is incorrect.',
  'auth/user-not-found': 'The email or password is incorrect.',
  'auth/user-disabled': 'This account has been disabled. Contact support.',
  'auth/too-many-requests': 'Too many attempts. Wait a moment before trying again.',
  'auth/network-request-failed': 'Unable to connect. Check your internet connection and try again.',
  'auth/weak-password': 'Choose a stronger password.',
  'auth/role-mismatch': error?.message || 'This account does not match the selected role.',
}[error?.code] || error?.message || fallback);
