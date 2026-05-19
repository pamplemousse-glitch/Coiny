import { useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';

import { Button } from '@/components/button';
import { Card } from '@/components/card';
import { CenteredMessage } from '@/components/centered-message';
import { CurrencyField } from '@/components/currency-field';
import { ThemedText } from '@/components/themed-text';
import { useThemeColor } from '@/hooks/use-theme-color';
import { useApi } from '@/hooks/use-api';
import { ApiError, getPet, updateGoals, type PetGoals } from '@/services/api';

// The rule engine only evaluates these three weekly-budget categories.
const BUDGET_CATEGORIES = [
  { key: 'groceries', label: 'Groceries' },
  { key: 'food_and_drink', label: 'Food & drink' },
  { key: 'restaurants', label: 'Restaurants' },
] as const;

type BudgetKey = (typeof BUDGET_CATEGORIES)[number]['key'];
type FieldKey = BudgetKey | 'savingsGoal' | 'paycheckMinAmount' | 'largePurchaseThreshold';
type FormState = Record<FieldKey, string>;
type Status = { type: 'success' | 'error'; text: string };

function seedForm(goals: PetGoals): FormState {
  return {
    groceries: String(goals.weeklyBudgetByCategory.groceries ?? ''),
    food_and_drink: String(goals.weeklyBudgetByCategory.food_and_drink ?? ''),
    restaurants: String(goals.weeklyBudgetByCategory.restaurants ?? ''),
    savingsGoal: String(goals.savingsGoal),
    paycheckMinAmount: String(goals.paycheckMinAmount),
    largePurchaseThreshold: String(goals.largePurchaseThreshold),
  };
}

function parsePositive(value: string): number | null {
  const n = Number(value.trim());
  return Number.isFinite(n) && n > 0 ? n : null;
}

function GoalsForm({ initialGoals }: { initialGoals: PetGoals }) {
  const background = useThemeColor({}, 'background');
  const muted = useThemeColor({}, 'muted');

  const [form, setForm] = useState<FormState>(() => seedForm(initialGoals));
  const [saving, setSaving] = useState(false);
  const [status, setStatus] = useState<Status | null>(null);

  const setField = (key: FieldKey) => (next: string) => {
    setForm((prev) => ({ ...prev, [key]: next }));
    setStatus(null);
  };

  const onSave = () => {
    const parsed = {} as Record<FieldKey, number>;
    for (const key of Object.keys(form) as FieldKey[]) {
      const value = parsePositive(form[key]);
      if (value === null) {
        setStatus({ type: 'error', text: 'Enter a positive amount for every field.' });
        return;
      }
      parsed[key] = value;
    }

    setSaving(true);
    setStatus(null);
    void (async () => {
      try {
        const saved = await updateGoals({
          weeklyBudgetByCategory: {
            groceries: parsed.groceries,
            food_and_drink: parsed.food_and_drink,
            restaurants: parsed.restaurants,
          },
          savingsGoal: parsed.savingsGoal,
          paycheckMinAmount: parsed.paycheckMinAmount,
          largePurchaseThreshold: parsed.largePurchaseThreshold,
        });
        setForm(seedForm(saved));
        setStatus({ type: 'success', text: 'Goals saved.' });
      } catch (err) {
        const text = err instanceof ApiError ? err.message : 'Could not save goals. Try again.';
        setStatus({ type: 'error', text });
      } finally {
        setSaving(false);
      }
    })();
  };

  return (
    <ScrollView
      style={{ backgroundColor: background }}
      contentContainerStyle={styles.content}
      keyboardShouldPersistTaps="handled">
      <Card>
        <ThemedText type="subtitle" style={styles.cardTitle}>
          Weekly budgets
        </ThemedText>
        <View style={styles.fields}>
          {BUDGET_CATEGORIES.map(({ key, label }) => (
            <CurrencyField
              key={key}
              label={label}
              hint="Weekly limit before Coiny frowns"
              value={form[key]}
              onChangeText={setField(key)}
            />
          ))}
        </View>
      </Card>

      <Card>
        <ThemedText type="subtitle" style={styles.cardTitle}>
          Targets &amp; thresholds
        </ThemedText>
        <View style={styles.fields}>
          <CurrencyField
            label="Savings goal"
            hint="Balance that unlocks a celebration"
            value={form.savingsGoal}
            onChangeText={setField('savingsGoal')}
          />
          <CurrencyField
            label="Paycheck minimum"
            hint="Smallest deposit counted as a paycheck"
            value={form.paycheckMinAmount}
            onChangeText={setField('paycheckMinAmount')}
          />
          <CurrencyField
            label="Large purchase threshold"
            hint="Purchases above this are flagged"
            value={form.largePurchaseThreshold}
            onChangeText={setField('largePurchaseThreshold')}
          />
        </View>
      </Card>

      {status ? (
        <ThemedText
          style={[styles.status, { color: status.type === 'success' ? '#2e9e5b' : '#cf3b3b' }]}>
          {status.text}
        </ThemedText>
      ) : null}

      <Button label="Save goals" onPress={onSave} busy={saving} />
      <ThemedText style={[styles.footnote, { color: muted }]}>
        Changes apply to the rule engine immediately.
      </ThemedText>
    </ScrollView>
  );
}

export default function GoalsScreen() {
  const { data, error, loading } = useApi(getPet);

  if (loading) {
    return <CenteredMessage loading title="Loading goals…" />;
  }
  if (error || !data) {
    return (
      <CenteredMessage
        title="Couldn't load goals"
        detail={error ?? 'No goal data was returned.'}
      />
    );
  }
  return <GoalsForm initialGoals={data.goals} />;
}

const styles = StyleSheet.create({
  content: {
    padding: 16,
    gap: 16,
  },
  cardTitle: {
    marginBottom: 12,
  },
  fields: {
    gap: 16,
  },
  status: {
    fontSize: 14,
    fontWeight: '600',
  },
  footnote: {
    fontSize: 13,
    textAlign: 'center',
  },
});
