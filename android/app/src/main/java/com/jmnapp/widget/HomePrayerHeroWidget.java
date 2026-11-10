package com.jmnapp.widget;

import android.appwidget.AppWidgetManager;
import android.content.ComponentName;
import android.content.Context;
import android.content.Intent;

import com.reactnativeandroidwidget.RNWidgetProvider;

public class HomePrayerHeroWidget extends RNWidgetProvider {
    @Override
    public void onReceive(Context context, Intent intent) {
        super.onReceive(context, intent);

        String action = intent.getAction();
        if (!Intent.ACTION_DATE_CHANGED.equals(action)
            && !Intent.ACTION_TIME_CHANGED.equals(action)
            && !Intent.ACTION_TIMEZONE_CHANGED.equals(action)
            && !Intent.ACTION_BOOT_COMPLETED.equals(action)) {
            return;
        }

        AppWidgetManager manager = AppWidgetManager.getInstance(context);
        int[] widgetIds = manager.getAppWidgetIds(new ComponentName(context, HomePrayerHeroWidget.class));
        if (widgetIds.length > 0) {
            onUpdate(context, manager, widgetIds);
        }
    }
}
