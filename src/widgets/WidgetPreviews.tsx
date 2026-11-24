// A kezdőképernyő-widgetek előnézete React Native nézetekből (webes demó: Menü → Widgetek, és a widgetválasztó képei).
// Ugyanazt az adatot és elrendezést mutatja, mint a natív widgetek (src/widgets/android, targets/widget).
import type { ReactNode } from 'react';
import { Pressable, Text, View } from 'react-native';
import { SvgXml } from 'react-native-svg';
import { clockText, iconSvg, leftText, progress, widgetState, WIDGET_THEME, type WidgetAction, type WidgetData, type WidgetTheme } from './widgetModel';

type Act = (a: WidgetAction) => void;

const Ico = ({ name, color, size = 18 }: { name: Parameters<typeof iconSvg>[0]; color: string; size?: number }) => <SvgXml xml={iconSvg(name, color, size)} width={size} height={size} />;

function Frame({ th, w, h, label, onPress, children }: { th: WidgetTheme; w: number; h: number; label: string; onPress?: () => void; children: ReactNode }) {
  return (
    <Pressable
      onPress={onPress}
      role={onPress ? 'button' : undefined}
      accessibilityLabel={label}
      style={{ width: w, height: h, borderRadius: 22, backgroundColor: th.bg, padding: 14, justifyContent: 'space-between', shadowColor: '#000', shadowOpacity: 0.12, shadowRadius: 12, shadowOffset: { width: 0, height: 4 } }}
    >
      {children}
    </Pressable>
  );
}

function Btn({ th, text, icon, primary, onPress }: { th: WidgetTheme; text: string; icon: Parameters<typeof iconSvg>[0]; primary?: boolean; onPress: () => void }) {
  const fg = primary ? th.onBtn : th.onBtn2;
  return (
    <Pressable onPress={onPress} role="button" accessibilityLabel={text} style={{ flex: 1, height: 40, borderRadius: 20, backgroundColor: primary ? th.btn : th.btn2, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
      <Ico name={icon} color={fg} size={16} />
      <Text style={{ color: fg, fontWeight: '700', fontSize: 14 }}>{text}</Text>
    </Pressable>
  );
}

function Badge({ d, size = 34 }: { d: WidgetData; size?: number }) {
  return (
    <View style={{ width: size, height: size, borderRadius: 9, backgroundColor: d.active!.color, alignItems: 'center', justifyContent: 'center' }}>
      <Text style={{ color: '#fff', fontWeight: '900', fontSize: size * 0.55 }}>{d.active!.zone ?? 'P'}</Text>
    </View>
  );
}

function Bar({ th, d, now, color }: { th: WidgetTheme; d: WidgetData; now: number; color: string }) {
  return (
    <View style={{ height: 6, borderRadius: 3, backgroundColor: th.track, overflow: 'hidden' }}>
      <View style={{ width: `${Math.round(progress(d, now) * 100)}%`, height: 6, backgroundColor: color }} />
    </View>
  );
}

/** „Parkolásom”, kicsi (2×2) vagy közepes (4×2). `live`: iPhone-on élő visszaszámlálás, Androidon a lejárat ideje. */
export function ParkingPreview({ d, now, dark, size, live, onAction }: { d: WidgetData; now: number; dark: boolean; size: 'small' | 'medium'; live: boolean; onAction: Act }) {
  const th = WIDGET_THEME[dark ? 'dark' : 'light'];
  const L = d.labels;
  const st = widgetState(d, now);
  const w = size === 'small' ? 158 : 338;
  if (st === 'idle')
    return (
      <Frame th={th} w={w} h={158} label={`${L.title}: ${L.idle}`} onPress={size === 'small' ? () => onAction('here') : undefined}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
          <Ico name="parking" color={th.brand} size={20} />
          <Text style={{ color: th.brand, fontWeight: '800', fontSize: 14 }}>{L.title}</Text>
        </View>
        <View>
          <Text style={{ color: th.text, fontWeight: '700', fontSize: 16 }} numberOfLines={2}>
            {L.idle}
          </Text>
          {size === 'small' && <Text style={{ color: th.sub, fontSize: 12, marginTop: 2 }}>{L.idleSub}</Text>}
        </View>
        {size === 'medium' && (
          <View style={{ flexDirection: 'row' }}>
            <Btn th={th} text={L.here} icon="pin" primary onPress={() => onAction('here')} />
          </View>
        )}
      </Frame>
    );
  const a = d.active!;
  const color = st === 'expired' ? th.danger : st === 'soon' ? th.warn : th.text;
  const big = st === 'expired' ? L.expired : live ? leftText(d, now) : `${L.expires} ${clockText(a.endsAt, d.lang)}`;
  const small = live && st !== 'expired' ? `${L.expires} ${clockText(a.endsAt, d.lang)}` : st === 'soon' ? L.soon : null;
  const title = `${a.zone ? `${a.zone} ${L.zone} · ` : ''}${a.plate}`;
  if (size === 'small')
    return (
      <Frame th={th} w={w} h={158} label={`${L.title}: ${title}, ${big}`} onPress={() => onAction('open')}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
          <Badge d={d} size={30} />
          <Text style={{ color: th.sub, fontWeight: '700', fontSize: 12 }}>{a.plate}</Text>
        </View>
        <View style={{ gap: 2 }}>
          <Text style={{ color, fontWeight: '800', fontSize: live ? 30 : 20, fontVariant: ['tabular-nums'] }} numberOfLines={1}>
            {big}
          </Text>
          {!!small && <Text style={{ color: th.sub, fontWeight: '600', fontSize: 13 }}>{small}</Text>}
          <View style={{ marginTop: 4 }}>
            <Bar th={th} d={d} now={now} color={st === 'active' ? th.brand : color} />
          </View>
        </View>
      </Frame>
    );
  return (
    <Frame th={th} w={w} h={158} label={L.title}>
      <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 10 }}>
        <Badge d={d} />
        <View style={{ flex: 1 }}>
          <Text style={{ color: th.text, fontWeight: '700', fontSize: 14 }} numberOfLines={1}>
            {title}
          </Text>
          <Text style={{ color: th.sub, fontSize: 12 }} numberOfLines={1}>
            {a.place}
          </Text>
        </View>
        <View style={{ alignItems: 'flex-end' }}>
          <Text style={{ color, fontWeight: '800', fontSize: live ? 26 : 20, fontVariant: ['tabular-nums'] }}>{big}</Text>
          {!!small && <Text style={{ color: th.sub, fontWeight: '600', fontSize: 12 }}>{small}</Text>}
        </View>
      </View>
      <Bar th={th} d={d} now={now} color={st === 'active' ? th.brand : color} />
      <View style={{ flexDirection: 'row', gap: 8 }}>
        {st !== 'expired' && a.canExtend && <Btn th={th} text={L.extend} icon="plus" primary onPress={() => onAction('extend')} />}
        <Btn th={th} text={L.stop} icon="stop" onPress={() => onAction('stop')} />
      </View>
    </Frame>
  );
}

