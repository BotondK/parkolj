import { useState } from 'react';
import { Platform, Pressable, Text, TextInput, View } from 'react-native';
import { Icon } from '../components/icons';
import { EmptyState, Field, ListRow, PageHeader, PillButton, Section, Segmented, ToggleRow, titleColor } from '../components/kit';
import { C, Chip, isDark, PrimaryButton, styles } from '../components/ui';
import { LOCALE, type Lang, type Strings } from '../i18n';
import type { AccStrings } from '../i18nAccount';
import { BIOMETRIC_AVAILABLE } from '../logic/biometric';
import { formatClock, formatFt } from '../logic/pricing';
import {
  cardBrand,
  expValid,
  luhnValid,
  taxNumberValid,
  type Account,
  type AppNote,
  type BillingProfile,
  type PaymentCard,
  type Settings,
  PLUS_MONTHLY_FT,
} from '../types';
import PrivacyScreen from './PrivacyScreen';
import HelpScreen from './HelpScreen';
import WidgetsScreen from './WidgetsScreen';
import type { WidgetAction, WidgetData } from '../widgets/widgetModel';
import { PlusBadge, PlusPage } from './PlusScreens';

export type MenuPage = 'home' | 'account' | 'notes' | 'settings' | 'payment' | 'cards' | 'profiles' | 'coupon' | 'info' | 'feedback' | 'plus' | 'privacy' | 'widgets' | 'about';

export type MenuProps = {
  /** A felhasználó kerülete (GPS alapján), a lakossági engedély linkjéhez */
  district?: string | null;
  t: Strings;
  a: AccStrings;
  lang: Lang;
  setLang: (l: Lang) => void;
  page: MenuPage;
  setPage: (p: MenuPage) => void;
  account: Account;
  setAccount: (a: Account) => void;
  notes: AppNote[];
  setNotes: (n: AppNote[]) => void;
  settings: Settings;
  patchSettings: (p: Partial<Settings>) => void;
  cards: PaymentCard[];
  setCards: (c: PaymentCard[]) => void;
  profiles: BillingProfile[];
  setProfiles: (p: BillingProfile[]) => void;
  credit: number;
  redeemCoupon: (code: string) => number | null;
  demoSpeed: boolean;
  setDemoSpeed: (b: boolean) => void;
  onWipe: () => void;
  /** Visszajelzés küldése; true = elküldve, false = sorba téve (később megy el) */
  onFeedback: (rating: number | null, message: string) => Promise<boolean>;
  /** Kezdőképernyő-widgetek előnézete: az aktuális pillanatkép és a gombok művelete */
  widget: { data: WidgetData; onAction: (a: WidgetAction) => void };
  /** Felhős fiók (Supabase), ha be van állítva */
  auth: {
    cloud: boolean;
    sync: 'off' | 'saving' | 'saved' | 'error';
    /** null = elküldve, különben a hibaüzenet */
    sendCode: (email: string, name: string) => Promise<string | null>;
    verify: (email: string, code: string, name: string) => Promise<boolean>;
    /** E-mail + jelszó: 'in' = belépve, 'confirm' = megerősítő levél, különben hibaüzenet */
    signUp: (email: string, password: string, name: string) => Promise<'in' | 'confirm' | string>;
    signIn: (email: string, password: string) => Promise<string | null>;
    recover: (email: string) => Promise<string | null>;
    setPassword: (password: string) => Promise<string | null>;
    /** Jelszó-visszaállító linkről érkezett: új jelszót kell megadni */
    needNewPassword: boolean;
    logout: () => void;
  };
};

export const walletLabel = (a: AccStrings) => (Platform.OS === 'ios' ? a.walletIos : Platform.OS === 'android' ? a.walletAndroid : a.walletWeb);
export const cardLabel = (c: PaymentCard) => `${c.brand} •••• ${c.last4}`;
export const profileLabel = (p: BillingProfile, a: AccStrings) => `${p.kind === 'company' ? a.companyKind : a.privateKind} · ${p.name}`;

