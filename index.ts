import 'expo-router/entry';
import { Platform } from 'react-native';

if (Platform.OS === 'android') {
	try {
		const Constants = require('expo-constants').default;
		const isExpoGo = Constants?.appOwnership === 'expo';
		if (!isExpoGo) {
			const { registerWidgetTaskHandler } = require('react-native-android-widget');
			const { widgetTaskHandler } = require('./widgets/widget-task-handler');
			registerWidgetTaskHandler(widgetTaskHandler);
		}
	} catch {
		// Ignore when optional native widget runtime is unavailable.
	}
}
