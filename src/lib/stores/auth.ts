import { writable } from 'svelte/store';
import type { Session } from '@auth/core/types';

export const session = writable<Session | null>(null);
export const isLoading = writable(true);
export const error = writable<string | null>(null);

export function setSession(sessionData: Session | null) {
  session.set(sessionData);
  isLoading.set(false);
}

export function setError(errorMessage: string | null) {
  error.set(errorMessage);
}

export function clearError() {
  error.set(null);
} 