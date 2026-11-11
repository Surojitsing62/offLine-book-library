import React, { useEffect, useState } from 'react';
import { Image, Pressable, StyleProp, StyleSheet, Text, View, ViewStyle, useWindowDimensions } from 'react-native';
import { Canvas, Circle, LinearGradient, RadialGradient, Rect, RoundedRect, vec } from '@shopify/react-native-skia';
import Animated, {
  Easing, FadeIn, FadeOut, useAnimatedStyle, useDerivedValue, useSharedValue,
  withDelay, withRepeat, withSpring, withTiming,
} from 'react-native-reanimated';
import type { Book } from './api';
import { colors, serif } from './theme';

/** Slow-drifting light behind the whole screen (Skia, runs on the UI thread). */
export function Aurora() {
  const { width: w, height: h } = useWindowDimensions();
  const t = useSharedValue(0);
  useEffect(() => {
    t.value = withRepeat(withTiming(1, { duration: 16000, easing: Easing.inOut(Easing.quad) }), -1, true);
  }, [t]);
  const a = useDerivedValue(() => vec(w * (0.1 + 0.6 * t.value), h * (0.1 + 0.08 * t.value)));
  const b = useDerivedValue(() => vec(w * (0.95 - 0.6 * t.value), h * (0.3 - 0.1 * t.value)));
  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="none">
      <Canvas style={StyleSheet.absoluteFill}>
        <Rect x={0} y={0} width={w} height={h} color={colors.ink} />
        <Rect x={0} y={0} width={w} height={h}>
          <RadialGradient c={a} r={w * 0.9} colors={['#6EE0C436', '#6EE0C400']} />
        </Rect>
        <Rect x={0} y={0} width={w} height={h}>
          <RadialGradient c={b} r={w * 0.8} colors={['#F08BA82E', '#F08BA800']} />
        </Rect>
      </Canvas>
    </View>
  );
}

const PALETTES = [
  ['#2B3A67', '#6EE0C4'], ['#5B2A5E', '#F08BA8'], ['#1F4E5F', '#F2C879'],
  ['#3A2F6B', '#9FB4FF'], ['#16423C', '#B7F0A5'], ['#6B2D3C', '#FFB38A'],
];

/** Offline-safe cover: generated per book id, with the real cover fading in on top when it loads. */
export function Cover({ book, width }: { book: Pick<Book, 'id' | 'title' | 'authors' | 'coverUrl'>; width: number }) {
  const height = Math.round(width * 1.5);
  const [from, accent] = PALETTES[book.id % PALETTES.length];
  const [loaded, setLoaded] = useState(false);
  const [failed, setFailed] = useState(false);
  const op = useSharedValue(0);
  useEffect(() => {
    op.value = withTiming(loaded ? 1 : 0, { duration: 350 });
  }, [loaded, op]);
  const imgStyle = useAnimatedStyle(() => ({ opacity: op.value }));

  return (
    <View style={{ width, height, borderRadius: 10, overflow: 'hidden', backgroundColor: from }}>
      <Canvas style={{ width, height }}>
        <Rect x={0} y={0} width={width} height={height}>
          <LinearGradient start={vec(0, 0)} end={vec(width, height)} colors={[from, colors.ink]} />
        </Rect>
        <Circle cx={width * 0.75} cy={height * 0.28} r={width * 0.46} color={accent + '33'} />
        <Circle cx={width * 0.15} cy={height * 0.88} r={width * 0.3} color={accent + '24'} />
        <Rect x={0} y={0} width={width * 0.06} height={height} color={accent + '99'} />
      </Canvas>
      <View style={{ ...StyleSheet.absoluteFillObject, padding: width * 0.12, paddingLeft: width * 0.16, justifyContent: 'space-between' }}>
        <Text numberOfLines={4} style={{ color: colors.paper, fontFamily: serif, fontSize: width * 0.1, lineHeight: width * 0.125 }}>
          {book.title}
        </Text>
        <Text numberOfLines={2} style={{ color: accent, fontSize: width * 0.065 }}>
          {book.authors[0] ?? ''}
        </Text>
      </View>
      {book.coverUrl && !failed && (
        <Animated.View style={[StyleSheet.absoluteFill, imgStyle]}>
          <Image
            source={{ uri: book.coverUrl }}
            style={StyleSheet.absoluteFill}
            resizeMode="cover"
            onLoad={() => setLoaded(true)}
            onError={() => setFailed(true)}
          />
        </Animated.View>
      )}
    </View>
  );
}

