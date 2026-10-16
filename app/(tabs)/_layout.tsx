import { NativeTabs } from 'expo-router/unstable-native-tabs';

import { useTranslation } from '@/core/i18n';

export default function TabLayout() {
  const { t } = useTranslation();

  return (
    <NativeTabs>
      <NativeTabs.Trigger name="index">
        <NativeTabs.Trigger.Label>{t('home.tab')}</NativeTabs.Trigger.Label>
        <NativeTabs.Trigger.Icon sf={{ default: 'house', selected: 'house.fill' }} md="home" />
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="explore">
        <NativeTabs.Trigger.Label>{t('explore.tab')}</NativeTabs.Trigger.Label>
        <NativeTabs.Trigger.Icon
          sf={{ default: 'safari', selected: 'safari.fill' }}
          md="explore"
        />
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="profile">
        <NativeTabs.Trigger.Label>{t('identity.tab')}</NativeTabs.Trigger.Label>
        <NativeTabs.Trigger.Icon
          sf={{ default: 'person.circle', selected: 'person.circle.fill' }}
          md="person"
        />
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="shows" hidden />
      <NativeTabs.Trigger name="catalog" hidden />
    </NativeTabs>
  );
}
