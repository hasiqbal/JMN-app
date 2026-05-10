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
	timelinePoints?: { label: string; position: number }[];
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
	const timerParts = splitCountdownValue(countdownInfo?.value);

	return (
		<ImageBackground source={backgroundSource} style={styles.card} imageStyle={styles.bgImage}>
			<View style={styles.overlay}>
				<View style={styles.topRow}>
					{!!kicker && <Text style={styles.kicker}>{kicker}</Text>}
					{!!countdownInfo?.flash && <Text style={styles.liveBadge}>LIVE</Text>}
				</View>
				<Text style={styles.title}>{title || 'Prayer'}</Text>

				<View style={styles.metaPillsRow}>
					<View style={styles.metaPill}>
						<Text style={styles.metaLabel}>{startLabel || 'Start'}</Text>
						<Text style={styles.metaValue}>{startTime || '--:--'}</Text>
					</View>
					<View style={styles.metaPill}>
						<Text style={styles.metaLabel}>{endLabel || 'End'}</Text>
						<Text style={styles.metaValue}>{endTime || '--:--'}</Text>
					</View>
					{!!showJamaat && (
						<View style={styles.metaPillJamaat}>
							<Text style={styles.jamaatLabel}>Jamaat</Text>
							<Text style={styles.jamaatValue}>{jamaatValue || '--:--'}</Text>
						</View>
					)}
				</View>

				{!!countdownInfo && (
					<View style={[styles.countdownWrap, countdownInfo.flash && styles.countdownWrapFlash]}>
						<Text style={styles.countdownLabel}>{countdownInfo.label}</Text>
						<View style={styles.timerRow}>
							{timerParts ? (
								timerParts.map((part, index) => (
									<React.Fragment key={part.unit}>
										<View style={[styles.timerTile, countdownInfo.flash && styles.timerTileFlash]}>
											<Text style={[styles.timerDigits, countdownInfo.flash && styles.timerDigitsFlash]}>{part.value}</Text>
											<Text style={styles.timerUnit}>{part.unit}</Text>
										</View>
										{index < timerParts.length - 1 && (
											<View style={styles.timerSeparator}>
												<View style={styles.timerSeparatorDot} />
												<View style={styles.timerSeparatorDot} />
											</View>
										)}
									</React.Fragment>
								))
							) : (
								<Text style={[styles.countdownValue, countdownInfo.flash && styles.countdownValueFlash]}>{countdownInfo.value}</Text>
							)}
						</View>
						{!!countdownInfo.note && <Text style={styles.note}>{countdownInfo.note}</Text>}
					</View>
				)}

				<View style={styles.bottomRow}>
					{!!eidTomorrowJamaats?.length && (
						<Text style={styles.nextPill}>
							{eidTomorrowLabel || 'Tomorrow'}: {eidTomorrowJamaats.join(' · ')}
						</Text>
					)}

					{!!hasNext && (
						<Text style={styles.nextPill}>Next: {nextPrayerName || '--'} {nextPrayerTime || '--:--'}</Text>
					)}
				</View>
			</View>
		</ImageBackground>
	);
}

function splitCountdownValue(value?: string): { value: string; unit: string }[] | null {
	if (!value) return null;
	const match = value.match(/^(\d{2}):(\d{2}):(\d{2})$/);
	if (!match) return null;

	const [, hours, minutes, seconds] = match;
	return [
		{ value: hours, unit: 'HRS' },
		{ value: minutes, unit: 'MIN' },
		{ value: seconds, unit: 'SEC' },
	];
}

