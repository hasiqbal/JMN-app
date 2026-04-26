import React from 'react';
import { Animated, ImageBackground, StyleSheet, Text, View } from 'react-native';

export type HeroCountdownInfo = {
	label: string;
	value: string;
	note?: string;
	flash?: boolean;
};

type PrayerRow = {
	name: string;
	time?: string;
	iqamah?: string;
};

type Props = {
	visible?: boolean;
	embedded?: boolean;
	backgroundSource?: any;
	gradientColors?: readonly [string, string, ...string[]];
	backgroundImageOpacity?: number;
	heroWide?: boolean;
	kicker?: string;
	title?: string;
	isForbidden?: boolean;
	forbiddenEndsAt?: string;
	isFridayJumuahHero?: boolean;
	isEidHero?: boolean;
	athanValue?: string;
	j1?: string;
	j2?: string;
	eidJamaats?: string[];
	eidTomorrowJamaats?: string[];
	eidTomorrowLabel?: string;
	showJamaat?: boolean;
	jamaatValue?: string;
	countdownInfo?: HeroCountdownInfo;
	flashAnim?: Animated.Value;
	progress?: number;
	athanMarker?: number | null;
	jamaatMarker?: number | null;
	endMarker?: number | null;
	midMarker?: number | null;
	startLabel?: string;
	startTime?: string;
	endLabel?: string;
	endTime?: string;
	midLabel?: string;
	midTime?: string;
	timelinePoints?: Array<{ label: string; position: number }>;
	hasNext?: boolean;
	nextPrayerName?: string;
	nextPrayerTime?: string;
	nextPrayerJamaatValue?: string;
	prayerIcons?: Record<string, string>;
	localTime?: string;
	ampm?: string;
	seconds?: string;
	hijriLabel?: string;
	loadingHijri?: boolean;
	dayName?: string;
	dateShort?: string;
	allPrayers?: PrayerRow[];
};

export default function PrayerHeroCard({
	backgroundSource,
	kicker,
	title,
	countdownInfo,
	startLabel,
	startTime,
	endLabel,
	endTime,
	showJamaat,
	jamaatValue,
	hasNext,
	nextPrayerName,
	nextPrayerTime,
	eidTomorrowJamaats,
	eidTomorrowLabel,
}: Props) {
	return (
		<ImageBackground source={backgroundSource} style={styles.card} imageStyle={styles.bgImage}>
			<View style={styles.overlay}>
				{!!kicker && <Text style={styles.kicker}>{kicker}</Text>}
				<Text style={styles.title}>{title || 'Prayer'}</Text>

				<View style={styles.metaRow}>
					<Text style={styles.metaLabel}>{startLabel || 'Start'}</Text>
					<Text style={styles.metaValue}>{startTime || '--:--'}</Text>
					<Text style={styles.metaSeparator}>|</Text>
					<Text style={styles.metaLabel}>{endLabel || 'End'}</Text>
					<Text style={styles.metaValue}>{endTime || '--:--'}</Text>
				</View>

				{!!showJamaat && (
					<Text style={styles.jamaat}>Jamaat {jamaatValue || '--:--'}</Text>
				)}

				{!!countdownInfo && (
					<View style={styles.countdownWrap}>
						<Text style={styles.countdownLabel}>{countdownInfo.label}</Text>
						<Text style={styles.countdownValue}>{countdownInfo.value}</Text>
						{!!countdownInfo.note && <Text style={styles.note}>{countdownInfo.note}</Text>}
					</View>
				)}

				{!!eidTomorrowJamaats?.length && (
					<Text style={styles.next}>
						{eidTomorrowLabel || 'Tomorrow'}: {eidTomorrowJamaats.join(' · ')}
					</Text>
				)}

				{!!hasNext && (
					<Text style={styles.next}>Next: {nextPrayerName || '--'} {nextPrayerTime || '--:--'}</Text>
				)}
			</View>
		</ImageBackground>
	);
}

const styles = StyleSheet.create({
	card: {
		borderRadius: 16,
		overflow: 'hidden',
		minHeight: 188,
	},
	bgImage: {
		resizeMode: 'cover',
	},
	overlay: {
		flex: 1,
		backgroundColor: 'rgba(3,15,32,0.58)',
		paddingHorizontal: 14,
		paddingVertical: 12,
		gap: 6,
	},
	kicker: {
		color: '#D4E9FF',
		fontSize: 11,
		fontWeight: '700',
		letterSpacing: 0.3,
		textTransform: 'uppercase',
	},
	title: {
		color: '#FFFFFF',
		fontSize: 22,
		fontWeight: '900',
	},
	metaRow: {
		flexDirection: 'row',
		alignItems: 'center',
		gap: 5,
	},
	metaLabel: {
		color: '#B8D2E8',
		fontSize: 11,
		fontWeight: '700',
	},
	metaValue: {
		color: '#FFFFFF',
		fontSize: 13,
		fontWeight: '800',
	},
	metaSeparator: {
		color: 'rgba(255,255,255,0.55)',
	},
	jamaat: {
		color: '#FFE8A4',
		fontSize: 12,
		fontWeight: '800',
	},
	countdownWrap: {
		marginTop: 2,
		borderRadius: 10,
		paddingHorizontal: 10,
		paddingVertical: 8,
		backgroundColor: 'rgba(0,0,0,0.25)',
	},
	countdownLabel: {
		color: '#B8D2E8',
		fontSize: 10,
		fontWeight: '700',
		textTransform: 'uppercase',
	},
	countdownValue: {
		color: '#FFFFFF',
		fontSize: 20,
		fontWeight: '900',
	},
	note: {
		color: '#DCEAF7',
		fontSize: 11,
		marginTop: 2,
	},
	next: {
		marginTop: 4,
		color: '#DCEAF7',
		fontSize: 11,
		fontWeight: '700',
	},
});
