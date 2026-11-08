import { Ionicons } from '@expo/vector-icons';
import { Tabs } from 'expo-router';
import { strings } from '@/shared/i18n/strings';
import { useTheme } from '@/shared/theme';

type IconName = React.ComponentProps<typeof Ionicons>['name'];

const TABS: { name: string; title: string; icon: IconName }[] = [
  { name: 'index', title: strings.tabs.stories, icon: 'newspaper-outline' },
  { name: 'search', title: strings.tabs.search, icon: 'search-outline' },
  { name: 'bookmarks', title: strings.tabs.saved, icon: 'bookmark-outline' },
  { name: 'history', title: strings.tabs.history, icon: 'time-outline' },
  { name: 'settings', title: strings.tabs.settings, icon: 'settings-outline' },
];

export default function TabsLayout() {
  const { colors } = useTheme();
  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: colors.accent,
        tabBarInactiveTintColor: colors.textMuted,
        tabBarStyle: { backgroundColor: colors.surface, borderTopColor: colors.border },
        headerStyle: { backgroundColor: colors.surface },
        headerTintColor: colors.text,
        sceneStyle: { backgroundColor: colors.background },
      }}
    >
      {TABS.map((t) => (
        <Tabs.Screen
          key={t.name}
          name={t.name}
          options={{
            title: t.title,
            tabBarButtonTestID: `tab-${t.name}`,
            tabBarIcon: ({ color, size }) => <Ionicons name={t.icon} color={color as string} size={size} />,
          }}
        />
      ))}
    </Tabs>
  );
}
