const { withNotificationsAndroid } = require('expo-notifications/plugin/build/withNotificationsAndroid');

/**
 * Android notification icon/color from expo-notifications, without iOS push entitlements.
 * Local iOS notifications (scheduleNotificationAsync) do not require aps-environment.
 */
function expoNotificationsLocalOnly(config, props) {
  return withNotificationsAndroid(config, props ?? {});
}

module.exports = expoNotificationsLocalOnly;
