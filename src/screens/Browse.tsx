import React, { useCallback, useEffect, useRef, useState } from 'react';
import { FlatList, LayoutChangeEvent, ScrollView, Text, View, useWindowDimensions, RefreshControl } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated, { FadeInDown, useAnimatedStyle, useSharedValue, withSpring } from 'react-native-reanimated';
import { Feather } from '@expo/vector-icons';
import type { RootStackParamList } from '../../App';
import { Book, fetchBooks } from '../api';
import { cacheKey, getCache, getKv, listSaved, putCache, setKv } from '../db';
import { colors, LANGS, serif, TOPICS } from '../theme';
import { useOnline } from '../useOnline';
import { Aurora, Banner, Chip, compact, Cover, Press, SkeletonGrid, timeAgo } from '../ui';

type Props = NativeStackScreenProps<RootStackParamList, 'Browse'>;
type Source = 'none' | 'cache' | 'fresh';

const GAP = 14;
const PAD = 16;

export default function BrowseScreen({ navigation }: Props) {
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const cardW = (width - PAD * 2 - GAP) / 2;
  const online = useOnline();
  const onlineRef = useRef(online);
  onlineRef.current = online;

  const [tab, setTab] = useState<'discover' | 'saved'>('discover');
  const [lang, setLang] = useState<string | null>(null);
  const [topic, setTopic] = useState<string | null>(null);
  const [ready, setReady] = useState(false);

  const [books, setBooks] = useState<Book[]>([]);
  const [source, setSource] = useState<Source>('none');
  const [cachedAt, setCachedAt] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(false);
  const [failed, setFailed] = useState(false);
  const [saved, setSaved] = useState<Book[]>([]);

  const page = useRef(1);
  const req = useRef(0);
  const list = useRef<FlatList>(null);

  // Restore last-used filters, then allow loading.
  useEffect(() => {
    (async () => {
      try {
        const f = JSON.parse((await getKv('filters')) ?? '{}');
        setLang(f.lang ?? null);
        setTopic(f.topic ?? null);
      } catch {}
      setReady(true);
    })();
  }, []);

  // Keep the saved shelf current when returning from Details.
  useFocusEffect(useCallback(() => { listSaved().then(setSaved); }, []));

  const load = useCallback(async (pull = false) => {
    const id = ++req.current;
    const key = cacheKey(lang, topic);
    setFailed(false);

    if (!pull) {
      // 1) Show cached data immediately.
      const c = await getCache(key);
      if (id !== req.current) return;
      if (c) {
        setBooks(c.books); setHasMore(c.hasMore); setSource('cache'); setCachedAt(c.fetchedAt); setLoading(false);
      } else {
        setBooks([]); setSource('none'); setLoading(true);
      }
    }
    if (!onlineRef.current) { setLoading(false); return; }

    // 2) Refresh in the background.
    setRefreshing(true);
    try {
      const r = await fetchBooks({ lang, topic, page: 1 });
      if (id !== req.current) return;
      page.current = 1;
      setBooks(r.books); setHasMore(r.hasMore); setSource('fresh'); setCachedAt(Date.now());
      putCache(key, r.books, r.hasMore);
    } catch {
      if (id === req.current) setFailed(true);
    } finally {
      if (id === req.current) { setRefreshing(false); setLoading(false); }
    }
  }, [lang, topic]);

  useEffect(() => { if (ready) load(); }, [ready, load]);

  // Reconnected while looking at cache: refresh automatically.
  useEffect(() => { if (online && ready && source === 'cache') load(true); }, [online]); // eslint-disable-line

  const loadMore = async () => {
    if (!hasMore || loadingMore || source !== 'fresh' || !online || refreshing) return;
    const id = req.current;
    setLoadingMore(true);
    try {
      const r = await fetchBooks({ lang, topic, page: page.current + 1 });
      if (id !== req.current) return;
      page.current += 1;
      setBooks((prev) => {
        const seen = new Set(prev.map((b) => b.id));
        return [...prev, ...r.books.filter((b) => !seen.has(b.id))];
      });
      setHasMore(r.hasMore);
    } catch {} finally { setLoadingMore(false); }
  };

  const pick = (l: string | null, t: string | null) => {
    setLang(l); setTopic(t);
    setKv('filters', JSON.stringify({ lang: l, topic: t }));
    list.current?.scrollToOffset({ offset: 0, animated: false });
  };

  // ---- status banner ----
  let banner: React.ComponentProps<typeof Banner> | null = null;
  if (tab === 'saved') {
    banner = { tone: online ? 'cached' : 'offline', text: online ? 'Stored on this device' : 'Offline · your saved books are available' };
  } else if (!online) {
    banner = { tone: 'offline', text: cachedAt && source === 'cache' ? `Offline · cached ${timeAgo(cachedAt)}` : 'Offline · no cached results for this filter' };
  } else if (failed) {
    banner = { tone: 'error', text: source === 'cache' ? 'Couldn’t refresh · showing cached results' : 'Couldn’t reach Gutenberg · pull to retry' };
  } else if (source === 'cache') {
    banner = { tone: 'cached', text: `Cached ${cachedAt ? timeAgo(cachedAt) : ''}${refreshing ? ' · refreshing…' : ''}` };
  } else if (source === 'fresh') {
    banner = { tone: 'fresh', text: 'Live from Gutenberg · just updated' };
  }

  const data = tab === 'saved' ? saved : books;

  const renderItem = ({ item, index }: { item: Book; index: number }) => {
    const isSaved = saved.some((s) => s.id === item.id);
    return (
      <Animated.View entering={FadeInDown.delay(Math.min(index, 6) * 50).springify().damping(18)} style={{ width: cardW }}>
        <Press onPress={() => navigation.navigate('Details', { id: item.id, title: item.title })}>
          <View>
            <Cover book={item} width={cardW} />
            {isSaved && (
              <View style={{ position: 'absolute', top: 0, right: 10, backgroundColor: colors.verdigris, paddingHorizontal: 6, paddingTop: 4, paddingBottom: 10, borderBottomLeftRadius: 3, borderBottomRightRadius: 3 }}>
                <Feather name="bookmark" size={14} color={colors.ink} />
              </View>
            )}
          </View>
          <Text numberOfLines={2} style={{ color: colors.paper, fontFamily: serif, fontSize: 15, marginTop: 8, lineHeight: 19 }}>{item.title}</Text>
          <Text numberOfLines={1} style={{ color: colors.mist, fontSize: 12, marginTop: 2 }}>{item.authors[0] ?? 'Unknown author'}</Text>
          <Text style={{ color: colors.mist, fontSize: 11, marginTop: 2 }}>{compact(item.downloadCount)} downloads</Text>
        </Press>
      </Animated.View>
    );
  };

  const empty = (() => {
    if (tab === 'saved') return ['Nothing saved yet', 'Open a book and choose “Save for offline”. It will stay here without a connection.'];
    if (!online) return ['No cached books for this filter', 'Reconnect to browse, or open the Saved tab to read what you’ve kept.'];
    if (failed) return ['Couldn’t load books', 'Check your connection and pull down to try again.'];
    return ['No books match', 'Try a different language or topic.'];
  })();

  return (
    <View style={{ flex: 1 }}>
      <Aurora />
      <View style={{ paddingTop: insets.top + 8 }}>
        <Text style={{ color: colors.paper, fontFamily: serif, fontSize: 34, paddingHorizontal: PAD, marginBottom: 12 }}>Library</Text>
        <Segmented value={tab} onChange={setTab} savedCount={saved.length} />
        {tab === 'discover' && (
          <>
            <ChipRow>{LANGS.map((l) => <Chip key={l.label} label={l.label} active={lang === l.code} onPress={() => pick(l.code, topic)} />)}</ChipRow>
            <ChipRow>{TOPICS.map((t) => <Chip key={t.label} label={t.label} active={topic === t.value} onPress={() => pick(lang, t.value)} />)}</ChipRow>
          </>
        )}
        {banner && <Banner {...banner} />}
      </View>

      {tab === 'discover' && loading && data.length === 0 ? (
        <SkeletonGrid cardW={cardW} gap={GAP} pad={PAD} rows={3} />
      ) : (
        <FlatList
          ref={list}
          data={data}
          numColumns={2}
          keyExtractor={(b) => String(b.id)}
          renderItem={renderItem}
          columnWrapperStyle={{ gap: GAP, paddingHorizontal: PAD, marginBottom: 18 }}
          contentContainerStyle={{ paddingBottom: insets.bottom + 24, flexGrow: 1 }}
          onEndReached={tab === 'discover' ? loadMore : undefined}
          onEndReachedThreshold={0.6}
          refreshControl={tab === 'discover' ? <RefreshControl refreshing={false} tintColor={colors.verdigris} onRefresh={() => online && load(true)} /> : undefined}
          ListEmptyComponent={
            <View style={{ padding: 32, alignItems: 'center' }}>
              <Feather name="book-open" size={34} color={colors.mist} />
              <Text style={{ color: colors.paper, fontFamily: serif, fontSize: 18, marginTop: 12 }}>{empty[0]}</Text>
              <Text style={{ color: colors.mist, textAlign: 'center', marginTop: 6, lineHeight: 20 }}>{empty[1]}</Text>
            </View>
          }
          ListFooterComponent={
            tab === 'discover' && data.length > 0 ? (
              loadingMore ? <SkeletonGrid cardW={cardW} gap={GAP} pad={PAD} rows={1} /> :
              source === 'cache' && hasMore && !online ? <Text style={{ color: colors.mist, textAlign: 'center', padding: 16 }}>Reconnect to load more</Text> : null
            ) : null
          }
        />
      )}
    </View>
  );
}

