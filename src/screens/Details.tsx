import React, { useCallback, useEffect, useState } from 'react';
import { Linking, ScrollView, Text, View, StyleSheet, useWindowDimensions } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated, { FadeInDown, useAnimatedStyle, useSharedValue, withSequence, withSpring, withTiming } from 'react-native-reanimated';
import { Canvas, Path } from '@shopify/react-native-skia';
import { Feather } from '@expo/vector-icons';
import type { RootStackParamList } from '../../App';
import { Book, fetchBookById } from '../api';
import { getSaved, removeBook, saveBook } from '../db';
import { colors, serif } from '../theme';
import { useOnline } from '../useOnline';
import { Aurora, compact, Cover, Press, SkeletonCard } from '../ui';

type Props = NativeStackScreenProps<RootStackParamList, 'Details'>;
type State = 'loading' | 'ready' | 'offline' | 'error';

const LANG_NAMES: Record<string, string> = { en: 'English', fr: 'French', fi: 'Finnish', de: 'German', es: 'Spanish', it: 'Italian', nl: 'Dutch', pt: 'Portuguese' };

export default function DetailsScreen({ route, navigation }: Props) {
  const { id, title } = route.params;
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const online = useOnline();
  const [book, setBook] = useState<Book | null>(null);
  const [saved, setSaved] = useState(false);
  const [state, setState] = useState<State>('loading');
  const [fromDevice, setFromDevice] = useState(false);

  const load = useCallback(async () => {
    setState('loading');
    // Saved books always open from SQLite, online or not.
    const local = await getSaved(id);
    if (local) { setBook(local); setSaved(true); setFromDevice(true); setState('ready'); return; }
    setSaved(false); setFromDevice(false);
    if (!online) { setState('offline'); return; }
    try {
      const remote = await fetchBookById(id);
      if (!remote) throw new Error('missing');
      setBook(remote); setState('ready');
    } catch { setState('error'); }
  }, [id, online]);

  useEffect(() => { load(); }, [load]);

  const toggle = async () => {
    if (!book) return;
    if (saved) { await removeBook(book.id); setSaved(false); setFromDevice(false); }
    else { await saveBook(book); setSaved(true); setFromDevice(true); }
  };

  const coverW = Math.min(width * 0.56, 240);

  return (
    <View style={{ flex: 1 }}>
      <Aurora />
      {state === 'ready' && book ? (
        <>
          <ScrollView contentContainerStyle={{ paddingTop: insets.top + 56, paddingBottom: insets.bottom + 120, paddingHorizontal: 20 }}>
            <Animated.View entering={FadeInDown.springify().damping(16)} style={{ alignItems: 'center', shadowColor: colors.verdigris, shadowOpacity: 0.35, shadowRadius: 28, shadowOffset: { width: 0, height: 14 } }}>
              <Cover book={book} width={coverW} />
            </Animated.View>

            <Text style={{ color: colors.paper, fontFamily: serif, fontSize: 28, lineHeight: 34, textAlign: 'center', marginTop: 24 }}>{book.title}</Text>
            <Text style={{ color: colors.verdigris, fontSize: 15, textAlign: 'center', marginTop: 8 }}>
              {book.authors.length ? book.authors.join(', ') : 'Unknown author'}
            </Text>
            <Text style={{ color: fromDevice ? colors.verdigris : colors.mist, fontSize: 12, textAlign: 'center', marginTop: 8 }}>
              {fromDevice ? 'Opened from this device' : 'Not saved yet'}
            </Text>

            <View style={{ flexDirection: 'row', marginTop: 22, borderRadius: 14, backgroundColor: colors.shelf, borderWidth: 1, borderColor: colors.line }}>
              <Stat label="Downloads" value={compact(book.downloadCount)} />
              <Stat label={book.languages.length > 1 ? 'Languages' : 'Language'} value={book.languages.map((l) => LANG_NAMES[l] ?? l.toUpperCase()).join(', ') || '—'} bordered />
              <Stat label="Formats" value={String(Object.keys(book.formats).length)} bordered />
            </View>

            {book.bookshelves.length > 0 && <Section title="Bookshelves"><Tags items={book.bookshelves} tint={colors.verdigris} /></Section>}
            {book.subjects.length > 0 && <Section title="Subjects"><Tags items={book.subjects} tint={colors.mist} /></Section>}

            <Section title="Available formats">
              {Object.entries(book.formats).map(([label, url]) => (
                <Press key={label} disabled={!online} onPress={() => Linking.openURL(url)}
                  style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 14, marginBottom: 8, borderRadius: 12, backgroundColor: colors.shelf, borderWidth: 1, borderColor: colors.line, opacity: online ? 1 : 0.5 }}>
                  <Text style={{ color: colors.paper, fontWeight: '600' }}>{label}</Text>
                  <Text style={{ color: colors.mist, fontSize: 12 }}>{online ? 'Open' : 'Needs connection'}</Text>
                </Press>
              ))}
              {Object.keys(book.formats).length === 0 && <Text style={{ color: colors.mist }}>No readable formats listed for this book.</Text>}
            </Section>
          </ScrollView>

          <View style={{ position: 'absolute', left: 20, right: 20, bottom: insets.bottom + 16 }}>
            <SaveButton saved={saved} onPress={toggle} />
          </View>
        </>
      ) : (
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', padding: 32 }}>
          {state === 'loading' ? (
            <>
              <SkeletonCard width={coverW} />
              {title ? <Text numberOfLines={2} style={{ color: colors.mist, fontFamily: serif, marginTop: 6, textAlign: 'center' }}>{title}</Text> : null}
            </>
          ) : (
            <>
              <Feather name={state === 'offline' ? 'wifi-off' : 'alert-circle'} size={36} color={colors.rose} />
              <Text style={{ color: colors.paper, fontFamily: serif, fontSize: 20, marginTop: 14, textAlign: 'center' }}>
                {state === 'offline' ? 'This book isn’t saved on your device' : 'Couldn’t load this book'}
              </Text>
              <Text style={{ color: colors.mist, textAlign: 'center', marginTop: 8, lineHeight: 20 }}>
                {state === 'offline' ? 'You’re offline. Reconnect to view its details, then choose “Save for offline” to keep it.' : 'Gutenberg didn’t respond. Check your connection and try again.'}
              </Text>
              <Press onPress={state === 'offline' ? () => navigation.goBack() : load} style={{ marginTop: 20, paddingHorizontal: 20, paddingVertical: 12, borderRadius: 999, backgroundColor: colors.shelfHi }}>
                <Text style={{ color: colors.paper, fontWeight: '600' }}>{state === 'offline' ? 'Back to library' : 'Try again'}</Text>
              </Press>
            </>
          )}
        </View>
      )}
    </View>
  );
}

