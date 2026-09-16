import { useMemo, useState } from 'react';
import { Pressable, StyleSheet, View as RNView } from 'react-native';
import { SymbolView } from 'expo-symbols';

import { DateRangeDialog, type DateRange } from '@/components/DateRangeDialog';
import { FormTextInput } from '@/components/form/FormTextInput';
import { MultiSelectChips } from '@/components/form/MultiSelectChips';
import { Text, View } from '@/components/Themed';
import { MUTED_TEXT_OPACITY } from '@/constants/Colors';
import { useTheme } from '@/context/ThemeContext';
import type { EventType } from '@/models/types';
import { formatIsoDateForDisplay, toIsoDateString } from '@/utils/date';
import { getEventTypeOptions } from '@/utils/eventTheme';

// Pokémon's first release date (27 February 1996, Japan)
const DEFAULT_DATE_FROM = '1996-02-27';

export function DashboardFilterBar({
  typeFilters,
  onTypeFiltersChange,
  deckQuery,
  onDeckQueryChange,
  dateRange,
  onDateRangeChange,
  onClear,
  active,
}: {
  typeFilters: EventType[];
  onTypeFiltersChange: (value: EventType[]) => void;
  deckQuery: string;
  onDeckQueryChange: (value: string) => void;
  dateRange: DateRange | null;
  onDateRangeChange: (value: DateRange | null) => void;
  onClear: () => void;
  active: boolean;
}) {
  const { palette, themeId } = useTheme();
  const typeFilterOptions = useMemo(() => getEventTypeOptions(themeId), [themeId]);
  const [dateDialogOpen, setDateDialogOpen] = useState(false);

  const dateLabel = dateRange
    ? `${formatIsoDateForDisplay(dateRange.from)} – ${formatIsoDateForDisplay(dateRange.to)}`
    : 'Date';

  return (
    <View style={[styles.filterBar, { borderBottomColor: palette.borderSubtle }]}>
      <RNView style={styles.searchRow}>
        <FormTextInput
          style={styles.searchInput}
          value={deckQuery}
          onChangeText={onDeckQueryChange}
          placeholder="Search by deck or Pokémon"
        />
        <Pressable
          style={[
            styles.dateButton,
            { backgroundColor: palette.surface, borderColor: palette.border },
            dateRange && { backgroundColor: palette.accent, borderColor: palette.accent },
          ]}
          onPress={() => setDateDialogOpen(true)}>
          <SymbolView
            name={{ android: 'calendar_today' }}
            tintColor={dateRange ? palette.onAccentText : palette.accent}
            size={16}
          />
          <Text
            style={[
              styles.dateButtonText,
              { color: palette.accent },
              dateRange && { color: palette.onAccentText },
            ]}>
            {dateLabel}
          </Text>
        </Pressable>
        <Pressable onPress={onClear} disabled={!active} hitSlop={8}>
          <Text style={[styles.filterClear, { color: palette.accent }, !active && styles.filterClearDisabled]}>
            Clear
          </Text>
        </Pressable>
      </RNView>

      <MultiSelectChips options={typeFilterOptions} values={typeFilters} onChange={onTypeFiltersChange} />

      <DateRangeDialog
        visible={dateDialogOpen}
        from={dateRange?.from ?? DEFAULT_DATE_FROM}
        to={dateRange?.to ?? toIsoDateString(new Date())}
        hasActiveRange={dateRange != null}
        onApply={(from, to) => {
          onDateRangeChange({ from, to });
          setDateDialogOpen(false);
        }}
        onClear={() => {
          onDateRangeChange(null);
          setDateDialogOpen(false);
        }}
        onClose={() => setDateDialogOpen(false)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  filterBar: {
    padding: 16,
    paddingBottom: 12,
    gap: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  searchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
  },
  dateButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 10,
    borderWidth: StyleSheet.hairlineWidth,
  },
  dateButtonText: {
    fontSize: 14,
    fontWeight: '600',
  },
  filterClear: {
    fontSize: 13,
    fontWeight: '600',
  },
  filterClearDisabled: {
    opacity: MUTED_TEXT_OPACITY,
  },
});