export default function MenuScreens(p: MenuProps) {
  const { a, page, setPage } = p;
  const back = (to: MenuPage = 'home') => () => setPage(to);
  switch (page) {
    case 'account':
      return <AccountPage {...p} onBack={back()} />;
    case 'notes':
      return <NotesPage {...p} onBack={back()} />;
    case 'settings':
      return <SettingsPage {...p} onBack={back()} />;
    case 'payment':
      return <PaymentPage {...p} onBack={back()} />;
    case 'cards':
      return <CardsPage {...p} onBack={back('payment')} />;
    case 'profiles':
      return <ProfilesPage {...p} onBack={back('payment')} />;
    case 'coupon':
      return <CouponPage {...p} onBack={back('payment')} />;
    case 'plus': {
      const card = p.cards.find((c) => c.id === p.settings.defaultPay);
      return <PlusPage a={a} lang={p.lang} settings={p.settings} patchSettings={p.patchSettings} payLabel={card ? cardLabel(card) : walletLabel(a)} onBack={back()} />;
    }
    case 'feedback':
      return <FeedbackPage {...p} onBack={back()} />;
    case 'privacy':
      return <PrivacyScreen lang={p.lang} onBack={back()} />;
    case 'widgets':
      return <WidgetsScreen lang={p.lang} data={p.widget.data} onAction={p.widget.onAction} onBack={back()} />;
    case 'about':
      return <HelpScreen t={p.t} lang={p.lang} district={p.district} initial="about" onBack={back()} openFeedback={() => setPage('feedback')} openPrivacy={() => setPage('privacy')} />;
    case 'info':
      return <HelpScreen t={p.t} lang={p.lang} district={p.district} onBack={back()} openFeedback={() => setPage('feedback')} openPrivacy={() => setPage('privacy')} />;
    default:
      return <MenuHome {...p} />;
  }
}

function MenuHome({ a, account, setPage, notes, settings }: MenuProps) {
  return (
    <View>
      <PageHeader title={a.tabMenu} />
      {/* Profilkártya */}
      <Pressable
        onPress={() => setPage('account')}
        style={{ backgroundColor: C.card, borderRadius: 18, borderWidth: isDark ? 0 : 1, borderColor: C.line, padding: 16, flexDirection: 'row', alignItems: 'center', gap: 14, marginBottom: 18 }}
      >
        <View style={{ width: 52, height: 52, borderRadius: 26, backgroundColor: C.brandSoft, alignItems: 'center', justifyContent: 'center' }}>
          {account ? (
            <Text style={{ fontSize: 20, fontWeight: '800', color: titleColor() }}>{account.name.slice(0, 1).toUpperCase()}</Text>
          ) : (
            <Icon name="user" size={28} color={titleColor()} />
          )}
        </View>
        <View style={{ flex: 1 }}>
          <Text style={{ fontSize: 19, fontWeight: '800', color: C.text }}>{account ? account.name : a.guest}</Text>
          <Text style={{ color: C.sub, fontSize: 13, marginTop: 2 }} numberOfLines={2}>
            {account ? account.email : a.guestSub}
          </Text>
        </View>
        <Icon name="chevron" size={20} color={C.sub} />
      </Pressable>
      <Section>
        <ListRow
          icon="starFill"
          label={a.plusName}
          sub={settings.plus === 'monthly' ? `✓ ${a.plusMonthlyPrice(formatFt(PLUS_MONTHLY_FT))}` : a.plusTag}
          onPress={() => setPage('plus')}
          right={
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <PlusBadge small />
              <Icon name="chevron" size={20} color={C.sub} />
            </View>
          }
          last
        />
      </Section>
      <Section>
        <ListRow icon="bell" label={a.notifications} onPress={() => setPage('notes')} right={notes.length ? <Badge n={notes.length} /> : undefined} />
        <ListRow icon="gear" label={a.settings} onPress={() => setPage('settings')} />
        <ListRow icon="map" label={a.widgets} onPress={() => setPage('widgets')} />
        <ListRow icon="card" label={a.purchase} onPress={() => setPage('payment')} />
        <ListRow icon="help" label={a.infoHelp} onPress={() => setPage('info')} />
        <ListRow icon="chat" label={a.feedback} onPress={() => setPage('feedback')} />
        <ListRow icon="info" label={a.privacy} onPress={() => setPage('privacy')} />
        <ListRow icon="info" label={a.about} onPress={() => setPage('about')} last />
      </Section>
      <Text style={{ color: C.sub, fontSize: 12, textAlign: 'center' }}>{a.appVersion}</Text>
    </View>
  );
}

