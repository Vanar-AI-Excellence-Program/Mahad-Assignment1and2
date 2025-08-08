import { writable } from 'svelte/store';

export const error = writable<string | null>(null);

export function setError(errorMessage: string | null) {
  error.set(errorMessage);
}

export function clearError() {
  error.set(null);
} 