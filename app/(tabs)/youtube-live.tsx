import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Linking,
  Platform,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { MaterialIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import WebView from 'react-native-webview';
import { APP_CONFIG } from '@/constants/config';
import { Radius, Spacing } from '@/constants/theme';

const CHROME_HIDE_DELAY_MS = 2600;
const PLAYER_TAP_MESSAGE = 'jmn-player-tap';
const PLAYER_URL_MESSAGE_PREFIX = 'jmn-player-url:';
const JMN_CHANNEL_HANDLE = APP_CONFIG.youtubeChannelHandle.replace(/^@/, '').toLowerCase();
const JMN_CHANNEL_HANDLE_COMPACT = JMN_CHANNEL_HANDLE.replace(/[^a-z0-9]/g, '');
const JMN_CHANNEL_ID = APP_CONFIG.youtubeChannelId.toLowerCase().startsWith('uc')
  ? APP_CONFIG.youtubeChannelId.toLowerCase()
  : '';
const JMN_CHANNEL_URL = APP_CONFIG.youtubeChannelUrl;
const WEBVIEW_BRIDGE_SCRIPT = `
  (function() {
    if (window.__JMN_BRIDGE__) { true; return; }
    window.__JMN_BRIDGE__ = true;
    var TAP_MESSAGE = '${PLAYER_TAP_MESSAGE}';
    var URL_PREFIX = '${PLAYER_URL_MESSAGE_PREFIX}';
    var CHANNEL_HANDLE = '${JMN_CHANNEL_HANDLE}';
    var EXPECTED_CHANNEL_ID = '${JMN_CHANNEL_ID}';
    var CHANNEL_HOME = '${JMN_CHANNEL_URL}';
    var sendMessage = function(msg) {
      try {
        if (window.ReactNativeWebView && window.ReactNativeWebView.postMessage) {
          window.ReactNativeWebView.postMessage(msg);
        }
      } catch (e) {}
    };
    var postCurrentUrl = function() {
      sendMessage(URL_PREFIX + window.location.href);
    };
    var notifyTap = function() {
      sendMessage(TAP_MESSAGE);
    };
    var allowedChannelId = '';
    var unknownOwnerHref = '';
    var unknownOwnerChecks = 0;
    var readMetaChannelId = function() {
      try {
        var meta = document.querySelector('meta[itemprop="channelId"]');
        if (meta && meta.content) {
          return String(meta.content).toLowerCase();
        }
      } catch (e) {}
      return '';
    };
    var readCanonicalChannelId = function() {
      try {
        var canonical = document.querySelector('link[rel="canonical"]');
        var href = canonical && canonical.getAttribute ? canonical.getAttribute('href') : '';
        if (!href) return '';
        return extractChannelIdFromHref(String(href));
      } catch (e) {}
      return '';
    };
    var readOgUrlChannelId = function() {
      try {
        var meta = document.querySelector('meta[property="og:url"]');
        var content = meta && meta.getAttribute ? meta.getAttribute('content') : '';
        if (!content) return '';
        return extractChannelIdFromHref(String(content));
      } catch (e) {}
      return '';
    };
    var readAnyChannelId = function() {
      return readOwnerChannelId() || readMetaChannelId() || readCanonicalChannelId() || readOgUrlChannelId();
    };
    var normalizeHandle = function(value) {
      var clean = value ? String(value).toLowerCase() : '';
      if (!clean) return '';
      clean = clean.replace(/^@/, '');
      clean = clean.split('?')[0].split('#')[0].split('/')[0];
      return clean;
    };
    var extractHandleFromHref = function(href) {
      try {
        var match = String(href || '').match(/\/@([^/?#]+)/i);
        if (!match || !match[1]) return '';
        return normalizeHandle(match[1]);
      } catch (e) {}
      return '';
    };
    var extractChannelIdFromHref = function(href) {
      try {
        var match = String(href || '').toLowerCase().match(/\/channel\/([a-z0-9_-]+)/i);
        if (!match || !match[1]) return '';
        return String(match[1]).toLowerCase();
      } catch (e) {}
      return '';
    };
    var ownerSelectors = [
      'ytd-watch-metadata ytd-channel-name a[href]',
      'ytd-video-owner-renderer a[href]',
      '#owner ytd-channel-name a[href]',
      'ytm-slim-owner-renderer a[href]',
      'ytm-video-owner-renderer a[href]'
    ];
    var readOwnerHref = function() {
      try {
        for (var i = 0; i < ownerSelectors.length; i += 1) {
          var node = document.querySelector(ownerSelectors[i]);
          if (node) {
            var raw = node.getAttribute('href') || node.href;
            if (raw) {
              return String(raw);
            }
          }
        }
      } catch (e) {}
      return '';
    };
    var readOwnerHandle = function() {
      return extractHandleFromHref(readOwnerHref());
    };
    var readOwnerChannelId = function() {
      var fromHref = extractChannelIdFromHref(readOwnerHref());
      if (fromHref) return fromHref;
      return readMetaChannelId();
    };
    var maybeCaptureAllowedChannel = function() {
      try {
        var href = (window.location && window.location.href ? String(window.location.href) : '').toLowerCase();
        if (href.indexOf('@' + CHANNEL_HANDLE) !== -1) {
          unknownOwnerHref = '';
          unknownOwnerChecks = 0;
          var channelId = readAnyChannelId();
          if (channelId) {
            allowedChannelId = channelId;
          }
        }
      } catch (e) {}
    };
    var hideNodesBySelectors = function(selectors) {
      try {
        for (var i = 0; i < selectors.length; i += 1) {
          var nodes = document.querySelectorAll(selectors[i]);
          for (var n = 0; n < nodes.length; n += 1) {
            nodes[n].style.display = 'none';
            nodes[n].style.visibility = 'hidden';
          }
        }
      } catch (e) {}
    };
    var hideSelectors = [
      'ytd-masthead',
      '#masthead-container',
      'ytd-guide-renderer',
      '#guide',
      '#mini-guide',
      'ytm-mobile-topbar-renderer',
      'ytm-searchbox',
      'form[role="search"]'
    ];
    var relatedSelectors = [
      '#secondary',
      '#related',
      'ytd-watch-next-secondary-results-renderer',
      'ytd-item-section-renderer[section-identifier="related-items"]',
      'ytm-item-section-renderer[section-identifier="related-items"]',
      'ytm-watch-next-secondary-results-renderer',
      'ytm-reel-shelf-renderer',
      'ytd-reel-shelf-renderer',
      '.ytp-endscreen-content',
      '.ytp-ce-element',
      '.ytp-upnext'
    ];
    var relatedClickScopeSelectors = [
      '#secondary',
      '#related',
      'ytd-watch-next-secondary-results-renderer',
      'ytm-watch-next-secondary-results-renderer',
      'ytd-item-section-renderer[section-identifier="related-items"]',
      'ytm-item-section-renderer[section-identifier="related-items"]',
      'ytd-reel-shelf-renderer',
      'ytm-reel-shelf-renderer'
    ];
    var hiddenStyleId = 'jmn-youtube-hide-related-style';
    var ensureRelatedStyle = function() {
      try {
        if (document.getElementById(hiddenStyleId)) return;
        var style = document.createElement('style');
        style.id = hiddenStyleId;
        style.textContent = relatedSelectors.join(',') + '{display:none !important; visibility:hidden !important; opacity:0 !important; max-height:0 !important; pointer-events:none !important;}';
        (document.head || document.documentElement).appendChild(style);
      } catch (e) {}
    };
    var readCurrentVideoChannelId = function() {
      try {
        var fromInitial = window.ytInitialPlayerResponse
          && window.ytInitialPlayerResponse.videoDetails
          && window.ytInitialPlayerResponse.videoDetails.channelId;
        if (fromInitial) return String(fromInitial).toLowerCase();
      } catch (e) {}
      try {
        var fromPlayer = window.ytplayer
          && window.ytplayer.config
          && window.ytplayer.config.args
          && (window.ytplayer.config.args.channelId || window.ytplayer.config.args.ucid);
        if (fromPlayer) return String(fromPlayer).toLowerCase();
      } catch (e) {}
      return '';
    };
    var hideYouTubeChrome = function() {
      try {
        hideNodesBySelectors(hideSelectors);
        if (document.body) {
          document.body.style.paddingTop = '0px';
        }
      } catch (e) {}
    };
    var hideRelatedSuggestions = function() {
      try {
        var path = (window.location && window.location.pathname ? String(window.location.pathname) : '').toLowerCase();
        if (path.indexOf('/watch') !== 0 && path.indexOf('/shorts') !== 0) return;
        ensureRelatedStyle();
        hideNodesBySelectors(relatedSelectors);
      } catch (e) {}
    };
    var hideBelowCommentsVideoSections = function() {
      try {
        var path = (window.location && window.location.pathname ? String(window.location.pathname) : '').toLowerCase();
        if (path.indexOf('/watch') !== 0 && path.indexOf('/shorts') !== 0) return;

        var belowRoots = document.querySelectorAll('#below, ytd-watch-flexy #below, ytm-watch #below');
        for (var r = 0; r < belowRoots.length; r += 1) {
          var root = belowRoots[r];
          if (!root) continue;

          var sections = root.querySelectorAll(
            'ytd-item-section-renderer, ytd-rich-section-renderer, ytd-rich-grid-renderer, ytd-horizontal-card-list-renderer, ytd-shelf-renderer, ytm-item-section-renderer, ytm-section-list-renderer'
          );

          for (var s = 0; s < sections.length; s += 1) {
            var section = sections[s];
            if (!section) continue;

            // Keep comments visible; hide only recommendation/video blocks below comments.
            if (section.querySelector('ytd-comments, #comments, ytm-comment-section-renderer')) {
              continue;
            }

            var hasVideoLinks = section.querySelector(
              'a[href*="/watch"], a[href*="/shorts"], a[href*="/playlist"], a[href*="/@"], a[href*="/channel/"]'
            );

            if (hasVideoLinks) {
              section.style.display = 'none';
              section.style.visibility = 'hidden';
              section.style.opacity = '0';
              section.style.maxHeight = '0';
              section.style.pointerEvents = 'none';
            }
          }
        }
      } catch (e) {}
    };
    var blockRelatedClickNavigation = function(event) {
      try {
        var target = event && event.target ? event.target : null;
        if (!target || !target.closest) return;

        var path = (window.location && window.location.pathname ? String(window.location.pathname) : '').toLowerCase();
        var currentHref = (window.location && window.location.href ? String(window.location.href) : '');

        var currentVideoId = '';
        if (path.indexOf('/watch') === 0) {
          try {
            currentVideoId = (new URL(currentHref)).searchParams.get('v') || '';
          } catch (e) {
            currentVideoId = '';
          }
        } else if (path.indexOf('/shorts/') === 0) {
          currentVideoId = path.replace('/shorts/', '').split('/')[0];
        }

        var inRelatedScope = false;
        for (var i = 0; i < relatedClickScopeSelectors.length; i += 1) {
          if (target.closest(relatedClickScopeSelectors[i])) {
            inRelatedScope = true;
            break;
          }
        }

        if (!inRelatedScope) {
          var insideBelow = target.closest('#below, ytd-watch-flexy #below, ytm-watch #below');
          var insideComments = target.closest('#comments, ytd-comments, ytm-comment-section-renderer');
          inRelatedScope = !!insideBelow && !insideComments;
        }

        if (!inRelatedScope) return;

        var anchor = target.closest('a[href]');
        if (!anchor) return;
        var href = String(anchor.getAttribute('href') || anchor.href || '').toLowerCase();
        if (!href) return;

        // Hard fallback: while watching, block all jumps to any other video from page links.
        if (path.indexOf('/watch') === 0 || path.indexOf('/shorts') === 0) {
          var nextVideoId = '';
          try {
            if (href.indexOf('/watch') !== -1) {
              var parsedHref = new URL(href, window.location.origin);
              nextVideoId = parsedHref.searchParams.get('v') || '';
            } else if (href.indexOf('/shorts/') !== -1) {
              var shortsPath = href.split('/shorts/')[1] || '';
              nextVideoId = shortsPath.split(/[/?#]/)[0] || '';
            }
          } catch (e) {
            nextVideoId = '';
          }

          var isVideoJump = href.indexOf('/watch') !== -1 || href.indexOf('/shorts/') !== -1;
          if (isVideoJump && nextVideoId && currentVideoId && nextVideoId !== currentVideoId) {
            event.preventDefault();
            event.stopPropagation();
            window.location.replace(CHANNEL_HOME);
            return;
          }
        }

        if (href.indexOf('/watch') !== -1 || href.indexOf('/shorts') !== -1 || href.indexOf('/channel/') !== -1 || href.indexOf('/@') !== -1) {
          event.preventDefault();
          event.stopPropagation();
          window.location.replace(CHANNEL_HOME);
        }
      } catch (e) {}
    };
    var enforceChannelScope = function() {
      try {
        var href = (window.location && window.location.href ? String(window.location.href) : '').toLowerCase();
        var path = (window.location && window.location.pathname ? String(window.location.pathname) : '').toLowerCase();

        if (href.indexOf('@' + CHANNEL_HANDLE) !== -1) {
          maybeCaptureAllowedChannel();
          return;
        }

        if (path === '/' || path.indexOf('/results') === 0 || path.indexOf('/feed') === 0) {
          window.location.replace(CHANNEL_HOME);
          return;
        }

        if (path.indexOf('/watch') === 0 || path.indexOf('/shorts') === 0) {
          var ownerHandle = readOwnerHandle();
          var ownerChannelId = readAnyChannelId();
          var videoChannelId = readCurrentVideoChannelId();
          var effectiveChannelId = videoChannelId || ownerChannelId;

          if (ownerHandle && ownerHandle !== CHANNEL_HANDLE) {
            window.location.replace(CHANNEL_HOME);
            return;
          }

          if (EXPECTED_CHANNEL_ID && effectiveChannelId && effectiveChannelId !== EXPECTED_CHANNEL_ID) {
            window.location.replace(CHANNEL_HOME);
            return;
          }

          if (effectiveChannelId && allowedChannelId && effectiveChannelId !== allowedChannelId) {
            window.location.replace(CHANNEL_HOME);
            return;
          }

          if (effectiveChannelId && !allowedChannelId && !EXPECTED_CHANNEL_ID) {
            window.location.replace(CHANNEL_HOME);
            return;
          }

          // If owner metadata never resolves for this watch URL after a few checks,
          // fail closed instead of letting a potentially foreign video persist.
          if (!ownerHandle && !effectiveChannelId) {
            if (unknownOwnerHref !== href) {
              unknownOwnerHref = href;
              unknownOwnerChecks = 1;
            } else {
              unknownOwnerChecks += 1;
            }

            if (unknownOwnerChecks >= 4) {
              window.location.replace(CHANNEL_HOME);
              return;
            }
          } else {
            unknownOwnerHref = '';
            unknownOwnerChecks = 0;
          }
        }

        if (path.indexOf('/channel/') === 0 && allowedChannelId) {
          var pathChannelId = path.replace('/channel/', '').split('/')[0];
          if (pathChannelId && pathChannelId !== allowedChannelId) {
            window.location.replace(CHANNEL_HOME);
            return;
          }
        }

        if (path.indexOf('/c/') === 0 || path.indexOf('/user/') === 0) {
          window.location.replace(CHANNEL_HOME);
        }
      } catch (e) {}
    };
    var onRouteChanged = function() {
      postCurrentUrl();
      hideYouTubeChrome();
      maybeCaptureAllowedChannel();
      hideRelatedSuggestions();
      hideBelowCommentsVideoSections();
      enforceChannelScope();
    };
    var wrapHistory = function(methodName) {
      try {
        var original = history[methodName];
        if (typeof original !== 'function') return;
        history[methodName] = function() {
          var result = original.apply(this, arguments);
          onRouteChanged();
          return result;
        };
      } catch (e) {}
    };
    document.addEventListener('click', notifyTap, true);
    document.addEventListener('touchend', notifyTap, true);
    document.addEventListener('click', blockRelatedClickNavigation, true);
    document.addEventListener('touchend', blockRelatedClickNavigation, true);
    window.addEventListener('popstate', onRouteChanged);
    wrapHistory('pushState');
    wrapHistory('replaceState');
    onRouteChanged();
    setInterval(onRouteChanged, 1200);
    true;
  })();
`;

export default function YouTubeLiveScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();

  const [showChrome, setShowChrome] = useState(false);
  const [playerError, setPlayerError] = useState<string | null>(null);
  const [webViewReloadNonce, setWebViewReloadNonce] = useState(0);

  const webViewRef = useRef<WebView>(null);
  const hideChromeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastBlockedUrlRef = useRef<string | null>(null);
  const currentVideoIdRef = useRef<string | null>(null);

  const inAppPlayerUrl = APP_CONFIG.youtubeStreamUrl;
  const escapedInAppPlayerUrl = useMemo(
    () => inAppPlayerUrl.replace(/\\/g, '\\\\').replace(/'/g, "\\'"),
    [inAppPlayerUrl],
  );

  const clearHideChromeTimer = useCallback(() => {
    if (!hideChromeTimerRef.current) return;
    clearTimeout(hideChromeTimerRef.current);
    hideChromeTimerRef.current = null;
  }, []);

  const scheduleHideChrome = useCallback(() => {
    clearHideChromeTimer();
    hideChromeTimerRef.current = setTimeout(() => {
      setShowChrome(false);
      hideChromeTimerRef.current = null;
    }, CHROME_HIDE_DELAY_MS);
  }, [clearHideChromeTimer]);

  const revealChrome = useCallback(() => {
    setShowChrome(true);
    scheduleHideChrome();
  }, [scheduleHideChrome]);

  const hideChrome = useCallback(() => {
    clearHideChromeTimer();
    setShowChrome(false);
  }, [clearHideChromeTimer]);

  const openYouTube = useCallback(() => {
    Linking.openURL(inAppPlayerUrl).catch(() => {});
  }, [inAppPlayerUrl]);

  const closeScreen = useCallback(() => {
    clearHideChromeTimer();
    if (router.canGoBack()) {
      router.back();
      return;
    }
    router.replace('/stream');
  }, [clearHideChromeTimer, router]);

  const handleInAppPlayerError = useCallback(() => {
    clearHideChromeTimer();
    setShowChrome(true);
    setPlayerError('In-app playback failed. Opened YouTube instead.');
    openYouTube();
    Alert.alert('Playback issue', 'Could not play in-app. Opening YouTube.');
  }, [clearHideChromeTimer, openYouTube]);

  const redirectToAllowedChannel = useCallback(() => {
    // Hard-reset the WebView so blocked page history/state cannot persist.
    setWebViewReloadNonce((prev) => prev + 1);
    webViewRef.current?.injectJavaScript(`
      try {
        if (window.location && window.location.href !== '${escapedInAppPlayerUrl}') {
          window.location.replace('${escapedInAppPlayerUrl}');
        }
      } catch (e) {}
      true;
    `);
  }, [escapedInAppPlayerUrl]);

  const handleBlockedNavigation = useCallback((url: string) => {
    if (lastBlockedUrlRef.current !== url) {
      lastBlockedUrlRef.current = url;
      setPlayerError('Only the JMN YouTube channel is allowed in-app.');
      revealChrome();
    }
    redirectToAllowedChannel();
  }, [redirectToAllowedChannel, revealChrome]);

  const extractVideoId = useCallback((url: string): string | null => {
    try {
      const parsed = new URL(url);
      const pathname = parsed.pathname.toLowerCase();
      if (pathname.startsWith('/watch')) {
        return parsed.searchParams.get('v');
      }
      if (pathname.startsWith('/shorts/')) {
        const id = pathname.replace('/shorts/', '').split('/')[0];
        return id || null;
      }
      return null;
    } catch {
      return null;
    }
  }, []);

  const isWatchOrShortsUrl = useCallback((url: string): boolean => {
    try {
      const parsed = new URL(url);
      const pathname = parsed.pathname.toLowerCase();
      return pathname.startsWith('/watch') || pathname.startsWith('/shorts/');
    } catch {
      return false;
    }
  }, []);

  const isAllowedJmnYouTubeUrl = useCallback((url: string): boolean => {
    if (!url) return false;

    const normalized = url.toLowerCase();
    if (normalized.startsWith('about:blank') || normalized.startsWith('data:') || normalized.startsWith('blob:')) {
      return true;
    }

    try {
      const parsed = new URL(url);
      const host = parsed.hostname.toLowerCase();
      if (!host.includes('youtube.com')) {
        return false;
      }

      const pathname = parsed.pathname.toLowerCase();
      const search = parsed.search.toLowerCase();
      const full = `${host}${pathname}${search}`;
      const configuredId = APP_CONFIG.youtubeChannelId.toLowerCase();

      const abChannel = (parsed.searchParams.get('ab_channel') ?? '').toLowerCase().replace(/[^a-z0-9]/g, '');
      if (abChannel && !abChannel.includes(JMN_CHANNEL_HANDLE_COMPACT)) {
        return false;
      }

      const channelParam = (parsed.searchParams.get('channel_id') ?? parsed.searchParams.get('channel') ?? '').toLowerCase();
      if (channelParam && configuredId.startsWith('uc') && channelParam !== configuredId) {
        return false;
      }

      if (pathname === '/' || pathname.startsWith('/results') || pathname.startsWith('/feed')) {
        return false;
      }

      if (full.includes(`@${JMN_CHANNEL_HANDLE}`)) {
        return true;
      }

      if (pathname.startsWith('/watch') || pathname.startsWith('/shorts')) {
        if (abChannel && abChannel.includes(JMN_CHANNEL_HANDLE_COMPACT)) {
          return true;
        }
        if (configuredId.startsWith('uc') && channelParam && channelParam === configuredId) {
          return true;
        }
        if (configuredId.startsWith('uc') && full.includes(configuredId)) {
          return true;
        }
        // If URL hints do not prove a foreign channel, allow load and let
        // injected owner/channel checks enforce channel lock at runtime.
        return true;
      }

      if (pathname.startsWith('/live')) {
        if (abChannel && abChannel.includes(JMN_CHANNEL_HANDLE_COMPACT)) {
          return true;
        }
        if (configuredId.startsWith('uc') && full.includes(configuredId)) {
          return true;
        }
        return true;
      }

      if (pathname.startsWith('/@')) {
        const handlePart = pathname.slice(2).split('/')[0];
        if (handlePart && handlePart.toLowerCase() === JMN_CHANNEL_HANDLE) {
          return true;
        }
        return false;
      }

      if (pathname.startsWith('/channel/')) {
        if (configuredId.startsWith('uc')) {
          const pathChannelId = pathname.replace('/channel/', '').split('/')[0];
          return pathChannelId === configuredId;
        }
        return false;
      }

      if (pathname.startsWith('/playlist')) {
        if (configuredId.startsWith('uc') && full.includes(configuredId)) {
          return true;
        }
        if (abChannel && abChannel.includes(JMN_CHANNEL_HANDLE_COMPACT)) {
          return true;
        }
        return false;
      }

      if (pathname.startsWith('/c/') || pathname.startsWith('/user/')) {
        return false;
      }

      if (pathname.startsWith('/embed/')) {
        if (configuredId.startsWith('uc') && full.includes(configuredId)) {
          return true;
        }
        if (abChannel && abChannel.includes(JMN_CHANNEL_HANDLE_COMPACT)) {
          return true;
        }
        return false;
      }

      if (pathname === '/' || pathname === '') {
        return false;
      }

      if (full.includes(`@${JMN_CHANNEL_HANDLE}`)) {
        return true;
      }

      if (configuredId.startsWith('uc') && full.includes(configuredId)) {
        return true;
      }

      return false;
    } catch {
      return false;
    }
  }, []);

  const handleWebViewMessage = useCallback((event: { nativeEvent: { data: string } }) => {
    const data = event.nativeEvent.data;
    if (data === PLAYER_TAP_MESSAGE) {
      revealChrome();
      return;
    }

    if (data.startsWith(PLAYER_URL_MESSAGE_PREFIX)) {
      const currentUrl = data.slice(PLAYER_URL_MESSAGE_PREFIX.length);
      if (isAllowedJmnYouTubeUrl(currentUrl)) {
        lastBlockedUrlRef.current = null;
        return;
      }
      handleBlockedNavigation(currentUrl);
    }
  }, [handleBlockedNavigation, isAllowedJmnYouTubeUrl, revealChrome]);

  const handleShouldStartLoad = useCallback((request: { url: string }) => {
    if (isWatchOrShortsUrl(request.url) && currentVideoIdRef.current) {
      const nextVideoId = extractVideoId(request.url);
      if (nextVideoId && nextVideoId !== currentVideoIdRef.current) {
        handleBlockedNavigation(request.url);
        return false;
      }
    }

    const allowed = isAllowedJmnYouTubeUrl(request.url);
    if (allowed) {
      lastBlockedUrlRef.current = null;
      return true;
    }

    handleBlockedNavigation(request.url);
    return false;
  }, [extractVideoId, handleBlockedNavigation, isAllowedJmnYouTubeUrl, isWatchOrShortsUrl]);

  const handleNavigationStateChange = useCallback((navState: { url: string }) => {
    if (isAllowedJmnYouTubeUrl(navState.url)) {
      currentVideoIdRef.current = extractVideoId(navState.url);
      lastBlockedUrlRef.current = null;
      return;
    }
    currentVideoIdRef.current = null;
    handleBlockedNavigation(navState.url);
  }, [extractVideoId, handleBlockedNavigation, isAllowedJmnYouTubeUrl]);

  useEffect(() => {
    if (!showChrome) return;
    scheduleHideChrome();
  }, [scheduleHideChrome, showChrome]);

  useEffect(() => {
    setPlayerError(null);
    lastBlockedUrlRef.current = null;
    currentVideoIdRef.current = null;
    setWebViewReloadNonce((prev) => prev + 1);
  }, [inAppPlayerUrl]);

  useEffect(() => () => {
    clearHideChromeTimer();
  }, [clearHideChromeTimer]);

  if (Platform.OS === 'web') {
    return (
      <View style={styles.webFallbackScreen}>
        <Text style={styles.webFallbackTitle}>Open YouTube</Text>
        <TouchableOpacity style={styles.webFallbackButton} onPress={openYouTube} activeOpacity={0.85}>
          <MaterialIcons name="open-in-new" size={18} color="#FFFFFF" />
          <Text style={styles.webFallbackButtonText}>Open in YouTube</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.screen}>
      <WebView
        key={`youtube-live-${webViewReloadNonce}-${inAppPlayerUrl}`}
        ref={webViewRef}
        source={{ uri: inAppPlayerUrl }}
        style={styles.webview}
        injectedJavaScriptBeforeContentLoaded={WEBVIEW_BRIDGE_SCRIPT}
        injectedJavaScript={WEBVIEW_BRIDGE_SCRIPT}
        allowsInlineMediaPlayback
        allowsFullscreenVideo
        setSupportMultipleWindows={false}
        mediaPlaybackRequiresUserAction={false}
        javaScriptEnabled
        domStorageEnabled
        startInLoadingState
        renderLoading={() => (
          <View style={styles.playerLoadingOverlay}>
            <ActivityIndicator size="large" color="#FFFFFF" />
            <Text style={styles.playerLoadingText}>Loading YouTube...</Text>
          </View>
        )}
        onError={handleInAppPlayerError}
        onHttpError={handleInAppPlayerError}
        onMessage={handleWebViewMessage}
        onShouldStartLoadWithRequest={handleShouldStartLoad}
        onNavigationStateChange={handleNavigationStateChange}
      />

      {!showChrome ? (
        <TouchableOpacity
          style={[styles.revealChromeButton, { top: insets.top + 12 }]}
          onPress={revealChrome}
          activeOpacity={0.85}
        >
          <MaterialIcons name="visibility" size={16} color="#EAF0FF" />
          <Text style={styles.revealChromeButtonText}>Show controls</Text>
        </TouchableOpacity>
      ) : null}

      <View pointerEvents="box-none" style={styles.chromeLayer}>
        {showChrome ? (
          <View style={[styles.topBar, { paddingTop: insets.top + 8 }]}>
            <TouchableOpacity style={styles.iconButton} onPress={closeScreen} activeOpacity={0.85}>
              <MaterialIcons name="arrow-back" size={20} color="#FFFFFF" />
            </TouchableOpacity>

            <View style={[styles.livePill, { backgroundColor: '#637084' }]}>
              <Text style={styles.livePillText}>YOUTUBE</Text>
            </View>

            <View style={styles.topBarActions}>
              <TouchableOpacity style={styles.iconButton} onPress={openYouTube} activeOpacity={0.85}>
                <MaterialIcons name="open-in-new" size={20} color="#FFFFFF" />
              </TouchableOpacity>

              <TouchableOpacity style={styles.iconButton} onPress={hideChrome} activeOpacity={0.85}>
                <MaterialIcons name="visibility-off" size={20} color="#FFFFFF" />
              </TouchableOpacity>
            </View>
          </View>
        ) : null}
      </View>

      {playerError && showChrome ? (
        <View style={[styles.errorToast, { bottom: Math.max(insets.bottom, 12) }]}>
          <Text style={styles.errorToastText}>{playerError}</Text>
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: '#000000',
  },
  webview: {
    flex: 1,
    backgroundColor: '#000000',
  },
  playerLoadingOverlay: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: 'rgba(0,0,0,0.9)',
  },
  playerLoadingText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '700',
  },
  revealChromeButton: {
    position: 'absolute',
    alignSelf: 'center',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    borderRadius: Radius.full,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.22)',
    backgroundColor: 'rgba(6,10,16,0.72)',
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  revealChromeButtonText: {
    color: '#EAF0FF',
    fontSize: 12,
    fontWeight: '700',
  },
  chromeLayer: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'space-between',
  },
  topBar: {
    paddingHorizontal: Spacing.md,
    paddingBottom: 8,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  topBarActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  iconButton: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(7,12,19,0.72)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.25)',
  },
  livePill: {
    borderRadius: Radius.full,
    paddingHorizontal: 12,
    paddingVertical: 7,
  },
  livePillText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  errorToast: {
    position: 'absolute',
    left: Spacing.md,
    right: Spacing.md,
    borderRadius: Radius.md,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.22)',
    backgroundColor: 'rgba(8,12,18,0.9)',
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  errorToastText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '600',
    textAlign: 'center',
  },
  webFallbackScreen: {
    flex: 1,
    backgroundColor: '#05080E',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 20,
    gap: 12,
  },
  webFallbackTitle: {
    color: '#FFFFFF',
    fontSize: 24,
    fontWeight: '900',
  },
  webFallbackButton: {
    borderRadius: Radius.full,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.24)',
    backgroundColor: 'rgba(188,47,47,0.92)',
    paddingHorizontal: 18,
    paddingVertical: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  webFallbackButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '800',
  },
});
