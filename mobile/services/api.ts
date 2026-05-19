// Typed client for the Coiny backend REST API.

import { API_BASE_URL } from './env';

// ─── Types (mirror backend/src/store/pet.ts + reactions/types.ts) ───────────

export type Animation = 'happy' | 'sad' | 'celebrate' | 'concerned' | 'neutral' | 'sleeping';
export type Sound = 'chime' | 'fanfare' | 'warning' | 'coin' | 'off';
export type LedColor = 'green' | 'amber' | 'red' | 'rainbow' | 'off';

export type Reaction = {
  animation: Animation;
  sound: Sound;
  led: LedColor;
  duration: number;
  reason: string;
};

export type ReactionRecord = {
  at: string;
  eventType: string;
  reaction: Reaction;
};

export type PetGoals = {
  weeklyBudgetByCategory: Record<string, number>;
  savingsGoal: number;
  paycheckMinAmount: number;
  largePurchaseThreshold: number;
};

export type PetState = {
  healthScore: number;
  mood: number;
  lastReactionAt: string | null;
  reactionHistory: ReactionRecord[];
  goals: PetGoals;
};

export type SpendingItem = {
  at: string;
  eventType: string;
  reason: string;
  amount: string | null;
};

// PUT /api/pets/goals accepts a partial patch — every field is optional.
export type GoalsPatch = {
  weeklyBudgetByCategory?: Record<string, number>;
  savingsGoal?: number;
  paycheckMinAmount?: number;
  largePurchaseThreshold?: number;
};

// ─── Request helper ─────────────────────────────────────────────────────────

export class ApiError extends Error {
  readonly status: number;

  constructor(message: string, status: number) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
  }
}

const REQUEST_TIMEOUT_MS = 8000;

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

  let res: Response;
  try {
    res = await fetch(`${API_BASE_URL}${path}`, {
      ...init,
      signal: controller.signal,
      headers: { 'Content-Type': 'application/json', ...init?.headers },
    });
  } catch (err) {
    const aborted = err instanceof Error && err.name === 'AbortError';
    throw new ApiError(
      aborted
        ? 'Request timed out — is the backend running?'
        : `Cannot reach the backend at ${API_BASE_URL}.`,
      0,
    );
  } finally {
    clearTimeout(timeout);
  }

  if (!res.ok) {
    throw new ApiError(`Backend returned ${res.status} for ${path}.`, res.status);
  }
  return (await res.json()) as T;
}

// ─── Endpoints ──────────────────────────────────────────────────────────────

export function getPet(): Promise<PetState> {
  return request<PetState>('/api/pets');
}

export function getSpending(): Promise<SpendingItem[]> {
  return request<SpendingItem[]>('/api/spending');
}

export function updateGoals(patch: GoalsPatch): Promise<PetGoals> {
  return request<PetGoals>('/api/pets/goals', {
    method: 'PUT',
    body: JSON.stringify(patch),
  });
}
