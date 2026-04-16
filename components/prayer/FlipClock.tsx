import React, { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Animated } from 'react-native';

type Props = {
  time: string; // Format: "HH:MM:SS"
  style?: any;
};

function FlipDigit({ digit }: { digit: string }) {
  const [prevDigit, setPrevDigit] = useState(digit);
  const flipAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (prevDigit !== digit) {
      flipAnim.setValue(0);
      Animated.timing(flipAnim, {
        toValue: 1,
        duration: 600,
        useNativeDriver: false,
      }).start(() => {
        setPrevDigit(digit);
        flipAnim.setValue(0);
      });
    }
  }, [digit, prevDigit, flipAnim]);

  const rotateX = flipAnim.interpolate({
    inputRange: [0, 0.5, 1],
    outputRange: ['0deg', '90deg', '180deg'],
  });

  const frontOpacity = flipAnim.interpolate({
    inputRange: [0, 0.49, 0.5, 1],
    outputRange: [1, 0, 0, 0],
  });

  const backOpacity = flipAnim.interpolate({
    inputRange: [0, 0.5, 0.51, 1],
    outputRange: [0, 0, 1, 1],
  });

  return (
    <View style={styles.flipContainer}>
      {/* Front face */}
      <Animated.View
        style={[
          styles.flipFace,
          styles.flipFront,
          {
            opacity: frontOpacity,
            transform: [{ rotateX: rotateX }],
          },
        ]}
      >
        <Text style={styles.digitText}>{prevDigit}</Text>
      </Animated.View>

      {/* Back face */}
      <Animated.View
        style={[
          styles.flipFace,
          styles.flipBack,
          {
            opacity: backOpacity,
            transform: [{ rotateX: rotateX }],
          },
        ]}
      >
        <Text style={styles.digitText}>{digit}</Text>
      </Animated.View>
    </View>
  );
}

export default function FlipClock({ time, style }: Props) {
  // Extract digits from time string (e.g., "02:47:17" -> ['0','2','4','7','1','7'])
  const digits = time.replace(/:/g, '').split('');
  const separators = [2, 4]; // Positions where colons should appear

  return (
    <View style={[styles.clockContainer, style]}>
      {digits.map((digit, index) => (
        <React.Fragment key={`digit-${index}`}>
          {separators.includes(index) && <Text style={styles.colon}>:</Text>}
          <FlipDigit digit={digit} />
        </React.Fragment>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  clockContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  flipContainer: {
    width: 30,
    height: 48,
    marginHorizontal: 2,
    perspective: 1000,
    overflow: 'hidden',
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
    borderRadius: 4,
    justifyContent: 'center',
    alignItems: 'center',
  },
  flipFace: {
    position: 'absolute',
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
    backfaceVisibility: 'hidden',
  },
  flipFront: {
    backfaceVisibility: 'hidden',
  },
  flipBack: {
    backfaceVisibility: 'hidden',
  },
  digitText: {
    fontSize: 32,
    fontWeight: '700',
    color: '#FFFFFF',
    letterSpacing: 0,
    textShadowColor: 'rgba(0,0,0,0.5)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 8,
  },
  colon: {
    fontSize: 28,
    fontWeight: '800',
    color: '#FFFFFF',
    marginHorizontal: 4,
    textShadowColor: 'rgba(0,0,0,0.5)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 8,
  },
});
