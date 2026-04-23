import React from 'react';
import { Animated, Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

interface BannerPayload {
  id: number;
  title: string;
  message?: string;
  urduMessage?: string;
  onPress?: () => void;
  durationMs: number;
  variant: BannerVariant;
}

type BannerVariant = 'default' | 'warning';

interface InAppBannerContextType {
  showBanner: (
    title: string,
    message?: string,
    durationMs?: number,
    variant?: BannerVariant,
    urduMessage?: string,
    onPress?: () => void,
  ) => void;
}

const InAppBannerContext = React.createContext<InAppBannerContextType | undefined>(undefined);

interface InAppBannerProviderProps {
  children: React.ReactNode;
}

const DEFAULT_DURATION_MS = 4200;

export function InAppBannerProvider({ children }: InAppBannerProviderProps) {
  const insets = useSafeAreaInsets();
  const [banner, setBanner] = React.useState<BannerPayload | null>(null);
  const opacity = React.useRef(new Animated.Value(0)).current;
  const translateY = React.useRef(new Animated.Value(-16)).current;
  const hideTimerRef = React.useRef<ReturnType<typeof setTimeout> | null>(null);

  const clearHideTimer = React.useCallback(() => {
    if (hideTimerRef.current) {
      clearTimeout(hideTimerRef.current);
      hideTimerRef.current = null;
    }
  }, []);

  const hideBanner = React.useCallback(() => {
    clearHideTimer();
    Animated.parallel([
      Animated.timing(opacity, {
        toValue: 0,
        duration: 180,
        useNativeDriver: true,
      }),
      Animated.timing(translateY, {
        toValue: -16,
        duration: 180,
        useNativeDriver: true,
      }),
    ]).start(({ finished }) => {
      if (finished) setBanner(null);
    });
  }, [clearHideTimer, opacity, translateY]);

  const showBanner = React.useCallback((
    title: string,
    message?: string,
    durationMs = DEFAULT_DURATION_MS,
    variant: BannerVariant = 'default',
    urduMessage?: string,
    onPress?: () => void,
  ) => {
    clearHideTimer();
    const next: BannerPayload = {
      id: Date.now(),
      title,
      message,
      urduMessage,
      onPress,
      durationMs,
      variant,
    };
    setBanner(next);
  }, [clearHideTimer]);

  React.useEffect(() => {
    if (!banner) return;

    opacity.setValue(0);
    translateY.setValue(-16);
    Animated.parallel([
      Animated.timing(opacity, {
        toValue: 1,
        duration: 200,
        useNativeDriver: true,
      }),
      Animated.timing(translateY, {
        toValue: 0,
        duration: 220,
        useNativeDriver: true,
      }),
    ]).start();

    hideTimerRef.current = setTimeout(() => {
      hideBanner();
    }, Math.max(1200, banner.durationMs));

    return () => clearHideTimer();
  }, [banner, clearHideTimer, hideBanner, opacity, translateY]);

  React.useEffect(() => {
    return () => clearHideTimer();
  }, [clearHideTimer]);

  return (
    <InAppBannerContext.Provider value={{ showBanner }}>
      {children}
      {banner ? (
        <View pointerEvents="box-none" style={StyleSheet.absoluteFill}>
          <Animated.View
            style={[
              styles.bannerWrap,
              {
                top: insets.top + 10,
                opacity,
                transform: [{ translateY }],
              },
            ]}
          >
            <Pressable
              style={[
                styles.bannerCard,
                banner.variant === 'warning' && styles.bannerCardWarning,
              ]}
              onPress={() => {
                const action = banner.onPress;
                hideBanner();
                action?.();
              }}
            >
              <Text
                style={[
                  styles.bannerTitle,
                  banner.variant === 'warning' && styles.bannerTitleWarning,
                ]}
              >
                {banner.title}
              </Text>
              {banner.message ? (
                <Text
                  style={[
                    styles.bannerMessage,
                    banner.variant === 'warning' && styles.bannerMessageWarning,
                  ]}
                >
                  {banner.message}
                </Text>
              ) : null}
              {banner.urduMessage ? (
                <Text
                  style={[
                    styles.bannerUrdu,
                    banner.variant === 'warning' && styles.bannerUrduWarning,
                  ]}
                >
                  {banner.urduMessage}
                </Text>
              ) : null}
            </Pressable>
          </Animated.View>
        </View>
      ) : null}
    </InAppBannerContext.Provider>
  );
}

export function useInAppBanner(): InAppBannerContextType {
  const context = React.useContext(InAppBannerContext);
  if (!context) {
    throw new Error('useInAppBanner must be used within InAppBannerProvider');
  }
  return context;
}

const styles = StyleSheet.create({
  bannerWrap: {
    position: 'absolute',
    left: 12,
    right: 12,
    zIndex: 200,
  },
  bannerCard: {
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#D9B87A',
    backgroundColor: '#FFF8EA',
    paddingHorizontal: 14,
    paddingVertical: 12,
    boxShadow: '0px 6px 16px rgba(0,0,0,0.15)',
    elevation: 6,
  },
  bannerCardWarning: {
    borderColor: 'rgba(161, 98, 7, 0.28)',
    backgroundColor: '#FFF8E8',
  },
  bannerTitle: {
    fontSize: 13,
    fontWeight: '800',
    color: '#6E5833',
  },
  bannerTitleWarning: {
    color: '#7A3E00',
  },
  bannerMessage: {
    marginTop: 4,
    fontSize: 12,
    lineHeight: 17,
    color: '#5C4930',
    fontWeight: '500',
  },
  bannerMessageWarning: {
    color: '#8A5208',
  },
  bannerUrdu: {
    marginTop: 4,
    fontSize: 14,
    lineHeight: 22,
    color: '#5C4930',
    textAlign: 'right',
    writingDirection: 'rtl',
    fontFamily: 'UrduNastaliq',
  },
  bannerUrduWarning: {
    color: '#8A5208',
  },
});
