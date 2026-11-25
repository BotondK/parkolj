import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { Animated, PanResponder, Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import { Icon } from './icons';
import { C, isDark, styles } from './ui';

// Húzható alsó panel a térkép fölött (mint a BudapestGO-ban): a fogantyúnál fel- és lehúzható.
// Három állás: kicsi (több térkép), közepes (alap) és teljes képernyő; teljes képernyőn fent „˅ cím” sáv, azzal vagy húzással jön vissza.
// Koppintás a fogantyúra: közepes ↔ teljes. Telefonon érintéssel, weben egérrel is működik.

export type Snap = 'min' | 'mid' | 'full';
const ORDER: Snap[] = ['min', 'mid', 'full'];

/** A húzás végén melyik állásba ugorjon: gyors mozdulatnál a következőbe, különben a legközelebbibe */
export function pickSnap(h: number, vy: number, heights: Record<Snap, number>, from: Snap): Snap {
  if (Math.abs(vy) > 0.6) {
    const i = ORDER.indexOf(from);
    return ORDER[Math.max(0, Math.min(2, i + (vy < 0 ? 1 : -1)))];
  }
  return ORDER.reduce((best, s) => (Math.abs(heights[s] - h) < Math.abs(heights[best] - h) ? s : best), from);
}

type Props = {
  /** Közepes magasság a rendelkezésre álló hely arányában (pl. 0.46) */
  midPct: number;
  title: string;
  /** Ha változik (pl. új lépés), a panel visszaáll közepesre */
  resetKey: string;
  labels: { expand: string; collapse: string };
  children: ReactNode;
  /** Alsó fülsor; teljes képernyőn elrejtjük, mint a BudapestGO-ban */
  footer: ReactNode;
  onSnap?: (s: Snap) => void;
  /** Teljes képernyőn a cím alatt (pl. a kereső, ami amúgy a térképen van) */
  top?: ReactNode;
};

export function BottomSheet({ midPct, title, resetKey, labels, children, footer, onSnap, top }: Props) {
  const [areaH, setAreaH] = useState(0);
  const [snap, setSnapState] = useState<Snap>('mid');
  const heights = useMemo<Record<Snap, number>>(() => {
    const H = areaH || 700;
    return { min: Math.min(Math.max(H * 0.24, 190), H * 0.4), mid: H * midPct, full: H };
  }, [areaH, midPct]);
  const h = useRef(new Animated.Value(heights.mid)).current;
  const cur = useRef({ snap, heights, start: 0 });
  cur.current.snap = snap;
  cur.current.heights = heights;

  const go = (s: Snap) => {
    setSnapState(s);
    onSnap?.(s);
    Animated.spring(h, { toValue: cur.current.heights[s], useNativeDriver: false, bounciness: 0, speed: 18 }).start();
  };
  // Új lépésnél vagy méretváltozásnál a megfelelő magasságra áll
  useEffect(() => go('mid'), [resetKey]);
  // Eltűnéskor (másik fül) a szülő is tudja, hogy már nincs felhúzva
  useEffect(() => () => onSnap?.('mid'), []);
  useEffect(() => h.setValue(heights[cur.current.snap]), [heights]);

  const pan = useMemo(
    () =>
      PanResponder.create({
        onStartShouldSetPanResponder: () => false,
        onMoveShouldSetPanResponderCapture: (_, g) => Math.abs(g.dy) > 4 && Math.abs(g.dy) > Math.abs(g.dx),
        onPanResponderGrant: () => {
          h.stopAnimation((v) => (cur.current.start = v));
        },
        onPanResponderMove: (_, g) => {
          const { heights: hs, start } = cur.current;
          h.setValue(Math.max(hs.min * 0.85, Math.min(hs.full, start - g.dy)));
        },
        onPanResponderRelease: (_, g) => {
          const { heights: hs, start, snap: from } = cur.current;
          go(pickSnap(start - g.dy, g.vy, hs, from));
        },
        onPanResponderTerminate: () => go(cur.current.snap),
      }),
    [],
  );

  const full = snap === 'full';
  const toggle = () => go(snap === 'full' ? 'mid' : snap === 'min' ? 'mid' : 'full');
  const webLayer = Platform.OS === 'web' ? ({ transform: 'translateZ(0)', userSelect: 'none', touchAction: 'none' } as object) : null;

  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="box-none" onLayout={(e) => setAreaH(e.nativeEvent.layout.height)}>
      <Animated.View testID="sheet" style={[styles.sheet, { height: h }, full && { borderTopLeftRadius: 0, borderTopRightRadius: 0 }, Platform.OS === 'web' && ({ transform: 'translateZ(0)' } as object)]}>
        <View {...pan.panHandlers} style={webLayer}>
          {full ? (
            <Pressable onPress={() => go('mid')} accessibilityRole="button" accessibilityLabel={labels.collapse} testID="sheet-collapse" style={{ flexDirection: 'row', alignItems: 'center', gap: 14, paddingHorizontal: 18, paddingTop: 14, paddingBottom: 10, backgroundColor: C.bg }}>
              <View style={{ transform: [{ rotate: '90deg' }] }}>
                <Icon name="chevron" size={24} color={isDark ? C.text : C.brand} />
              </View>
              <Text style={{ fontSize: 22, fontWeight: '800', color: isDark ? C.text : C.brand }}>{title}</Text>
            </Pressable>
          ) : (
            <Pressable onPress={toggle} accessibilityRole="button" accessibilityLabel={labels.expand} testID="sheet-handle" hitSlop={8} style={{ paddingTop: 2, paddingBottom: 6 }}>
              <View style={styles.grabber} />
            </Pressable>
          )}
        </View>
        {full && top}
        {children}
        {!full && footer}
      </Animated.View>
    </View>
  );
}