/** „Gyors indítás” (4×1 / közepes): Parkolás itt, Otthon, Munkahely */
export function QuickPreview({ d, dark, onAction }: { d: WidgetData; dark: boolean; onAction: Act }) {
  const th = WIDGET_THEME[dark ? 'dark' : 'light'];
  const L = d.labels;
  const tile = (act: WidgetAction, icon: Parameters<typeof iconSvg>[0], label: string, sub: string | null, primary?: boolean) => (
    <Pressable
      key={act}
      onPress={() => onAction(act)}
      role="button"
      accessibilityLabel={sub ? `${label}: ${sub}` : label}
      style={{ flex: 1, borderRadius: 16, backgroundColor: primary ? th.btn : th.btn2, alignItems: 'center', justifyContent: 'center', gap: 3, padding: 6 }}
    >
      <Ico name={icon} color={primary ? th.onBtn : th.onBtn2} size={24} />
      <Text style={{ color: primary ? th.onBtn : th.onBtn2, fontWeight: '700', fontSize: 13 }} numberOfLines={1}>
        {label}
      </Text>
      <Text style={{ color: primary ? th.onBtn : th.sub, fontSize: 11 }} numberOfLines={1}>
        {sub ?? ' '}
      </Text>
    </Pressable>
  );
  return (
    <View accessibilityLabel={L.quickTitle} style={{ width: 338, height: 110, borderRadius: 22, backgroundColor: th.bg, padding: 8, flexDirection: 'row', gap: 8, shadowColor: '#000', shadowOpacity: 0.12, shadowRadius: 12, shadowOffset: { width: 0, height: 4 } }}>
      {tile('here', 'pin', L.here, null, true)}
      {tile('home', 'home', L.home, d.home ?? L.notSet)}
      {tile('work', 'work', L.work, d.work ?? L.notSet)}
    </View>
  );
}