const Stat = ({ label, value, bordered }: { label: string; value: string; bordered?: boolean }) => (
  <View style={{ flex: 1, padding: 14, alignItems: 'center', borderLeftWidth: bordered ? 1 : 0, borderLeftColor: colors.line }}>
    <Text numberOfLines={2} style={{ color: colors.paper, fontFamily: serif, fontSize: 17, textAlign: 'center' }}>{value}</Text>
    <Text style={{ color: colors.mist, fontSize: 11, marginTop: 4 }}>{label}</Text>
  </View>
);

const Section = ({ title, children }: { title: string; children: React.ReactNode }) => (
  <View style={{ marginTop: 26 }}>
    <Text style={{ color: colors.paper, fontFamily: serif, fontSize: 18, marginBottom: 10 }}>{title}</Text>
    {children}
  </View>
);

const Tags = ({ items, tint }: { items: string[]; tint: string }) => (
  <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
    {items.map((s) => (
      <View key={s} style={{ paddingHorizontal: 11, paddingVertical: 6, borderRadius: 8, borderWidth: 1, borderColor: tint + '55' }}>
        <Text style={{ color: tint, fontSize: 12 }}>{s}</Text>
      </View>
    ))}
  </View>
);

const RIBBON = 'M3 2 H17 V24 L10 18.5 L3 24 Z';

/** The ribbon is drawn in Skia; its fill and a spring "pop" respond to the save action. */
function SaveButton({ saved, onPress }: { saved: boolean; onPress: () => void }) {
  const fill = useSharedValue(saved ? 1 : 0);
  const pop = useSharedValue(1);
  useEffect(() => {
    fill.value = withTiming(saved ? 1 : 0, { duration: 280 });
    pop.value = withSequence(withSpring(1.12, { damping: 6 }), withSpring(1));
  }, [saved, fill, pop]);
  const popStyle = useAnimatedStyle(() => ({ transform: [{ scale: pop.value }] }));
  return (
    <Press onPress={onPress} style={{
      flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10, paddingVertical: 14, borderRadius: 16,
      backgroundColor: saved ? colors.shelfHi : colors.verdigris, borderWidth: 1, borderColor: saved ? colors.line : colors.verdigris,
    }}>
      <Animated.View style={popStyle}>
        <Canvas style={{ width: 20, height: 26 }}>
          <Path path={RIBBON} style="fill" color={saved ? colors.verdigris : colors.ink} opacity={fill} />
          <Path path={RIBBON} style="stroke" strokeWidth={2} color={saved ? colors.verdigris : colors.ink} />
        </Canvas>
      </Animated.View>
      <Text style={{ color: saved ? colors.paper : colors.ink, fontWeight: '700', fontSize: 16 }}>
        {saved ? 'Remove from offline' : 'Save for offline'}
      </Text>
    </Press>
  );
}