function FeedbackPage({ a, onFeedback, onBack }: MenuProps & { onBack: () => void }) {
  const [rating, setRating] = useState<number | null>(null);
  const [msg, setMsg] = useState('');
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState<string | null>(null);
  return (
    <View>
      <PageHeader title={a.feedback} onBack={onBack} />
      {done ? (
        <EmptyState icon="check" text={done} />
      ) : (
        <View style={styles.card}>
          <Text style={{ color: C.text, fontSize: 15, lineHeight: 21 }}>{a.feedbackIntro}</Text>
          <Text style={styles.label}>{a.feedbackRate}</Text>
          <View style={{ flexDirection: 'row', gap: 6 }}>
            {[1, 2, 3, 4, 5].map((n) => (
              <Pressable key={n} onPress={() => setRating(n)} hitSlop={4} role="button" accessibilityLabel={`${n}/5`}>
                <Icon name={rating && n <= rating ? 'starFill' : 'star'} size={36} color={rating && n <= rating ? '#F5B301' : C.sub} />
              </Pressable>
            ))}
          </View>
          <TextInput
            accessibilityLabel={a.feedback}
            value={msg}
            onChangeText={setMsg}
            placeholder={a.feedbackPlaceholder}
            placeholderTextColor={C.sub}
            multiline
            maxLength={4000}
            style={{ marginTop: 16, minHeight: 130, borderWidth: 1, borderColor: C.line, borderRadius: 12, padding: 12, fontSize: 16, color: C.text, backgroundColor: C.card, textAlignVertical: 'top' }}
          />
          <Text style={{ color: C.sub, fontSize: 12, marginTop: 8 }}>{a.feedbackMeta}</Text>
          <PrimaryButton
            text={a.feedbackSend}
            disabled={!msg.trim() || busy}
            onPress={async () => {
              setBusy(true);
              const sent = await onFeedback(rating, msg.trim());
              setBusy(false);
              setDone(sent ? a.feedbackThanks : a.feedbackQueued);
            }}
          />
        </View>
      )}
    </View>
  );
}

function Badge({ n }: { n: number }) {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
      <View style={{ minWidth: 24, height: 24, borderRadius: 12, paddingHorizontal: 7, backgroundColor: C.primary, alignItems: 'center', justifyContent: 'center' }}>
        <Text style={{ color: C.onPrimary, fontWeight: '800', fontSize: 12 }}>{n > 99 ? '99+' : n}</Text>
      </View>
      <Icon name="chevron" size={20} color={C.sub} />
    </View>
  );
}

