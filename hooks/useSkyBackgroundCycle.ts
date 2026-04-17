import { useEffect, useMemo, useRef, useState } from 'react';
import { Animated } from 'react-native';
import {
  PRAYER_BG_IMAGES,
  SKY_CROSS_FADE_DURATION_MS,
  SKY_CYCLE_CHECK_MS,
  SKY_DAY_CYCLE_KEYS,
} from '@/components/prayer/heroConfig';

function getCycleIndex(now: Date, totalImages: number): number {
  if (totalImages <= 1) return 0;

  const minutesIntoDay =
    (now.getHours() * 60)
    + now.getMinutes()
    + (now.getSeconds() / 60)
    + (now.getMilliseconds() / 60000);

  const segmentMinutes = 1440 / totalImages;
  const rawIndex = Math.floor(minutesIntoDay / segmentMinutes);
  return Math.max(0, Math.min(totalImages - 1, rawIndex));
}

export function useSkyBackgroundCycle() {
  const fadeOpacity = useRef(new Animated.Value(0)).current;
  const totalImages = SKY_DAY_CYCLE_KEYS.length;

  const [currentIndex, setCurrentIndex] = useState<number>(() => getCycleIndex(new Date(), totalImages));
  const [nextIndex, setNextIndex] = useState<number>(() => getCycleIndex(new Date(), totalImages));

  const currentIndexRef = useRef(currentIndex);
  const isAnimatingRef = useRef(false);

  useEffect(() => {
    currentIndexRef.current = currentIndex;
  }, [currentIndex]);

  useEffect(() => {
    const tick = () => {
      const now = new Date();
      const targetIndex = getCycleIndex(now, totalImages);

      if (targetIndex === currentIndexRef.current || isAnimatingRef.current) {
        return;
      }

      isAnimatingRef.current = true;
      setNextIndex(targetIndex);
      fadeOpacity.setValue(0);

      Animated.timing(fadeOpacity, {
        toValue: 1,
        duration: SKY_CROSS_FADE_DURATION_MS,
        useNativeDriver: true,
      }).start(({ finished }) => {
        if (finished) {
          setCurrentIndex(targetIndex);
          setNextIndex(targetIndex);
        }

        fadeOpacity.setValue(0);
        isAnimatingRef.current = false;
      });
    };

    tick();
    const intervalId = setInterval(tick, SKY_CYCLE_CHECK_MS);

    return () => {
      clearInterval(intervalId);
    };
  }, [fadeOpacity, totalImages]);

  const currentSkySource = useMemo(() => {
    const key = SKY_DAY_CYCLE_KEYS[currentIndex] ?? 'Dhuhr';
    return PRAYER_BG_IMAGES[key] ?? PRAYER_BG_IMAGES.Dhuhr;
  }, [currentIndex]);

  const currentSkyKey = useMemo(() => SKY_DAY_CYCLE_KEYS[currentIndex] ?? 'Dhuhr', [currentIndex]);

  const nextSkySource = useMemo(() => {
    const key = SKY_DAY_CYCLE_KEYS[nextIndex] ?? 'Dhuhr';
    return PRAYER_BG_IMAGES[key] ?? PRAYER_BG_IMAGES.Dhuhr;
  }, [nextIndex]);

  const nextSkyKey = useMemo(() => SKY_DAY_CYCLE_KEYS[nextIndex] ?? 'Dhuhr', [nextIndex]);

  return {
    currentSkySource,
    currentSkyKey,
    nextSkySource,
    nextSkyKey,
    nextSkyOpacity: fadeOpacity,
  };
}
