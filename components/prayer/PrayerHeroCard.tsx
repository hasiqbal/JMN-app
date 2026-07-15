import React from 'react';
import { Animated, ImageBackground, StyleSheet, Text, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';

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
	localTime,
	ampm,
	dayName,
	dateShort,
	hijriLabel,
	hasNext,
	nextPrayerName,
	nextPrayerTime,
	eidTomorrowJamaats,
	eidTomorrowLabel,
}: Props) {
	const timerParts = splitCountdownValue(countdownInfo?.value);

	return (
		<ImageBackground source={backgroundSource} style={styles.card} imageStyle={styles.bgImage}>
			<LinearGradient
				colors={['rgba(3, 14, 30, 0.12)', 'rgba(3, 10, 24, 0.82)']}
				start={{ x: 0.5, y: 0 }}
				end={{ x: 0.5, y: 1 }}
				style={styles.overlay}
			>
				<View style={styles.topRow}>
					<View style={styles.topLeftGroup}>
						{!!kicker && <Text style={styles.kicker}>{kicker}</Text>}
						{!!countdownInfo?.flash && <View style={styles.livePill}><Text style={styles.liveBadge}>Live</Text></View>}
					</View>
					<View style={styles.topRightGroup}>
						{(localTime || ampm) && (
							<View style={styles.timePill}>
								{!!localTime && <Text style={styles.timeLabel}>{localTime}</Text>}
								{!!ampm && <Text style={styles.timeAmpm}>{ampm}</Text>}
							</View>
						)}
					</View>
				</View>

				<View style={styles.headerBlock}>
					<Text style={styles.title}>{title || 'Prayer'}</Text>
					<Text style={styles.subtitle}>
						{[dayName, dateShort, hijriLabel].filter(Boolean).join(' • ')}
					</Text>
				</View>

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
			</LinearGradient>
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
		borderRadius: 24,
		overflow: 'hidden',
		minHeight: 250,
		borderWidth: 1,
		borderColor: 'rgba(255,255,255,0.16)',
	},
	bgImage: {
		resizeMode: 'cover',
	},
	overlay: {
		flex: 1,
		paddingHorizontal: 15,
		paddingVertical: 15,
		justifyContent: 'space-between',
	},
	topRow: {
		flexDirection: 'row',
		alignItems: 'flex-start',
		justifyContent: 'space-between',
	},
	topLeftGroup: {
		flexDirection: 'row',
		alignItems: 'center',
		gap: 8,
		flexWrap: 'wrap',
	},
	topRightGroup: {
		alignItems: 'flex-end',
	},
	kicker: {
		color: '#F3FBFF',
		fontSize: 10,
		fontWeight: '800',
		letterSpacing: 0.9,
		textTransform: 'uppercase',
		backgroundColor: 'rgba(255,255,255,0.12)',
		paddingHorizontal: 9,
		paddingVertical: 4,
		borderRadius: 999,
		overflow: 'hidden',
		borderWidth: 1,
		borderColor: 'rgba(255,255,255,0.16)',
	},
	livePill: {
		backgroundColor: 'rgba(120, 46, 10, 0.75)',
		paddingHorizontal: 8,
		paddingVertical: 4,
		borderRadius: 999,
		borderWidth: 1,
		borderColor: 'rgba(255, 204, 128, 0.42)',
	},
	liveBadge: {
		color: '#FFE6BE',
		fontSize: 10,
		fontWeight: '800',
		letterSpacing: 0.9,
		textTransform: 'uppercase',
	},
	timePill: {
		flexDirection: 'row',
		alignItems: 'baseline',
		gap: 4,
		paddingHorizontal: 8,
		paddingVertical: 5,
		borderRadius: 999,
		backgroundColor: 'rgba(255,255,255,0.12)',
		borderWidth: 1,
		borderColor: 'rgba(255,255,255,0.16)',
	},
	timeLabel: {
		color: '#FFFFFF',
		fontSize: 12,
		fontWeight: '700',
	},
	timeAmpm: {
		color: '#CDE7F7',
		fontSize: 10,
		fontWeight: '700',
		letterSpacing: 0.8,
		textTransform: 'uppercase',
	},
	headerBlock: {
		gap: 4,
	},
	title: {
		color: '#FFFFFF',
		fontSize: 27,
		fontWeight: '800',
		lineHeight: 31,
		letterSpacing: 0.2,
	},
	subtitle: {
		color: 'rgba(233, 243, 249, 0.84)',
		fontSize: 11.5,
		fontWeight: '600',
		letterSpacing: 0.2,
	},
	metaPillsRow: {
		flexDirection: 'row',
		alignItems: 'center',
		gap: 7,
		flexWrap: 'wrap',
		marginTop: 2,
	},
	metaPill: {
		borderRadius: 10,
		backgroundColor: 'rgba(255,255,255,0.10)',
		borderWidth: 1,
		borderColor: 'rgba(255,255,255,0.16)',
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
		backgroundColor: 'rgba(115,80,24,0.46)',
		borderWidth: 1,
		borderColor: 'rgba(255,223,160,0.42)',
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
		marginTop: 3,
		borderRadius: 16,
		paddingHorizontal: 13,
		paddingTop: 12,
		paddingBottom: 11,
		backgroundColor: 'rgba(7,22,46,0.42)',
		borderWidth: 1,
		borderColor: 'rgba(255,255,255,0.15)',
	},
	countdownWrapFlash: {
		backgroundColor: 'rgba(59,25,10,0.54)',
		borderColor: 'rgba(255,196,124,0.5)',
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
		borderTopColor: 'rgba(191,222,248,0.18)',
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
		backgroundColor: 'rgba(255,255,255,0.10)',
		paddingHorizontal: 9,
		paddingVertical: 5,
		borderRadius: 999,
		borderWidth: 1,
		borderColor: 'rgba(255,255,255,0.14)',
	},
});