function AccountPage({ a, account, setAccount, onWipe, onBack, auth, setPage }: MenuProps & { onBack: () => void }) {
  const [name, setName] = useState(account?.name ?? '');
  const [email, setEmail] = useState(account?.email ?? '');
  const [confirm, setConfirm] = useState(false);
  const [password, setPassword] = useState('');
  const [newPw, setNewPw] = useState('');
  const [mode, setMode] = useState<'login' | 'register' | 'forgot'>('login');
  const [info, setInfo] = useState<string | null>(null);
  const [pwOpen, setPwOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const syncText = auth.sync === 'saving' ? a.syncSaving : auth.sync === 'saved' ? a.syncSaved : auth.sync === 'error' ? a.syncError : null;
  const emailOk = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());
  return (
    <View>
      <PageHeader title={a.myAccount} onBack={onBack} />
      {account ? (
        <Section>
          <ListRow icon="user" label={account.name} sub={account.email} />
          {syncText && <ListRow icon={auth.sync === 'error' ? 'info' : 'check'} label={syncText} />}
          <ListRow icon="logout" label={a.logout} onPress={() => (auth.cloud ? auth.logout() : setAccount(null))} last />
        </Section>
      ) : null}
      {account && auth.cloud && (auth.needNewPassword || pwOpen) && (
        <View style={[styles.card, { marginBottom: 18 }]}>
          <Text style={{ color: C.text, fontWeight: '700', marginBottom: 10 }}>{a.newPassword}</Text>
          <Field label={a.password} value={newPw} onChange={setNewPw} secure autoComplete="new-password" error={newPw && newPw.length < 8 ? a.passwordMin : null} />
          <PrimaryButton
            text={a.savePassword}
            disabled={newPw.length < 8 || busy}
            onPress={async () => {
              setBusy(true);
              const r = await auth.setPassword(newPw);
              setBusy(false);
              if (r) setErr(r);
              else {
                setNewPw('');
                setPwOpen(false);
                setInfo(a.passwordSaved);
              }
            }}
          />
          {err && <Text style={{ color: C.danger, marginTop: 10 }}>{err}</Text>}
        </View>
      )}
      {account && auth.cloud && !auth.needNewPassword && !pwOpen && (
        <Section>
          <ListRow icon="finger" label={info ?? a.changePassword} onPress={() => { setInfo(null); setErr(null); setPwOpen(true); }} last />
        </Section>
      )}
      {account ? null : auth.cloud ? (
        <View style={[styles.card, { marginBottom: 18 }]}>
          {info ? (
            <>
              <Text style={{ color: C.text }}>{info}</Text>
              <Pressable onPress={() => { setInfo(null); setMode('login'); }} style={{ alignSelf: 'center', marginTop: 14 }}>
                <Text style={{ color: titleColor(), fontWeight: '700' }}>{a.backToLogin}</Text>
              </Pressable>
            </>
          ) : (
            <>
              <View style={[styles.chipRow, { marginBottom: 14 }]} role="tablist">
                <Chip text={a.login} active={mode === 'login'} onPress={() => { setMode('login'); setErr(null); }} />
                <Chip text={a.register} active={mode === 'register'} onPress={() => { setMode('register'); setErr(null); }} />
              </View>
              {mode === 'register' && <Field label={a.name} value={name} onChange={setName} autoCap="words" autoComplete="name" />}
              <Field label={a.emailAsUser} value={email} onChange={setEmail} keyboard="email-address" autoComplete="email" />
              {mode !== 'forgot' && (
                <Field
                  label={a.password}
                  value={password}
                  onChange={setPassword}
                  secure
                  autoComplete={mode === 'register' ? 'new-password' : 'password'}
                  error={mode === 'register' && password && password.length < 8 ? a.passwordMin : null}
                />
              )}
              {mode === 'register' && (
                <>
                  <Text style={{ color: C.sub, fontSize: 12 }}>{a.cloudNote}</Text>
                  <Text style={{ color: C.sub, fontSize: 12, marginTop: 4 }} onPress={() => setPage('privacy')}>
                    {a.privacyAgree} <Text style={{ color: titleColor(), fontWeight: '700', textDecorationLine: 'underline' }}>{a.privacy}</Text>
                  </Text>
                </>
              )}
              {mode === 'forgot' && <Text style={{ color: C.sub, fontSize: 12 }}>{a.forgotNote}</Text>}
              <PrimaryButton
                text={mode === 'login' ? a.login : mode === 'register' ? a.register : a.sendReset}
                disabled={!emailOk || busy || (mode === 'login' && !password) || (mode === 'register' && password.length < 8)}
                onPress={async () => {
                  setBusy(true);
                  setErr(null);
                  const e = email.trim().toLowerCase();
                  if (mode === 'login') {
                    const r = await auth.signIn(e, password);
                    if (r) setErr(r);
                  } else if (mode === 'register') {
                    const r = await auth.signUp(e, password, name.trim());
                    if (r === 'confirm') setInfo(a.confirmSent(e));
                    else if (r !== 'in') setErr(r);
                  } else {
                    const r = await auth.recover(e);
                    if (r) setErr(r);
                    else setInfo(a.resetSent(e));
                  }
                  setBusy(false);
                }}
              />
              {mode === 'login' && (
                <Pressable onPress={() => { setMode('forgot'); setErr(null); }} style={{ alignSelf: 'center', marginTop: 14 }} role="button">
                  <Text style={{ color: titleColor(), fontWeight: '700' }}>{a.forgot}</Text>
                </Pressable>
              )}
              {mode === 'forgot' && (
                <Pressable onPress={() => setMode('login')} style={{ alignSelf: 'center', marginTop: 14 }} role="button">
                  <Text style={{ color: titleColor(), fontWeight: '700' }}>{a.backToLogin}</Text>
                </Pressable>
              )}
            </>
          )}
          {err && <Text style={{ color: C.danger, marginTop: 10 }}>{err}</Text>}
        </View>
      ) : (
        <View style={[styles.card, { marginBottom: 18 }]}>
          <Field label={a.name} value={name} onChange={setName} autoCap="words" />
          <Field label={a.email} value={email} onChange={setEmail} keyboard="email-address" error={email && !emailOk ? '—' : null} />
          <Text style={{ color: C.sub, fontSize: 12 }}>{a.loginDemoNote}</Text>
          <PrimaryButton text={a.login} disabled={!name.trim() || !emailOk} onPress={() => setAccount({ name: name.trim(), email: email.trim() })} />
        </View>
      )}
      {!confirm ? (
        <Section>
          <ListRow icon="trash" label={a.deleteAccount} onPress={() => setConfirm(true)} danger last />
        </Section>
      ) : (
        <View style={[styles.card, { gap: 10 }]}>
          <Text style={{ color: C.text }}>{a.deleteConfirm}</Text>
          <View style={{ flexDirection: 'row', gap: 10 }}>
            <Pressable style={styles.secondary} onPress={() => setConfirm(false)}>
              <Text style={styles.secondaryText}>{a.cancel}</Text>
            </Pressable>
            <Pressable style={[styles.secondary, { backgroundColor: C.danger, borderColor: C.danger }]} onPress={onWipe}>
              <Text style={[styles.secondaryText, { color: '#fff' }]}>{a.deleteYes}</Text>
            </Pressable>
          </View>
        </View>
      )}
    </View>
  );
}

