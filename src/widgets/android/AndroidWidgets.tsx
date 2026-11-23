// Android kezdőképernyő-widgetek (react-native-android-widget). Csak Androidon töltődik be (sync.android.tsx, widgetTask.tsx).
// Két widget: „Parkolásom” (aktív parkolás: zóna, lejárat, +15 perc, leállítás) és „Gyors indítás” (itt, otthon, munkahely).
import { FlexWidget, SvgWidget, TextWidget } from 'react-native-android-widget';
import { clockText, iconSvg, progress, widgetState, widgetUrl, WIDGET_THEME, type WidgetAction, type WidgetData, type WidgetTheme } from '../widgetModel';

type Hex = `#${string}`;
const h = (c: string) => c as Hex;
const link = (a: WidgetAction) => ({ clickAction: 'OPEN_URI', clickActionData: { uri: widgetUrl(a) } });

function Button({ th, text, icon, action, primary, flex = 1 }: { th: WidgetTheme; text: string; icon: Parameters<typeof iconSvg>[0]; action: WidgetAction; primary?: boolean; flex?: number }) {
  const fg = primary ? th.onBtn : th.onBtn2;
  return (
    <FlexWidget
      {...link(action)}
      accessibilityLabel={text}
      style={{ flex, height: 44, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', flexGap: 6, borderRadius: 22, backgroundColor: h(primary ? th.btn : th.btn2) }}
    >
      <SvgWidget svg={iconSvg(icon, fg, 18)} style={{ width: 18, height: 18 }} />
      <TextWidget text={text} style={{ fontSize: 15, fontWeight: '700', color: h(fg) }} />
    </FlexWidget>
  );
}

function ZoneBadge({ d, size = 34 }: { d: WidgetData; size?: number }) {
  const a = d.active!;
  return (
    <FlexWidget style={{ width: size, height: size, borderRadius: 9, backgroundColor: h(a.color), alignItems: 'center', justifyContent: 'center' }}>
      <TextWidget text={a.zone ?? 'P'} style={{ fontSize: size * 0.55, fontWeight: '900', color: '#FFFFFF' }} />
    </FlexWidget>
  );
}

export function ParkingWidget({ d, now, dark, width }: { d: WidgetData; now: number; dark: boolean; width: number }) {
  const th = WIDGET_THEME[dark ? 'dark' : 'light'];
  const L = d.labels;
  const st = widgetState(d, now);
  const compact = width < 220;
  const root = { height: 'match_parent' as const, width: 'match_parent' as const, backgroundColor: h(th.bg), borderRadius: 22, padding: 14 };

  if (st === 'idle')
    return (
      <FlexWidget {...link('open')} accessibilityLabel={`${L.title}: ${L.idle}`} style={{ ...root, flexDirection: 'column', justifyContent: 'space-between' }}>
        <FlexWidget style={{ flexDirection: 'row', alignItems: 'center', flexGap: 8 }}>
          <SvgWidget svg={iconSvg('parking', th.brand, 22)} style={{ width: 22, height: 22 }} />
          <TextWidget text={L.title} style={{ fontSize: 15, fontWeight: '800', color: h(th.brand) }} />
        </FlexWidget>
        <FlexWidget style={{ flexDirection: 'column' }}>
          <TextWidget text={L.idle} style={{ fontSize: 17, fontWeight: '700', color: h(th.text) }} maxLines={2} />
          {!compact && <TextWidget text={L.idleSub} style={{ fontSize: 13, color: h(th.sub) }} />}
        </FlexWidget>
        <Button th={th} text={L.here} icon="pin" action="here" primary />
      </FlexWidget>
    );

  const a = d.active!;
  const statusText = st === 'expired' ? L.expired : st === 'soon' ? L.soon : `${L.expires} ${clockText(a.endsAt, d.lang)}`;
  const statusColor = st === 'expired' ? th.danger : st === 'soon' ? th.warn : th.text;
  const pct = progress(d, now);
  return (
    <FlexWidget {...link('open')} accessibilityLabel={`${L.title}: ${a.zone ? `${a.zone} ${L.zone}, ` : ''}${a.plate}, ${statusText}`} style={{ ...root, flexDirection: 'column', justifyContent: 'space-between' }}>
      <FlexWidget style={{ flexDirection: 'row', alignItems: 'center', flexGap: 10, width: 'match_parent' }}>
        <ZoneBadge d={d} />
        <FlexWidget style={{ flex: 1, flexDirection: 'column' }}>
          <TextWidget text={`${a.zone ? `${a.zone} ${L.zone} · ` : ''}${a.plate}`} style={{ fontSize: 14, fontWeight: '700', color: h(th.text) }} maxLines={1} truncate="END" />
          <TextWidget text={a.place} style={{ fontSize: 12, color: h(th.sub) }} maxLines={1} truncate="END" />
        </FlexWidget>
      </FlexWidget>
      <FlexWidget style={{ flexDirection: 'column', width: 'match_parent' }}>
        {/* Androidon a widget legfeljebb félóránként frissül magától, ezért a lejárat pontos idejét mutatjuk, nem visszaszámlálást */}
        <TextWidget text={statusText} style={{ fontSize: compact ? 22 : 26, fontWeight: '800', color: h(statusColor) }} maxLines={1} />
        <FlexWidget style={{ width: 'match_parent', height: 6, borderRadius: 3, backgroundColor: h(th.track), marginTop: 6, flexDirection: 'row' }}>
          {pct > 0 && <FlexWidget style={{ flex: Math.max(1, Math.round(pct * 100)), height: 6, borderRadius: 3, backgroundColor: h(st === 'active' ? th.brand : statusColor) }} />}
          {pct < 1 && <FlexWidget style={{ flex: Math.max(1, 100 - Math.round(pct * 100)), height: 6 }} />}
        </FlexWidget>
      </FlexWidget>
      {!compact && (
        <FlexWidget style={{ flexDirection: 'row', flexGap: 8, width: 'match_parent' }}>
          {st !== 'expired' && a.canExtend && <Button th={th} text={L.extend} icon="plus" action="extend" primary />}
          <Button th={th} text={L.stop} icon="stop" action="stop" />
        </FlexWidget>
      )}
    </FlexWidget>
  );
}

export function QuickWidget({ d, dark, height = 110 }: { d: WidgetData; dark: boolean; height?: number }) {
  const tall = height >= 100;
  const th = WIDGET_THEME[dark ? 'dark' : 'light'];
  const L = d.labels;
  const tile = (action: WidgetAction, icon: Parameters<typeof iconSvg>[0], label: string, sub: string | null, primary?: boolean) => (
    <FlexWidget
      {...link(action)}
      accessibilityLabel={sub ? `${label}: ${sub}` : label}
      style={{ flex: 1, height: 'match_parent', borderRadius: 16, backgroundColor: h(primary ? th.btn : th.btn2), flexDirection: 'column', alignItems: 'center', justifyContent: 'center', flexGap: 4, padding: 6 }}
    >
      <SvgWidget svg={iconSvg(icon, primary ? th.onBtn : th.onBtn2, 26)} style={{ width: 26, height: 26 }} />
      <TextWidget text={label} style={{ fontSize: 13, fontWeight: '700', color: h(primary ? th.onBtn : th.onBtn2) }} maxLines={1} />
      {tall && <TextWidget text={sub ?? ''} style={{ fontSize: 11, color: h(primary ? th.onBtn : th.sub) }} maxLines={1} truncate="END" />}
    </FlexWidget>
  );
  return (
    <FlexWidget accessibilityLabel={L.quickTitle} style={{ height: 'match_parent', width: 'match_parent', backgroundColor: h(th.bg), borderRadius: 22, padding: 8, flexDirection: 'row', flexGap: 8 }}>
      {tile('here', 'pin', L.here, null, true)}
      {tile('home', 'home', L.home, d.home ?? L.notSet)}
      {tile('work', 'work', L.work, d.work ?? L.notSet)}
    </FlexWidget>
  );
}

export const ANDROID_WIDGETS = { parking: 'ParkolasWidget', quick: 'GyorsWidget' } as const;

/** A widget neve és mérete alapján a megfelelő világos + sötét változat */
export function renderAndroidWidget(name: string, d: WidgetData, width: number, height = 110) {
  const now = Date.now();
  if (name === ANDROID_WIDGETS.quick) return { light: <QuickWidget d={d} dark={false} height={height} />, dark: <QuickWidget d={d} dark height={height} /> };
  return { light: <ParkingWidget d={d} now={now} dark={false} width={width} />, dark: <ParkingWidget d={d} now={now} dark width={width} /> };
}