const styles = StyleSheet.create({
	card: {
		borderRadius: 16,
		overflow: 'hidden',
		minHeight: 235,
	},
	bgImage: {
		resizeMode: 'cover',
	},
	overlay: {
		flex: 1,
		backgroundColor: 'rgba(2,12,28,0.64)',
		paddingHorizontal: 14,
		paddingVertical: 14,
		gap: 8,
	},
	topRow: {
		flexDirection: 'row',
		alignItems: 'center',
		justifyContent: 'space-between',
	},
	kicker: {
		color: '#EAF5FF',
		fontSize: 10,
		fontWeight: '700',
		letterSpacing: 0.9,
		textTransform: 'uppercase',
		backgroundColor: 'rgba(12,36,64,0.65)',
		paddingHorizontal: 9,
		paddingVertical: 4,
		borderRadius: 999,
		overflow: 'hidden',
		borderWidth: 1,
		borderColor: 'rgba(198,223,242,0.28)',
	},
	liveBadge: {
		color: '#FFE7C5',
		fontSize: 10,
		fontWeight: '900',
		letterSpacing: 0.9,
		textTransform: 'uppercase',
		backgroundColor: 'rgba(84,33,9,0.82)',
		paddingHorizontal: 10,
		paddingVertical: 4,
		borderRadius: 999,
		borderWidth: 1,
		borderColor: 'rgba(255,196,124,0.58)',
	},
	title: {
		color: '#FFFFFF',
		fontSize: 28,
		fontWeight: '900',
		lineHeight: 31,
	},
	metaPillsRow: {
		flexDirection: 'row',
		alignItems: 'center',
		gap: 6,
		flexWrap: 'wrap',
	},
	metaPill: {
		borderRadius: 10,
		backgroundColor: 'rgba(8,29,53,0.58)',
		borderWidth: 1,
		borderColor: 'rgba(176,210,238,0.24)',
		paddingHorizontal: 10,
		paddingVertical: 7,
	},
	metaLabel: {
		color: '#AFC9DF',
		fontSize: 10,
		fontWeight: '700',
		textTransform: 'uppercase',
		letterSpacing: 0.45,
	},
	metaValue: {
		color: '#FFFFFF',
		fontSize: 15,
		fontWeight: '800',
	},
	metaPillJamaat: {
		borderRadius: 10,
		backgroundColor: 'rgba(78,60,15,0.66)',
		borderWidth: 1,
		borderColor: 'rgba(255,224,148,0.5)',
		paddingHorizontal: 10,
		paddingVertical: 7,
	},
	jamaatLabel: {
		color: '#FFE3A3',
		fontSize: 10,
		fontWeight: '700',
		textTransform: 'uppercase',
		letterSpacing: 0.45,
	},
	jamaatValue: {
		color: '#FFF3D6',
		fontSize: 15,
		fontWeight: '800',
	},
	countdownWrap: {
		marginTop: 2,
		borderRadius: 16,
		paddingHorizontal: 13,
		paddingTop: 12,
		paddingBottom: 11,
		backgroundColor: 'rgba(7,22,46,0.53)',
		borderWidth: 1,
		borderColor: 'rgba(188,221,248,0.24)',
	},
	countdownWrapFlash: {
		backgroundColor: 'rgba(59,25,10,0.6)',
		borderColor: 'rgba(255,196,124,0.58)',
	},
	countdownLabel: {
		color: '#D5E7F8',
		fontSize: 11,
		fontWeight: '700',
		letterSpacing: 0.8,
		textTransform: 'uppercase',
	},
	timerRow: {
		marginTop: 9,
		flexDirection: 'row',
		alignItems: 'center',
		justifyContent: 'space-between',
	},
	timerTile: {
		flex: 1,
		minHeight: 72,
		borderRadius: 13,
		backgroundColor: 'rgba(3,12,31,0.74)',
		borderWidth: 1,
		borderColor: 'rgba(193,229,255,0.28)',
		alignItems: 'center',
		justifyContent: 'center',
		paddingVertical: 8,
		shadowColor: '#011425',
		shadowOpacity: 0.3,
		shadowRadius: 10,
		shadowOffset: { width: 0, height: 6 },
		elevation: 3,
	},
	timerTileFlash: {
		backgroundColor: 'rgba(68,30,12,0.78)',
		borderColor: 'rgba(255,205,134,0.74)',
	},
	timerDigits: {
		color: '#FFFFFF',
		fontSize: 30,
		lineHeight: 34,
		fontWeight: '900',
		letterSpacing: 1.1,
		fontVariant: ['tabular-nums'],
	},
	timerDigitsFlash: {
		color: '#FFF0D3',
	},
	timerUnit: {
		marginTop: 2,
		color: '#C2DAEF',
		fontSize: 10,
		fontWeight: '700',
		letterSpacing: 0.8,
	},
	timerSeparator: {
		width: 10,
		alignItems: 'center',
		justifyContent: 'center',
		gap: 5,
	},
	timerSeparatorDot: {
		width: 5,
		height: 5,
		borderRadius: 3,
		backgroundColor: 'rgba(215,235,255,0.8)',
	},
	countdownValue: {
		color: '#FFFFFF',
		fontSize: 25,
		fontWeight: '900',
		marginTop: 6,
		letterSpacing: 1,
		fontVariant: ['tabular-nums'],
	},
	countdownValueFlash: {
		color: '#FFE1B5',
	},
	note: {
		color: '#EAF3FB',
		fontSize: 11,
		lineHeight: 16,
		marginTop: 9,
		paddingTop: 7,
		borderTopWidth: 1,
		borderTopColor: 'rgba(191,222,248,0.2)',
	},
	bottomRow: {
		marginTop: 2,
		flexDirection: 'row',
		flexWrap: 'wrap',
		gap: 6,
	},
	nextPill: {
		marginTop: 4,
		color: '#E5F2FC',
		fontSize: 11,
		fontWeight: '700',
		backgroundColor: 'rgba(8,30,53,0.56)',
		paddingHorizontal: 9,
		paddingVertical: 5,
		borderRadius: 999,
		borderWidth: 1,
		borderColor: 'rgba(191,222,248,0.22)',
	},
});
