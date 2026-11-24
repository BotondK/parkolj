// „Hibás zóna vagy ár?” jelzés: összecsukva egy link, kinyitva hibatípus, megjegyzés és küldés.
import { useState } from 'react';
import { Pressable, Text, TextInput, View } from 'react-native';
import type { Strings } from '../i18n';
import { C, Chip, PrimaryButton, styles } from './ui';

type Kind = 'wrongzone' | 'wrongprice' | 'notpaid' | 'other';

export default function ReportForm({ t, onSend }: { t: Strings; onSend: (kind: Kind, note: string) => Promise<'sent' | 'queued' | 'invalid'> }) {
  const [open, setOpen] = useState(false);
  const [kind, setKind] = useState<Kind>('wrongzone');
  const [note, setNote] = useState('');
  const [done, setDone] = useState<string | null>(null);
  if (done) return <Text style={{ color: C.good, fontWeight: '600', marginTop: 10 }} accessibilityRole="alert">{done}</Text>;
  if (!open)
    return (
      <Pressable onPress={() => setOpen(true)} hitSlop={8} style={{ marginTop: 10, alignSelf: 'flex-start' }} role="button">
        <Text style={{ color: C.brand, fontWeight: '700', fontSize: 13 }}>{t.reportOpen} ›</Text>
      </Pressable>
    );
  return (
    <View testID="report-form" style={[styles.card, { marginTop: 10, gap: 8 }]}>
      <Text style={{ color: C.text, fontWeight: '700' }}>{t.reportOpen}</Text>
      <View style={styles.chipRow}>
        {(Object.keys(t.reportKinds) as Kind[]).map((k) => (
          <Chip key={k} text={t.reportKinds[k]} active={kind === k} onPress={() => setKind(k)} />
        ))}
      </View>
      <TextInput
        value={note}
        onChangeText={setNote}
        maxLength={300}
        multiline
        placeholder={t.reportNote}
        accessibilityLabel={t.reportNote}
        placeholderTextColor={C.sub}
        style={{ minHeight: 60, textAlignVertical: 'top', borderWidth: 1, borderColor: C.line, borderRadius: 10, padding: 10, color: C.text, backgroundColor: C.card, fontSize: 15 }}
      />
      <Text style={{ color: C.sub, fontSize: 12 }}>{t.reportPrivacy}</Text>
      <PrimaryButton
        text={t.reportSend}
        onPress={async () => {
          const r = await onSend(kind, note);
          setDone(r === 'queued' ? t.reportQueued : t.reportThanks);
        }}
      />
    </View>
  );
}
