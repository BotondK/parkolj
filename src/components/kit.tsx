import type { ReactNode } from 'react';
import { Pressable, Switch, Text, TextInput, View, type KeyboardTypeOptions } from 'react-native';
import { Icon, type IconName } from './icons';
import { C, isDark } from './ui';

// BudapestGO-szerű építőelemek: listasor ikonnal és nyíllal, fülek aláhúzással, kapcsoló, beviteli mező, oldalfejléc.

export function PageHeader({ title, onBack, right }: { title: string; onBack?: () => void; right?: ReactNode }) {
  return (
    <View style={{ marginBottom: 14 }}>
      {onBack && (
        <Pressable onPress={onBack} hitSlop={12} style={{ alignSelf: 'flex-start', paddingVertical: 4, marginBottom: 6 }} accessibilityLabel="Vissza">
          <Icon name="back" size={26} color={C.text} />
        </Pressable>
      )}
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
        <Text style={{ fontSize: 30, fontWeight: '800', color: titleColor(), letterSpacing: -0.4, flex: 1 }}>{title}</Text>
        {right}
      </View>
    </View>
  );
}

/** Világos módban a címek lilák (mint a BudapestGO-ban), sötétben fehérek */
export const titleColor = () => (isDark ? C.text : C.brand);

export function Section({ title, children }: { title?: string; children: ReactNode }) {
  return (
    <View style={{ marginBottom: 18 }}>
      {title && <Text style={{ fontSize: 15, fontWeight: '700', color: C.sub, marginBottom: 8, marginLeft: 4 }}>{title}</Text>}
      <View style={{ backgroundColor: C.card, borderRadius: 18, borderWidth: isDark ? 0 : 1, borderColor: C.line, overflow: 'hidden' }}>
        {children}
      </View>
    </View>
  );
}

export function ListRow({
  icon,
  label,
  sub,
  onPress,
  right,
  last,
  danger,
}: {
  icon?: IconName;
  label: string;
  sub?: string;
  onPress?: () => void;
  right?: ReactNode;
  last?: boolean;
  danger?: boolean;
}) {
  const color = danger ? C.danger : C.text;
  return (
    <Pressable
      onPress={onPress}
      disabled={!onPress}
      style={({ pressed }) => ({
        flexDirection: 'row',
        alignItems: 'center',
        gap: 14,
        paddingHorizontal: 16,
        paddingVertical: 15,
        borderBottomWidth: last ? 0 : 1,
        borderColor: C.line,
        backgroundColor: pressed ? C.soft : 'transparent',
      })}
    >
      {icon && <Icon name={icon} size={24} color={danger ? C.danger : isDark ? C.text : C.brand} />}
      <View style={{ flex: 1 }}>
        <Text style={{ fontSize: 17, fontWeight: '600', color }}>{label}</Text>
        {!!sub && <Text style={{ fontSize: 13, color: C.sub, marginTop: 2 }}>{sub}</Text>}
      </View>
      {right ?? (onPress ? <Icon name="chevron" size={20} color={C.sub} /> : null)}
    </Pressable>
  );
}

export function ToggleRow({ icon, label, sub, value, onChange, last, disabled }: { icon?: IconName; label: string; sub?: string; value: boolean; onChange: (v: boolean) => void; last?: boolean; disabled?: boolean }) {
  return (
    <ListRow
      icon={icon}
      label={label}
      sub={sub}
      last={last}
      right={
        <Switch
          value={value}
          disabled={disabled}
          onValueChange={onChange}
          trackColor={{ false: C.line, true: C.primary }}
          thumbColor={isDark && value ? C.onPrimary : '#FFFFFF'}
          {...({ activeThumbColor: isDark ? C.onPrimary : '#FFFFFF' } as object)}
        />
      }
    />
  );
}