function NotesPage({ a, lang, notes, setNotes, onBack }: MenuProps & { onBack: () => void }) {
  const [tip, setTip] = useState(true);
  const fmt = (ms: number) => `${new Date(ms).toLocaleDateString(LOCALE[lang], { month: 'short', day: 'numeric' })} ${formatClock(new Date(ms))}`;
  return (
    <View>
      <PageHeader title={a.notifications} onBack={onBack} />
      {tip && (
        <View style={{ flexDirection: 'row', gap: 10, backgroundColor: C.brandSoft, borderRadius: 14, padding: 12, marginBottom: 14 }}>
          <Icon name="info" size={22} color={titleColor()} />
          <Text style={{ flex: 1, color: C.text, fontSize: 14, lineHeight: 20 }}>{a.notesTip}</Text>
          <Pressable onPress={() => setTip(false)} hitSlop={10}>
            <Icon name="close" size={18} color={C.sub} />
          </Pressable>
        </View>
      )}
      {notes.length === 0 ? (
        <EmptyState icon="bell" text={a.notesEmpty} />
      ) : (
        <>
          <Section>
            {notes.map((n, i) => (
              <ListRow key={n.id} icon="bell" label={n.title} sub={`${n.body}\n${fmt(n.at)}`} last={i === notes.length - 1} />
            ))}
          </Section>
          <PillButton text={a.clearNotes} icon="trash" onPress={() => setNotes([])} />
        </>
      )}
    </View>
  );
}