function ChipRow({ children }: { children: React.ReactNode }) {
  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: PAD, paddingBottom: 10 }}>
      {children}
    </ScrollView>
  );
}

function Segmented({ value, onChange, savedCount }: { value: 'discover' | 'saved'; onChange: (v: 'discover' | 'saved') => void; savedCount: number }) {
  const [w, setW] = useState(0);
  const x = useSharedValue(0);
  const seg = w / 2;
  useEffect(() => { x.value = withSpring(value === 'discover' ? 0 : seg, { damping: 18 }); }, [value, seg, x]);
  const pill = useAnimatedStyle(() => ({ transform: [{ translateX: x.value }] }));
  const items = [['discover', 'Popular'], ['saved', `Saved${savedCount ? ` (${savedCount})` : ''}`]] as const;
  return (
    <View
      onLayout={(e: LayoutChangeEvent) => setW(e.nativeEvent.layout.width - 6)}
      style={{ flexDirection: 'row', marginHorizontal: PAD, marginBottom: 12, padding: 3, borderRadius: 12, backgroundColor: colors.shelf, borderWidth: 1, borderColor: colors.line }}>
      <Animated.View style={[{ position: 'absolute', top: 3, left: 3, height: '100%', width: seg, borderRadius: 10, backgroundColor: colors.shelfHi }, pill]} />
      {items.map(([k, label]) => (
        <Text key={k} onPress={() => onChange(k)} style={{ flex: 1, textAlign: 'center', paddingVertical: 9, color: value === k ? colors.paper : colors.mist, fontWeight: '600' }}>
          {label}
        </Text>
      ))}
    </View>
  );
}