/** Két-három fül aláhúzással (Helyek / Autók, Aktív / Lezárt) */
export function SegTabs<T extends string>({ tabs, value, onChange }: { tabs: [T, string][]; value: T; onChange: (v: T) => void }) {
  return (
    <View style={{ flexDirection: 'row', borderBottomWidth: 1, borderColor: C.line, marginBottom: 16 }}>
      {tabs.map(([k, label]) => {
        const on = k === value;
        return (
          <Pressable key={k} onPress={() => onChange(k)} style={{ flex: 1, alignItems: 'center', paddingVertical: 12 }}>
            <Text style={{ fontSize: 16, fontWeight: on ? '800' : '600', color: on ? titleColor() : C.sub }}>{label}</Text>
            <View style={{ position: 'absolute', bottom: -1, left: 12, right: 12, height: 3, borderRadius: 2, backgroundColor: on ? titleColor() : 'transparent' }} />
          </Pressable>
        );
      })}
    </View>
  );
}

export function Field({
  label,
  value,
  onChange,
  placeholder,
  keyboard,
  error,
  autoCap,
  maxLength,
}: {
  label: string;
  value: string;
  onChange: (s: string) => void;
  placeholder?: string;
  keyboard?: KeyboardTypeOptions;
  error?: string | null;
  autoCap?: 'none' | 'characters' | 'words';
  maxLength?: number;
}) {
  return (
    <View style={{ marginBottom: 12 }}>
      <Text style={{ fontSize: 13, fontWeight: '700', color: C.sub, marginBottom: 6 }}>{label}</Text>
      <TextInput
        value={value}
        onChangeText={onChange}
        placeholder={placeholder}
        placeholderTextColor={C.sub}
        keyboardType={keyboard}
        autoCapitalize={autoCap ?? 'none'}
        maxLength={maxLength}
        style={{
          height: 52,
          borderRadius: 12,
          borderWidth: 1,
          borderColor: error ? C.danger : C.line,
          backgroundColor: C.card,
          paddingHorizontal: 14,
          fontSize: 17,
          color: C.text,
        }}
      />
      {!!error && <Text style={{ color: C.danger, fontSize: 12, marginTop: 4 }}>{error}</Text>}
    </View>
  );
}

/** Lekerekített, keretes „pill” gomb ikonnal (Új hely hozzáadása, Új parkolás) */
export function PillButton({ text, icon, onPress, filled }: { text: string; icon?: IconName; onPress: () => void; filled?: boolean }) {
  const fg = filled ? C.onPrimary : isDark ? C.text : C.brand;
  return (
    <Pressable
      onPress={onPress}
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 8,
        alignSelf: 'center',
        paddingHorizontal: 22,
        paddingVertical: 13,
        borderRadius: 30,
        borderWidth: filled ? 0 : 1.5,
        borderColor: isDark ? C.line : C.brand,
        backgroundColor: filled ? C.primary : C.card,
        marginTop: 16,
      }}
    >
      {icon && <Icon name={icon} size={20} color={fg} />}
      <Text style={{ color: fg, fontWeight: '700', fontSize: 16 }}>{text}</Text>
    </Pressable>
  );
}

export function EmptyState({ icon, text }: { icon: IconName; text: string }) {
  return (
    <View style={{ alignItems: 'center', paddingVertical: 28, paddingHorizontal: 12, gap: 14 }}>
      <View style={{ width: 72, height: 72, borderRadius: 36, backgroundColor: C.brandSoft, alignItems: 'center', justifyContent: 'center' }}>
        <Icon name={icon} size={34} color={isDark ? C.text : C.brand} />
      </View>
      <Text style={{ color: C.sub, fontSize: 15, lineHeight: 21, textAlign: 'center' }}>{text}</Text>
    </View>
  );
}

/** Kis választó gombsor (Rendszer / Világos / Sötét) */
export function Segmented<T extends string | number>({ options, value, onChange }: { options: [T, string][]; value: T; onChange: (v: T) => void }) {
  return (
    <View style={{ flexDirection: 'row', backgroundColor: C.soft, borderRadius: 14, padding: 4, gap: 6 }}>
      {options.map(([k, label]) => {
        const on = k === value;
        return (
          <Pressable key={String(k)} onPress={() => onChange(k)} style={{ flex: 1, minHeight: 44, paddingVertical: 10, paddingHorizontal: 12, borderRadius: 10, alignItems: 'center', justifyContent: 'center', backgroundColor: on ? C.primary : 'transparent' }}>
            <Text style={{ fontWeight: '700', fontSize: 15, color: on ? C.onPrimary : C.text, textAlign: 'center' }} numberOfLines={1}>
              {label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}
