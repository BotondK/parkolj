import { useEffect, useState } from 'react';
import { Platform, Pressable, Text, View } from 'react-native';
import { Icon, type IconName } from './icons';
import { C, isDark, styles } from './ui';

// Asztali nézet: jobb felső „pirula” órával és menügombbal, kattintásra lebegő lenyíló menü (mint a BudapestGO weben).
// Egy sor lehet sima menüpont, vagy almenü (pl. Nyelv ▸), elválasztóval csoportosítva.

/** Weben az egér fölötte (react-native-web „hovered”), máshol a lenyomás */
const hov = (st: { pressed: boolean }) => !!(st as { hovered?: boolean }).hovered || st.pressed;

export type TopMenuItem =
  | { icon: IconName; label: string; hint?: string; onPress: () => void; testID?: string }
  | { icon: IconName; label: string; sub: { label: string; on: boolean; onPress: () => void }[] }
  | 'divider';

export function TopMenu({ clock, items, label }: { clock: string; items: TopMenuItem[]; label: string }) {
  const [open, setOpen] = useState(false);
  const [subOpen, setSubOpen] = useState<string | null>(null);
  const close = () => {
    setOpen(false);
    setSubOpen(null);
  };
  // Esc bezárja (weben)
  useEffect(() => {
    if (!open || Platform.OS !== 'web') return;
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && close();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open]);
  const ink = isDark ? C.text : C.brand;

  return (
    <View>
      {/* Kattintás a menün kívül: bezár (az egész ablakot lefedő átlátszó réteg) */}
      {open && <Pressable onPress={close} aria-hidden focusable={false} style={[{ position: 'absolute', top: -2000, left: -4000, width: 8000, height: 8000 }, Platform.OS === 'web' && ({ position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh', cursor: 'default' } as object)]} />}
      <View style={[styles.pill, { paddingRight: 8, gap: 6 }]}>
        <Text style={{ fontSize: 26, fontWeight: '800', color: C.text, fontVariant: ['tabular-nums'] }}>{clock}</Text>
        <Pressable onPress={() => (open ? close() : setOpen(true))} role="button" aria-expanded={open} accessibilityLabel={label} testID="top-menu-btn" hitSlop={6} style={(st) => ({ width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center', backgroundColor: hov(st) || open ? C.soft : 'transparent' })}>
          <Icon name="burger" size={26} color={ink} />
        </Pressable>
      </View>
      {open && (
        <View role="menu" testID="top-menu" style={{ position: 'absolute', top: 66, right: 0, minWidth: 270, backgroundColor: C.card, borderRadius: 16, paddingVertical: 6, shadowColor: '#000', shadowOpacity: 0.2, shadowRadius: 14, shadowOffset: { width: 0, height: 4 }, elevation: 8 }}>
          {items.map((it, i) => {
            if (it === 'divider') return <View key={`d${i}`} style={{ height: 1, backgroundColor: C.line, marginVertical: 6 }} />;
            const hasSub = 'sub' in it;
            const row = (
              <Pressable
                key={it.label}
                role="menuitem"
                testID={'testID' in it ? it.testID : undefined}
                aria-expanded={hasSub ? subOpen === it.label : undefined}
                onPress={() => {
                  if (hasSub) setSubOpen(subOpen === it.label ? null : it.label);
                  else {
                    close();
                    it.onPress();
                  }
                }}
                style={(st) => ({ flexDirection: 'row', alignItems: 'center', gap: 14, paddingHorizontal: 18, paddingVertical: 10, backgroundColor: hov(st) ? C.soft : 'transparent' })}
              >
                <Icon name={it.icon} size={22} color={ink} />
                <Text style={{ flex: 1, fontSize: 16, color: C.text }}>
                  {it.label}
                  {'hint' in it && it.hint ? <Text style={{ color: C.sub }}> ({it.hint})</Text> : null}
                </Text>
                {hasSub && <Text style={{ color: C.sub, fontSize: 12 }}>{subOpen === it.label ? '▾' : '▸'}</Text>}
              </Pressable>
            );
            if (!hasSub || subOpen !== it.label) return row;
            return (
              <View key={it.label}>
                {row}
                {it.sub.map((s) => (
                  <Pressable
                    key={s.label}
                    role="menuitem"
                    accessibilityLabel={s.on ? `${s.label} ✓` : s.label}
                    onPress={() => {
                      close();
                      s.onPress();
                    }}
                    style={(st) => ({ flexDirection: 'row', alignItems: 'center', paddingLeft: 54, paddingRight: 18, paddingVertical: 8, backgroundColor: hov(st) ? C.soft : 'transparent' })}
                  >
                    <Text style={{ flex: 1, fontSize: 15, color: C.text, fontWeight: s.on ? '700' : '400' }}>{s.label}</Text>
                    {s.on && <Icon name="check" size={18} color={ink} />}
                  </Pressable>
                ))}
              </View>
            );
          })}
        </View>
      )}
    </View>
  );
}