export function Press({ onPress, style, children, disabled }: {
  onPress?: () => void; style?: StyleProp<ViewStyle>; children: React.ReactNode; disabled?: boolean;
}) {
  const s = useSharedValue(1);
  const st = useAnimatedStyle(() => ({ transform: [{ scale: s.value }] }));
  return (
    <Pressable
      disabled={disabled}
      onPress={onPress}
      onPressIn={() => { s.value = withSpring(0.96, { damping: 15 }); }}
      onPressOut={() => { s.value = withSpring(1, { damping: 12 }); }}>
      <Animated.View style={[style, st]}>{children}</Animated.View>
    </Pressable>
  );
}

export function Chip({ label, active, onPress }: { label: string; active: boolean; onPress: () => void }) {
  return (
    <Press
      onPress={onPress}
      style={{
        paddingHorizontal: 14, paddingVertical: 8, borderRadius: 999, marginRight: 8,
        backgroundColor: active ? colors.verdigris : colors.shelf,
        borderWidth: 1, borderColor: active ? colors.verdigris : colors.line,
      }}>
      <Text style={{ color: active ? colors.ink : colors.paper, fontWeight: active ? '700' : '500', fontSize: 13 }}>{label}</Text>
    </Press>
  );
}

const TONES = {
  offline: colors.rose,
  cached: colors.mist,
  fresh: colors.verdigris,
  error: colors.rose,
} as const;

/** Always says which data you are looking at. */
export function Banner({ tone, text }: { tone: keyof typeof TONES; text: string }) {
  return (
    <Animated.View
      key={tone}
      entering={FadeIn.duration(250)}
      exiting={FadeOut.duration(150)}
      style={{
        flexDirection: 'row', alignItems: 'center', alignSelf: 'flex-start', gap: 8,
        marginHorizontal: 16, marginBottom: 10, paddingHorizontal: 12, paddingVertical: 6,
        borderRadius: 999, backgroundColor: colors.shelf, borderWidth: 1, borderColor: TONES[tone] + '66',
      }}>
      <View style={{ width: 7, height: 7, borderRadius: 4, backgroundColor: TONES[tone] }} />
      <Text style={{ color: colors.paper, fontSize: 12 }}>{text}</Text>
    </Animated.View>
  );
}

/**
 * Placeholder that matches the real book card (cover + title + author + meta).
 * One Skia canvas per card; a single light sweep runs across every bar.
 */
export function SkeletonCard({ width, delay = 0 }: { width: number; delay?: number }) {
  const coverH = Math.round(width * 1.5);
  const height = coverH + 62;
  const x = useSharedValue(-0.6);
  useEffect(() => {
    x.value = withDelay(
      delay,
      withRepeat(withTiming(1.6, { duration: 1500, easing: Easing.inOut(Easing.quad) }), -1, false)
    );
  }, [x, delay]);
  const start = useDerivedValue(() => vec(width * (x.value - 0.45), 0));
  const end = useDerivedValue(() => vec(width * (x.value + 0.45), 0));

  const shapes = [
    { x: 0, y: 0, w: width, h: coverH, r: 10 },
    { x: 0, y: coverH + 10, w: width * 0.92, h: 13, r: 6 },
    { x: 0, y: coverH + 30, w: width * 0.56, h: 11, r: 5 },
    { x: 0, y: coverH + 49, w: width * 0.34, h: 9, r: 4 },
  ];
  return (
    <Canvas style={{ width, height }}>
      {shapes.map((r, i) => (
        <RoundedRect key={`b${i}`} x={r.x} y={r.y} width={r.w} height={r.h} r={r.r} color={colors.shelf} />
      ))}
      {shapes.map((r, i) => (
        <RoundedRect key={`s${i}`} x={r.x} y={r.y} width={r.w} height={r.h} r={r.r}>
          <LinearGradient start={start} end={end} colors={['#6EE0C400', '#6EE0C42E', '#6EE0C400']} />
        </RoundedRect>
      ))}
    </Canvas>
  );
}

/** Two-column grid of skeleton cards, same geometry as the real list. */
export function SkeletonGrid({ cardW, gap, pad, rows = 3 }: { cardW: number; gap: number; pad: number; rows?: number }) {
  return (
    <View style={{ paddingHorizontal: pad }}>
      {Array.from({ length: rows }).map((_, r) => (
        <View key={r} style={{ flexDirection: 'row', gap, marginBottom: 18 }}>
          <SkeletonCard width={cardW} delay={r * 140} />
          <SkeletonCard width={cardW} delay={r * 140 + 70} />
        </View>
      ))}
    </View>
  );
}

export const timeAgo = (ts: number) => {
  const m = Math.round((Date.now() - ts) / 60000);
  if (m < 1) return 'just now';
  if (m < 60) return `${m} min ago`;
  const h = Math.round(m / 60);
  return h < 24 ? `${h} h ago` : `${Math.round(h / 24)} d ago`;
};
export const compact = (n: number) => (n >= 1e6 ? `${(n / 1e6).toFixed(1)}M` : n >= 1e3 ? `${Math.round(n / 1e3)}k` : `${n}`);
