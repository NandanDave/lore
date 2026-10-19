import { createBottomTabNavigator } from '@react-navigation/bottom-tabs'
import { View, Text, StyleSheet } from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import CharacterScreen from './screens/CharacterScreen'
import QuestScreen from './screens/QuestScreen'
import ProfileScreen from './screens/ProfileScreen'
import { colors } from './constants/design'

const Tab = createBottomTabNavigator()

const TAB_CONFIG = {
  Character: { icon: 'shield',  iconOutline: 'shield-outline' },
  Quests:    { icon: 'map',     iconOutline: 'map-outline' },
  Profile:   { icon: 'person',  iconOutline: 'person-outline' },
}

function TabItem({ label, focused }) {
  const { icon, iconOutline } = TAB_CONFIG[label]
  const color = focused ? colors.textPrimary : '#3a3a3a'

  return (
    <View style={styles.tabItem}>
      {focused && <View style={styles.indicator} />}
      <Ionicons name={focused ? icon : iconOutline} size={20} color={color} />
      <Text style={[styles.tabLabel, { color }]} numberOfLines={1}>{label.toUpperCase()}</Text>
    </View>
  )
}

export default function MainTabs() {
  const insets = useSafeAreaInsets()

  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarShowLabel: false,
        tabBarStyle: {
          backgroundColor: colors.background,
          borderTopWidth: 0.5,
          borderTopColor: colors.border,
          height: 56 + insets.bottom,
          paddingBottom: insets.bottom,
          paddingTop: 0,
        },
        tabBarIcon: ({ focused }) => (
          <TabItem label={route.name} focused={focused} />
        ),
      })}
    >
      <Tab.Screen name="Character" component={CharacterScreen} />
      <Tab.Screen name="Quests" component={QuestScreen} />
      <Tab.Screen name="Profile" component={ProfileScreen} />
    </Tab.Navigator>
  )
}

const styles = StyleSheet.create({
  tabItem: {
    alignItems: 'center',
    paddingTop: 14,
    gap: 4,
    width: 80,
  },
  indicator: {
    position: 'absolute',
    top: 0,
    width: 24,
    height: 1.5,
    backgroundColor: colors.domains.Purpose,
    borderRadius: 1,
  },
  tabLabel: {
    fontSize: 9,
    letterSpacing: 1.5,
    fontWeight: '600',
  },
})
