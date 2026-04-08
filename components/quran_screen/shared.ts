
import { StyleSheet } from 'react-native';



// ── Night palette (inline — mirrors NIGHT_PALETTE from constants/nightPalette.ts) ────
const NIGHT = {
  bg:         '#06090F',   // Deep space navy
  surface:    '#0C1220',   // Card surface
  surfaceAlt: '#111C32',   // Elevated surface
  border:     '#1B2E4A',   // Refined border
  text:       '#EEF3FC',   // Bright moonlight white
  textSub:    '#93B4D8',   // Clear blue-grey
  textMuted:  '#5A7A9E',   // Readable muted
  accent:     '#6AAEFF',   // Bright sky blue
  primary:    '#4DCF88',   // Bright emerald green
  chip:       '#0A1A35',   // Chip bg
};


const ysPdfSt = StyleSheet.create({
  topBar: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 16, paddingVertical: 12,
    borderBottomWidth: 1,
  },
  surahNameAr: { fontSize: 22, fontWeight: '800' } as any,
  surahMeta: { fontSize: 11, fontWeight: '500', marginTop: 2, letterSpacing: 0.2 },
  badge: {
    paddingHorizontal: 12, paddingVertical: 6,
    borderRadius: 999, borderWidth: 1,
  },
  badgeText: { fontSize: 11, fontWeight: '700' },
  pageCard: {
    borderRadius: 3,
    overflow: 'hidden',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 10,
    elevation: 6,
    position: 'relative',
  },
  pageNumPill: {
    position: 'absolute',
    bottom: 8,
    alignSelf: 'center',
    paddingHorizontal: 14, paddingVertical: 4,
    borderRadius: 999, borderWidth: 1,
  },
  pageNumText: { fontSize: 11, fontWeight: '700', letterSpacing: 0.4 },
  footer: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 6, paddingTop: 16, borderTopWidth: 1, width: '100%',
  },
  footerText: { fontSize: 11, fontWeight: '500' },
  pageErrorBox: {
    alignItems: 'center', justifyContent: 'center',
    borderRadius: 3, overflow: 'hidden',
  },
  // Translation button
  transBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    paddingHorizontal: 11, paddingVertical: 7,
    borderRadius: 999, borderWidth: 1.5, borderColor: '#0D6E4A',
  },
  transBtnText: { fontSize: 12, fontWeight: '700' },
  // Translation panel
  transPanel: {
    marginTop: 16, borderRadius: 12,
    borderWidth: 1, overflow: 'hidden',
    width: '100%',
  },
  transPanelHeader: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    paddingHorizontal: 14, paddingVertical: 12,
  },
  transPanelTitle: { flex: 1, fontSize: 14, fontWeight: '800', letterSpacing: 0.2 },
  transPageSection: {
    borderTopWidth: 1,
  },
  transPageLabel: {
    paddingHorizontal: 14, paddingVertical: 8,
  },
  transPageLabelText: { fontSize: 11, fontWeight: '700', letterSpacing: 0.4 },
  transVerseRow: {
    flexDirection: 'row', gap: 10, paddingHorizontal: 14, paddingVertical: 10,
    borderBottomWidth: 1, alignItems: 'flex-start',
  },
  transVerseNum: {
    width: 26, height: 26, borderRadius: 13,
    alignItems: 'center', justifyContent: 'center', flexShrink: 0, marginTop: 2,
  },
  transVerseNumText: { fontSize: 11, fontWeight: '800' },
  transVerseTranslit: { fontSize: 12, fontStyle: 'italic', lineHeight: 18 },
  transVerseTrans: { fontSize: 13, lineHeight: 20, fontWeight: '400' },
  // Compact nav bar
  navBarCompact: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 8, paddingVertical: 6,
    borderTopWidth: 1,
  },
  navBtnCompact: {
    width: 44, height: 44, alignItems: 'center', justifyContent: 'center',
  },
  pageNumCompact: { fontSize: 14, fontWeight: '800', letterSpacing: 0.3 },
  // Dot indicators overlay
  dotsOverlay: {
    position: 'absolute', top: 8, right: 8,
    flexDirection: 'row', alignItems: 'center', gap: 4,
    backgroundColor: 'rgba(0,0,0,0.25)', borderRadius: 999,
    paddingHorizontal: 8, paddingVertical: 5,
  },
  dotSmall: { width: 6, height: 6, borderRadius: 3 },
  // Translation overlay (full-screen panel)
  transOverlay: {
    position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
    zIndex: 10,
  },
  transOverlayHeader: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    paddingHorizontal: 14, paddingVertical: 12,
    borderBottomWidth: 1,
  },
  // Toggle bar
  toggleBar: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    paddingHorizontal: 16, paddingVertical: 10,
    borderBottomWidth: 1,
  },
  toggleLabel: { fontSize: 12, fontWeight: '600', letterSpacing: 0.3 },
  toggleGroup: {
    flexDirection: 'row',
    borderRadius: 999, borderWidth: 1,
    overflow: 'hidden', padding: 3, gap: 2,
  },
  toggleBtn: {
    paddingHorizontal: 16, paddingVertical: 6,
    borderRadius: 999,
  },
  toggleBtnText: { fontSize: 12, fontWeight: '700' },
  // No images placeholder
  noImagesBox: {
    flex: 1, alignItems: 'center', justifyContent: 'center',
    padding: 32, gap: 16,
  },
  noImagesTitle: { fontSize: 16, fontWeight: '800', textAlign: 'center' },
  noImagesSub: {
    fontSize: 13, lineHeight: 20, textAlign: 'center', fontWeight: '400',
  },
  noImagesBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    paddingHorizontal: 20, paddingVertical: 12,
    borderRadius: 999, borderWidth: 1.5, marginTop: 8,
  },
  noImagesBtnText: { fontSize: 13, fontWeight: '700' },
});



export const NIGHT_PALETTE = NIGHT;
export { ysPdfSt };