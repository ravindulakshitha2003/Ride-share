import { colors } from '../theme/colors';

// Rates a password from level 0 (too short) to 4 (strong) for the strength bar.
const LABELS = ['', 'Weak', 'Fair', 'Good', 'Strong'];
const COLORS = [colors.disabled, colors.error, colors.star, colors.info, colors.success];

export function passwordStrength(password) {
  if (!password) return { level: 0, label: '', color: COLORS[0] };

  // The backend needs at least 8 characters.
  if (password.length < 8) {
    return { level: 0, label: 'Too short', color: COLORS[1] };
  }

  let points = 0;
  if (password.length >= 12) points += 1;
  if (/[a-z]/.test(password) && /[A-Z]/.test(password)) points += 1;
  if (/\d/.test(password)) points += 1;
  if (/[^A-Za-z0-9]/.test(password)) points += 1;

  const level = Math.min(4, 1 + points);

  return { level, label: LABELS[level], color: COLORS[level] };
}
