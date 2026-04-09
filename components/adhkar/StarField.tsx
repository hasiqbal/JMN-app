/**
 * StarField.tsx
 * Decorative star-field overlay used in night-mode adhkar header.
 * Pure presentational — no props, no state.
 */
import React from 'react';
import { View, StyleSheet, Dimensions } from 'react-native';

const { width: SCREEN_W } = Dimensions.get('window');

const STARS = Array.from({ length: 90 }, (_, i) => ({
  key: i,
  x: (Math.sin(i * 7.3 + 1.2) * 0.5 + 0.5) * SCREEN_W,
  y: (Math.sin(i * 13.7 + 0.5) * 0.5 + 0.5) * 220,
  r: i % 7 === 0 ? 2.2 : i % 3 === 0 ? 1.4 : 0.9,
  op: 0.25 + (Math.sin(i * 2.9) * 0.5 + 0.5) * 0.65,
}));

export function StarField() {
  return (
    <View style={[StyleSheet.absoluteFillObject, { pointerEvents: 'none' }]}>
      {STARS.map(s => (
        <View
          key={s.key}
          style={[
            styles.star,
            {
              left: s.x,
              top: s.y,
              width: s.r * 2,
              height: s.r * 2,
              borderRadius: s.r,
              opacity: s.op,
            },
          ]}
        />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  star: { position: 'absolute', backgroundColor: '#C8DFFF' },
});
