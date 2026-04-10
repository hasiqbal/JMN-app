import React from 'react';
import { View, Text } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';

type Props = {
  visible: boolean;
  label: string;
  timer: string;
  khutbahText: string;
  jamaatText: string;
  styles: any;
};

export default function JumuahCountdownBanner({
  visible,
  label,
  timer,
  khutbahText,
  jamaatText,
  styles,
}: Props) {
  if (!visible) return null;

  return (
    <View style={styles.jumuahCountdownBanner}>
      <MaterialIcons name="star" size={18} color="#F9A825" />
      <View style={{ flex: 1 }}>
        <Text style={styles.jumuahCountdownLabel}>{label}</Text>
        <Text style={styles.jumuahCountdownTimer}>{timer}</Text>
      </View>
      <View style={styles.jumuahCountdownTimes}>
        <Text style={styles.jumuahCountdownSub}>{khutbahText}</Text>
        <Text style={styles.jumuahCountdownSub}>{jamaatText}</Text>
      </View>
    </View>
  );
}