/** iPhone zárolt képernyő, téglalap alakú (egyszínű, a rendszer színezi) */
export function LockPreview({ d, now }: { d: WidgetData; now: number }) {
  const L = d.labels;
  const st = widgetState(d, now);
  const a = d.active;
  return (
    <View accessibilityLabel={`${L.title}`} style={{ width: 170, height: 72, borderRadius: 14, backgroundColor: 'rgba(255,255,255,0.16)', paddingHorizontal: 10, paddingVertical: 6, justifyContent: 'center' }}>
      {a ? (
        <>
          <Text style={{ color: '#fff', fontWeight: '600', fontSize: 13 }} numberOfLines={1}>
            {a.zone ? `${a.zone} ${L.zone} · ` : ''}
            {a.plate}
          </Text>
          <Text style={{ color: '#fff', fontWeight: '800', fontSize: 22, fontVariant: ['tabular-nums'] }}>{st === 'expired' ? L.expired : leftText(d, now)}</Text>
          <Text style={{ color: '#fff', fontSize: 12 }}>
            {L.expires} {clockText(a.endsAt, d.lang)}
          </Text>
        </>
      ) : (
        <>
          <Text style={{ color: '#fff', fontWeight: '700', fontSize: 13 }}>{L.title}</Text>
          <Text style={{ color: '#fff', fontSize: 13 }} numberOfLines={2}>
            {L.idle}
          </Text>
        </>
      )}
    </View>
  );
}

/** iPhone élő tevékenység: Dynamic Island (kicsi) és a zárolt képernyős értesítés (targets/widget/ParkingLiveActivity.swift) */
export function LivePreview({ d, now, onAction }: { d: WidgetData; now: number; onAction: Act }) {
  const a = d.active;
  const L = d.labels;
  if (!a) return null;
  const st = widgetState(d, now);
  const sub = '#D9C8E6';
  const badge = (size: number) => (
    <View style={{ width: size, height: size, borderRadius: size * 0.27, backgroundColor: a.color, alignItems: 'center', justifyContent: 'center' }}>
      <Text style={{ color: '#fff', fontWeight: '900', fontSize: size * 0.55 }}>{a.zone ?? 'P'}</Text>
    </View>
  );
  const timer = st === 'expired' ? L.expired : leftText(d, now);
  return (
    <View style={{ gap: 12, alignItems: 'center' }}>
      <View accessibilityLabel={`Dynamic Island: ${timer}`} style={{ width: 200, height: 36, borderRadius: 18, backgroundColor: '#000', flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 8 }}>
        {badge(22)}
        <Text style={{ color: st === 'expired' ? '#FF8A8A' : '#fff', fontWeight: '600', fontSize: 14, fontVariant: ['tabular-nums'] }}>{timer}</Text>
      </View>
      <View style={{ width: 338, borderRadius: 22, backgroundColor: '#2C0A3D', padding: 16, gap: 10 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
          {badge(34)}
          <View style={{ flex: 1 }}>
            <Text style={{ color: '#fff', fontWeight: '700', fontSize: 15 }} numberOfLines={1}>
              {a.zone ? `${a.zone} ${L.zone} · ` : ''}
              {a.plate}
            </Text>
            <Text style={{ color: sub, fontSize: 12 }} numberOfLines={1}>
              {a.place}
            </Text>
          </View>
          <View style={{ alignItems: 'flex-end' }}>
            <Text style={{ color: st === 'expired' ? '#FF8A8A' : '#fff', fontWeight: '800', fontSize: 26, fontVariant: ['tabular-nums'] }}>{timer}</Text>
            <Text style={{ color: sub, fontSize: 12, fontWeight: '600' }}>
              {L.expires} {clockText(a.endsAt, d.lang)}
            </Text>
          </View>
        </View>
        <View style={{ height: 6, borderRadius: 3, backgroundColor: 'rgba(255,255,255,0.16)', overflow: 'hidden' }}>
          <View style={{ width: `${Math.round(progress(d, now) * 100)}%`, height: 6, backgroundColor: '#C9A9DC' }} />
        </View>
        <View style={{ flexDirection: 'row', gap: 8 }}>
          {st !== 'expired' && a.canExtend && (
            <Pressable onPress={() => onAction('extend')} role="button" accessibilityLabel={L.extend} style={{ flex: 1, height: 34, borderRadius: 17, backgroundColor: '#C9A9DC', alignItems: 'center', justifyContent: 'center' }}>
              <Text style={{ color: '#2C0A3D', fontWeight: '700', fontSize: 14 }}>＋ {L.extend}</Text>
            </Pressable>
          )}
          <Pressable onPress={() => onAction('stop')} role="button" accessibilityLabel={L.stop} style={{ flex: 1, height: 34, borderRadius: 17, backgroundColor: 'rgba(255,255,255,0.16)', alignItems: 'center', justifyContent: 'center' }}>
            <Text style={{ color: '#fff', fontWeight: '700', fontSize: 14 }}>■ {L.stop}</Text>
          </Pressable>
        </View>
      </View>
    </View>
  );
}
