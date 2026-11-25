// Centralized single source of truth for all application colors:
// Import: import { colors } from '../theme/colors'; or from '../../theme/colors';

export const colors = {
  // --- 1. Core Brand Colors ---
  // Main brand color (Indigo): used for primary buttons, links and active highlights
  primary: '#5B4BDB',

  // Darker indigo: used for headings, headers and pressed button states
  secondary: '#312E81',

  // Light pink/violet: used sparingly for small accents and decorations
  accent: '#F0ABFC',

  // --- 2. Canvas & Surfaces ---
  // Very light lavender: used as the background of screens
  background: '#F8F7FF',

  // Pure white: used for card backgrounds and text on primary buttons
  surface: '#FFFFFF',
  white: '#FFFFFF',

  // Soft lavender-grey: used for input field borders and divider lines
  border: '#D9D6F5',
  borderSubtle: '#E4E1F5',
  line: '#CFC9F5',

  // Soft tints for chips, pills and background gradients
  tint: '#EEEBFF',
  gradientEnd: '#E9E4FF',
  lightPurple: '#ECEAFF',
  lightPink: '#FBE9FF',

  // --- 3. Typography ---
  // Dark purple-grey: used for normal body text (softer than pure black)
  text: '#24213B',

  // Muted grey: used for secondary text, hints, placeholders, and timestamps
  textMuted: '#6B7280',
  textSecondary: '#77738F',
  muted: '#77738F',

  // --- 4. Semantic Feedback (Toasts, Badges, Status Alerts) ---
  // Success (Green)
  success: '#16A34A',
  successSoft: '#E8F7EE',

  // Warning (Amber)
  warning: '#D97706',
  warningSoft: '#FEF3C7',
  amber: '#B45309',

  // Error / Danger (Red)
  error: '#DC2626',
  errorSoft: '#FEF2F2',
  danger: '#DC2626',
  dangerSoft: '#FEF2F2',

  // Information (Blue)
  info: '#2563EB',
  infoSoft: '#EFF6FF',

  // --- 5. Interactive & Utility ---
  star: '#F59E0B',
  greySoft: '#F1F0F7',
  grey: '#6B7280',
  disabled: '#D1D5DB',
  disabledText: '#9CA3AF',
};

export default colors;
