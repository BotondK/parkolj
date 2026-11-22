import { Pressable, Text, View } from 'react-native';
import { C, PrimaryButton, styles } from '../components/ui';
import type { Lang, Strings } from '../i18n';

export default function Onboarding({
  t,
  lang,
  setLang,
  onDone,
}: {
  t: Strings;
  lang: Lang;
  setLang: (l: Lang) => void;
  onDone: () => void;
}) {
  return (
    <View style={{ flex: 1, backgroundColor: C.bg, padding: 24, justifyContent: 'center' }}>
      <View style={{ maxWidth: 440, width: '100%', alignSelf: 'center' }}>
        <View style={[styles.logo, { width: 56, height: 56, borderRadius: 16 }]}>
          <Text style={{ color: '#fff', fontWeight: '800', fontSize: 28 }}>P</Text>
        </View>
        <Text style={[styles.h1, { fontSize: 30, marginTop: 18 }]}>{t.obTitle}</Text>
        <Text style={[styles.sub, { fontSize: 16 }]}>{t.tagline}</Text>

        <View style={{ flexDirection: 'row', gap: 10, marginTop: 22 }}>
          {(
            [
              ['hu', 'Magyar'],
              ['en', 'English'],
              ['de', 'Deutsch'],
            ] as [Lang, string][]
          ).map(([l, label]) => (
            <Pressable
              key={l}
              onPress={() => setLang(l)}
              style={[styles.secondary, lang === l && { backgroundColor: C.text, borderColor: C.text }]}
            >
              <Text style={[styles.secondaryText, { color: lang === l ? C.onBrand : C.text }]}>{label}</Text>
            </Pressable>
          ))}
        </View>

        <View style={{ gap: 14, marginTop: 26 }}>
          {t.obPoints.map((p, i) => (
            <View key={i} style={{ flexDirection: 'row', gap: 12, alignItems: 'flex-start' }}>
              <View style={[styles.badge, { width: 28, height: 28, borderRadius: 99, backgroundColor: C.brandSoft }]}>
                <Text style={{ color: C.brand, fontWeight: '800' }}>{i + 1}</Text>
              </View>
              <Text style={{ flex: 1, color: C.text, fontSize: 15, lineHeight: 22 }}>{p}</Text>
            </View>
          ))}
        </View>

        <PrimaryButton text={t.obStart} onPress={onDone} />
      </View>
    </View>
  );
}
