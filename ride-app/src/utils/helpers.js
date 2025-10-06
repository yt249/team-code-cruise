import { v4 as uuidv4 } from 'uuid';

// Generate unique ID
export function generateId() {
  return uuidv4();
}

// Format currency
export function formatCurrency(amount) {
  return `$${amount.toFixed(2)}`;
}

// Format time
export function formatTime(minutes) {
  if (minutes < 1) return 'Less than 1 min';
  if (minutes === 1) return '1 min';
  return `${minutes} mins`;
}

// Simulate async delay
export function delay(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// Format phone number
export function formatPhone(phone) {
  return phone.replace(/(\d{1})(\d{3})(\d{3})(\d{4})/, '+$1 ($2) $3-$4');
}