function SettingsPage({ t, a, lang, setLang, settings, patchSettings, demoSpeed, setDemoSpeed, onBack }: MenuProps & { onBack: () => void }) {
  return (
    <View>
      <PageHeader title={a.settings} onBack={onBack} />
      <Text style={styles.label}>{a.appearance}</Text>
      <Segmented
        options={[
          ['system', a.themeSystem],
          ['light', a.themeLight],
          ['dark', a.themeDark],
        ]}
        value={settings.theme}
        onChange={(theme) => patchSettings({ theme })}
      />
      <Text style={styles.label}>{a.language}</Text>
      <Segmented
        options={[
          ['hu', 'Magyar'],
          ['en', 'English'],
          ['de', 'Deutsch'],
        ]}
        value={lang}
        onChange={setLang}
      />
      <View style={{ height: 20 }} />
      <Section>
        <ToggleRow icon="bell" label={a.remind} value={settings.remind} onChange={(remind) => patchSettings({ remind })} />
        {settings.remind && (
          <View style={{ paddingHorizontal: 16, paddingTop: 4, paddingBottom: 16, borderBottomWidth: 1, borderColor: C.line, gap: 10 }}>
            <Text style={{ color: C.sub, fontSize: 13, marginLeft: 38 }}>{a.remindWhen}</Text>
            <Segmented
              options={([5, 10, 15] as const).map((m) => [m, a.remindMin(m)] as [5 | 10 | 15, string])}
              value={settings.remindMin}
              onChange={(remindMin) => patchSettings({ remindMin })}
            />
          </View>
        )}
        <ToggleRow icon="info" label={a.helpBar} value={settings.helpBar} onChange={(helpBar) => patchSettings({ helpBar })} />
        <ToggleRow icon="chat" label={a.stats} sub={a.statsSub} value={settings.stats !== false} onChange={(stats) => patchSettings({ stats })} />
        <ToggleRow icon="clock" label={a.demoClock} sub={t.demoSpeed.replace(/^Dem[oó]: [^(]*/, '')} value={demoSpeed} onChange={setDemoSpeed} last />
      </Section>
    </View>
  );
}

function PaymentPage({ a, cards, profiles, credit, settings, patchSettings, setPage, onBack }: MenuProps & { onBack: () => void }) {
  return (
    <View>
      <PageHeader title={a.purchase} onBack={onBack} />
      <Section>
        <ListRow icon="card" label={a.cardsTitle} sub={cards.length ? cards.map(cardLabel).join(', ') : a.cardsEmpty} onPress={() => setPage('cards')} />
        <ListRow icon="users" label={a.profiles} sub={profiles.length ? profiles.map((p) => profileLabel(p, a)).join(', ') : a.billing} onPress={() => setPage('profiles')} />
        <ToggleRow
          icon="finger"
          label={a.biometric}
          sub={BIOMETRIC_AVAILABLE ? a.biometricDesc(formatFt(settings.biometricOver)) : a.biometricWeb}
          value={settings.biometric && BIOMETRIC_AVAILABLE}
          disabled={!BIOMETRIC_AVAILABLE}
          onChange={(biometric) => patchSettings({ biometric })}
        />
        <ListRow icon="coupon" label={a.coupon} sub={credit ? a.creditLeft(formatFt(credit)) : undefined} onPress={() => setPage('coupon')} last />
      </Section>
    </View>
  );
}

function CardsPage({ a, cards, setCards, settings, patchSettings, onBack }: MenuProps & { onBack: () => void }) {
  const [adding, setAdding] = useState(cards.length === 0);
  const [num, setNum] = useState('');
  const [exp, setExp] = useState('');
  const [holder, setHolder] = useState('');
  const digits = num.replace(/\D/g, '');
  const numOk = luhnValid(digits);
  const expOk = expValid(exp);
  const fmtNum = (s: string) => s.replace(/\D/g, '').slice(0, 19).replace(/(\d{4})(?=\d)/g, '$1 ');
  const fmtExp = (s: string) => {
    const d = s.replace(/\D/g, '').slice(0, 4);
    return d.length > 2 ? `${d.slice(0, 2)}/${d.slice(2)}` : d;
  };
  const add = () => {
    // Csak márka + utolsó 4 számjegy + lejárat kerül tárolásra, a teljes szám soha
    const card: PaymentCard = { id: `${Date.now()}`, brand: cardBrand(digits), last4: digits.slice(-4), exp, holder: holder.trim() };
    setCards([...cards, card]);
    patchSettings({ defaultPay: card.id });
    setNum('');
    setExp('');
    setHolder('');
    setAdding(false);
  };
  return (
    <View>
      <PageHeader title={a.cardsTitle} onBack={onBack} />
      <Section>
        <ListRow
          icon="finger"
          label={walletLabel(a)}
          sub={settings.defaultPay === 'wallet' ? a.defaultMark : undefined}
          onPress={() => patchSettings({ defaultPay: 'wallet' })}
          right={settings.defaultPay === 'wallet' ? <Icon name="check" size={20} color={C.good} /> : <View />}
          last={cards.length === 0}
        />
        {cards.map((c, i) => (
          <ListRow
            key={c.id}
            icon="card"
            label={cardLabel(c)}
            sub={`${c.exp}${c.holder ? ` · ${c.holder}` : ''}${settings.defaultPay === c.id ? ` · ${a.defaultMark}` : ''}`}
            onPress={() => patchSettings({ defaultPay: c.id })}
            last={i === cards.length - 1}
            right={
              <View style={{ flexDirection: 'row', gap: 14, alignItems: 'center' }}>
                {settings.defaultPay === c.id && <Icon name="check" size={20} color={C.good} />}
                <Pressable
                  hitSlop={10}
                  onPress={() => {
                    setCards(cards.filter((x) => x.id !== c.id));
                    if (settings.defaultPay === c.id) patchSettings({ defaultPay: 'wallet' });
                  }}
                >
                  <Icon name="trash" size={20} color={C.sub} />
                </Pressable>
              </View>
            }
          />
        ))}
      </Section>
      {adding ? (
        <View style={styles.card}>
          <Field label={a.cardNumber} value={fmtNum(num)} onChange={setNum} keyboard="number-pad" placeholder="4242 4242 4242 4242" error={digits.length >= 12 && !numOk ? a.cardInvalid : null} />
          <View style={{ flexDirection: 'row', gap: 10 }}>
            <View style={{ flex: 1 }}>
              <Field label={a.cardExp} value={fmtExp(exp)} onChange={(s) => setExp(fmtExp(s))} keyboard="number-pad" placeholder="12/29" error={exp.length === 5 && !expOk ? a.expInvalid : null} />
            </View>
          </View>
          <Field label={a.cardHolder} value={holder} onChange={setHolder} autoCap="characters" />
          <View style={{ flexDirection: 'row', gap: 8, alignItems: 'flex-start' }}>
            <Icon name="info" size={18} color={C.sub} />
            <Text style={{ color: C.sub, fontSize: 12, flex: 1 }}>{a.cardSecurity}</Text>
          </View>
          <View style={{ flexDirection: 'row', gap: 10, marginTop: 14 }}>
            <Pressable style={styles.secondary} onPress={() => setAdding(false)}>
              <Text style={styles.secondaryText}>{a.cancel}</Text>
            </Pressable>
            <Pressable role="button" aria-disabled={!(numOk && expOk)} style={[styles.secondary, { backgroundColor: C.primary, borderColor: C.primary }, !(numOk && expOk) && { opacity: 0.4 }]} onPress={numOk && expOk ? add : undefined}>
              <Text style={[styles.secondaryText, { color: C.onPrimary }]}>{a.save}</Text>
            </Pressable>
          </View>
        </View>
      ) : (
        <PillButton text={a.addCard} icon="plus" onPress={() => setAdding(true)} />
      )}
    </View>
  );
}

function ProfilesPage({ a, profiles, setProfiles, settings, patchSettings, onBack }: MenuProps & { onBack: () => void }) {
  const [kind, setKind] = useState<BillingProfile['kind'] | null>(null);
  const [f, setF] = useState({ name: '', taxNumber: '', zip: '', city: 'Budapest', address: '', email: '' });
  const set = (k: keyof typeof f) => (v: string) => setF({ ...f, [k]: v });
  const taxOk = kind !== 'company' || taxNumberValid(f.taxNumber);
  const ok = f.name.trim() && /^\d{4}$/.test(f.zip) && f.city.trim() && f.address.trim() && /@/.test(f.email) && taxOk;
  const save = () => {
    if (!kind || !ok) return;
    const p: BillingProfile = { id: `${Date.now()}`, kind, ...f, taxNumber: kind === 'company' ? f.taxNumber.trim() : undefined };
    setProfiles([...profiles, p]);
    if (settings.defaultProfile === 'none') patchSettings({ defaultProfile: p.id });
    setKind(null);
    setF({ name: '', taxNumber: '', zip: '', city: 'Budapest', address: '', email: '' });
  };
  return (
    <View>
      <PageHeader title={a.profiles} onBack={onBack} />
      {profiles.length === 0 && !kind && <EmptyState icon="receipt" text={a.profilesEmpty} />}
      {profiles.length > 0 && (
        <Section>
          {profiles.map((p, i) => (
            <ListRow
              key={p.id}
              icon={p.kind === 'company' ? 'work' : 'user'}
              label={profileLabel(p, a)}
              sub={`${p.taxNumber ? `${p.taxNumber} · ` : ''}${p.zip} ${p.city}, ${p.address}`}
              onPress={() => patchSettings({ defaultProfile: p.id })}
              last={i === profiles.length - 1}
              right={
                <View style={{ flexDirection: 'row', gap: 14, alignItems: 'center' }}>
                  {settings.defaultProfile === p.id && <Icon name="check" size={20} color={C.good} />}
                  <Pressable
                    hitSlop={10}
                    onPress={() => {
                      setProfiles(profiles.filter((x) => x.id !== p.id));
                      if (settings.defaultProfile === p.id) patchSettings({ defaultProfile: 'none' });
                    }}
                  >
                    <Icon name="trash" size={20} color={C.sub} />
                  </Pressable>
                </View>
              }
            />
          ))}
        </Section>
      )}
      {kind ? (
        <View style={styles.card}>
          <Text style={[styles.label, { marginTop: 0 }]}>{kind === 'company' ? a.addCompany : a.addPrivate}</Text>
          <Field label={kind === 'company' ? a.companyName : a.name} value={f.name} onChange={set('name')} autoCap="words" />
          {kind === 'company' && (
            <Field label={a.taxNumber} value={f.taxNumber} onChange={set('taxNumber')} keyboard="numbers-and-punctuation" placeholder="12345678-1-23" error={f.taxNumber && !taxOk ? a.taxInvalid : null} />
          )}
          <View style={{ flexDirection: 'row', gap: 10 }}>
            <View style={{ width: 110 }}>
              <Field label={a.zip} value={f.zip} onChange={set('zip')} keyboard="number-pad" maxLength={4} />
            </View>
            <View style={{ flex: 1 }}>
              <Field label={a.city} value={f.city} onChange={set('city')} autoCap="words" />
            </View>
          </View>
          <Field label={a.address} value={f.address} onChange={set('address')} autoCap="words" />
          <Field label={a.invoiceEmail} value={f.email} onChange={set('email')} keyboard="email-address" />
          <View style={{ flexDirection: 'row', gap: 10, marginTop: 4 }}>
            <Pressable style={styles.secondary} onPress={() => setKind(null)}>
              <Text style={styles.secondaryText}>{a.cancel}</Text>
            </Pressable>
            <Pressable role="button" aria-disabled={!ok} style={[styles.secondary, { backgroundColor: C.primary, borderColor: C.primary }, !ok && { opacity: 0.4 }]} onPress={save}>
              <Text style={[styles.secondaryText, { color: C.onPrimary }]}>{a.save}</Text>
            </Pressable>
          </View>
        </View>
      ) : (
        <View style={{ flexDirection: 'row', justifyContent: 'center', gap: 10 }}>
          <PillButton text={a.addPrivate} icon="user" onPress={() => setKind('private')} />
          <PillButton text={a.addCompany} icon="work" onPress={() => setKind('company')} />
        </View>
      )}
    </View>
  );
}

function CouponPage({ a, credit, redeemCoupon, onBack }: MenuProps & { onBack: () => void }) {
  const [code, setCode] = useState('');
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  return (
    <View>
      <PageHeader title={a.coupon} onBack={onBack} />
      <View style={styles.card}>
        <Field label={a.couponCode} value={code} onChange={(s) => setCode(s.toUpperCase())} autoCap="characters" placeholder="PARKOLJ500" />
        <Text style={{ color: C.sub, fontSize: 12 }}>{a.couponHint}</Text>
        <PrimaryButton
          text={a.redeem}
          disabled={!code.trim()}
          onPress={() => {
            const v = redeemCoupon(code.trim());
            setMsg(v ? { ok: true, text: a.couponOk(formatFt(v)) } : { ok: false, text: a.couponBad });
            if (v) setCode('');
          }}
        />
        {msg && (
          <View style={[styles.banner, { backgroundColor: msg.ok ? C.goodSoft : C.dangerSoft, marginTop: 14, marginBottom: 0 }]}>
            <Text style={{ color: msg.ok ? C.good : C.danger, fontWeight: '600' }}>{msg.text}</Text>
          </View>
        )}
      </View>
      {credit > 0 && <Text style={[styles.sub, { textAlign: 'center', marginTop: 14 }]}>{a.creditLeft(formatFt(credit))}</Text>}
    </View>
  );
}

