import { createContext, useCallback, useContext, useMemo, useRef, useState } from 'react';
import type { ReactNode } from 'react';
import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';

import { MUTED_TEXT_OPACITY } from '@/constants/Colors';
import { useTheme } from '@/context/ThemeContext';


interface ConfirmOptions {
  /** Label for the affirming button. Defaults to 'OK'. */
  confirmLabel?: string;
  /** Label for the dismissing button. Defaults to 'Cancel'. */
  cancelLabel?: string;
  /** For styling destructive action buttons. */
  destructive?: boolean;
}

interface AppAlertContextValue {
  /** In-app replacement for `Alert.alert(title, message)` — a single 'OK'
   * dismiss. Resolves once the user dismisses it. */
  alert: (title: string, message?: string) => Promise<void>;
  /** In-app replacement for a two-button `Alert.alert` confirmation.
   * Resolves `true` if the user confirmed, `false` if they cancelled or
   * dismissed via the backdrop. */
  confirm: (title: string, message?: string, options?: ConfirmOptions) => Promise<boolean>;
}

type DialogState =
  | { kind: 'alert'; title: string; message?: string }
  | { kind: 'confirm'; title: string; message?: string; options?: ConfirmOptions };

const AppAlertContext = createContext<AppAlertContextValue | null>(null);

export function AppAlertProvider({ children }: { children: ReactNode }) {
  const { palette } = useTheme();
  const [dialog, setDialog] = useState<DialogState | null>(null);
  const resolverRef = useRef<((value: boolean) => void) | null>(null);

  const settle = useCallback((value: boolean) => {
    resolverRef.current?.(value);
    resolverRef.current = null;
    setDialog(null);
  }, []);

  const alert = useCallback((title: string, message?: string) => {
    return new Promise<void>((resolve) => {
      resolverRef.current = () => resolve();
      setDialog({ kind: 'alert', title, message });
    });
  }, []);

  const confirm = useCallback((title: string, message?: string, options?: ConfirmOptions) => {
    return new Promise<boolean>((resolve) => {
      resolverRef.current = resolve;
      setDialog({ kind: 'confirm', title, message, options });
    });
  }, []);

  const value = useMemo(() => ({ alert, confirm }), [alert, confirm]);

  return (
    <AppAlertContext.Provider value={value}>
      {children}
      <Modal visible={dialog != null} transparent animationType="fade" onRequestClose={() => settle(false)}>
        <Pressable style={[styles.backdrop, { backgroundColor: palette.backdrop }]} onPress={() => settle(false)}>
          <Pressable
            style={[styles.card, { backgroundColor: palette.surface }]}
            onPress={(e) => e.stopPropagation()}>
            {dialog ? (
              <>
                <Text style={[styles.title, { color: palette.onSurfaceText }]}>{dialog.title}</Text>
                {dialog.message ? (
                  <Text style={[styles.message, { color: palette.onSurfaceText }]}>{dialog.message}</Text>
                ) : null}
                <View style={styles.buttonRow}>
                  {dialog.kind === 'confirm' ? (
                    <Pressable
                      style={[styles.button, { backgroundColor: palette.secondaryFill }]}
                      onPress={() => settle(false)}>
                      <Text style={[styles.cancelButtonText, { color: palette.onSurfaceText }]}>
                        {dialog.options?.cancelLabel ?? 'Cancel'}
                      </Text>
                    </Pressable>
                  ) : null}
                  <Pressable
                    style={[
                      styles.button,
                      { backgroundColor: palette.accent },
                      dialog.kind === 'confirm' &&
                        dialog.options?.destructive && { backgroundColor: palette.danger },
                    ]}
                    onPress={() => settle(true)}>
                    <Text style={[styles.confirmButtonText, { color: palette.onAccentText }]}>
                      {dialog.kind === 'confirm' ? dialog.options?.confirmLabel ?? 'OK' : 'OK'}
                    </Text>
                  </Pressable>
                </View>
              </>
            ) : null}
          </Pressable>
        </Pressable>
      </Modal>
    </AppAlertContext.Provider>
  );
}

export function useAppAlert(): AppAlertContextValue {
  const ctx = useContext(AppAlertContext);
  if (!ctx) {
    throw new Error('useAppAlert must be used within an AppAlertProvider');
  }
  return ctx;
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  card: {
    width: '100%',
    maxWidth: 360,
    borderRadius: 16,
    padding: 20,
    gap: 8,
    shadowColor: '#0f172a',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.2,
    shadowRadius: 20,
    elevation: 8,
  },
  title: {
    fontSize: 17,
    fontWeight: '700',
  },
  message: {
    fontSize: 14.5,
    lineHeight: 20,
    opacity: MUTED_TEXT_OPACITY,
  },
  buttonRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 8,
    marginTop: 12,
  },
  button: {
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 10,
    alignItems: 'center',
  },
  cancelButtonText: {
    fontWeight: '700',
  },
  confirmButtonText: {
    fontWeight: '700',
  },
});
