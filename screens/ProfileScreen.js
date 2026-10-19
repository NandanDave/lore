import { View, Text, ScrollView, StyleSheet } from 'react-native'
import useStore from '../store/useStore'
import ScreenBackground from '../components/ScreenBackground'
import { colors, typography, spacing, radius } from '../constants/design'
import { getLevelFromXp } from '../utils'

const DOMAIN_ORDER = ['Body', 'Mind', 'Craft', 'Relationships', 'Wealth', 'Purpose']
const MAX_SKIPS = 2

export default function ProfileScreen() {
  const profile = useStore((state) => state.profile)
  const character = useStore((state) => state.character)
  const domainScores = useStore((state) => state.domainScores)

  const xpData = getLevelFromXp(character?.xp ?? 0)
  const skips = profile?.skips_remaining ?? 0

  return (
    <ScreenBackground>
      <ScrollView contentContainerStyle={styles.container} showsVerticalScrollIndicator={false}>

        {/* Identity hero */}
        <View style={styles.hero}>
          <Text style={styles.username}>{profile?.username ?? '—'}</Text>
          {character?.archetype_name && (
            <Text style={styles.archetype}>{character.archetype_name}</Text>
          )}
          <View style={styles.spectrum}>
            {DOMAIN_ORDER.map((domain) => {
              const data = domainScores[domain]
              const score = typeof data === 'object' ? (data.score ?? 50) : (data || 50)
              return (
                <View
                  key={domain}
                  style={[
                    styles.spectrumBar,
                    { height: 8 + (score / 100) * 28, backgroundColor: colors.domains[domain] },
                  ]}
                />
              )
            })}
          </View>
        </View>

        {/* Account card */}
        <View style={styles.card}>
          <CardRow label="Account" value={profile?.is_premium ? 'Premium' : 'Free'} />
          <CardRow label="Level" value={String(xpData.level)} />
          <CardRow
            label="Quest Skips"
            last
            value={
              <View style={styles.skipsValue}>
                {Array.from({ length: MAX_SKIPS }).map((_, i) => (
                  <View
                    key={i}
                    style={[styles.skipDot, i < skips ? styles.skipDotActive : styles.skipDotUsed]}
                  />
                ))}
                <Text style={styles.skipsText}>{skips} of {MAX_SKIPS}</Text>
              </View>
            }
          />
        </View>

      </ScrollView>
    </ScreenBackground>
  )
}

function CardRow({ label, value, last }) {
  return (
    <View style={[styles.row, !last && styles.rowBorder]}>
      <Text style={styles.rowLabel}>{label}</Text>
      {typeof value === 'string' ? (
        <Text style={styles.rowValue}>{value}</Text>
      ) : (
        value
      )}
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flexGrow: 1,
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.xxl + spacing.lg,
    paddingBottom: spacing.xxl,
  },

  // Hero
  hero: {
    marginBottom: spacing.xxxl,
  },
  username: {
    fontSize: 40,
    fontWeight: typography.weights.bold,
    color: colors.textPrimary,
    letterSpacing: -0.5,
    marginBottom: spacing.xs,
  },
  archetype: {
    fontSize: typography.sizes.md,
    color: colors.textSecondary,
    marginBottom: spacing.xl,
  },
  spectrum: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 6,
    height: 36,
  },
  spectrumBar: {
    width: 5,
    borderRadius: 3,
    opacity: 0.75,
  },

  // Card
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: 0.5,
    borderColor: colors.border,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.lg,
  },
  rowBorder: {
    borderBottomWidth: 0.5,
    borderBottomColor: colors.border,
  },
  rowLabel: {
    fontSize: typography.sizes.md,
    color: colors.textSecondary,
  },
  rowValue: {
    fontSize: typography.sizes.md,
    color: colors.textPrimary,
    fontWeight: typography.weights.medium,
  },

  // Skips
  skipsValue: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  skipDot: {
    width: 8,
    height: 8,
    borderRadius: radius.full,
  },
  skipDotActive: {
    backgroundColor: colors.domains.Purpose,
  },
  skipDotUsed: {
    backgroundColor: colors.surfaceRaised,
    borderWidth: 1,
    borderColor: colors.border,
  },
  skipsText: {
    fontSize: typography.sizes.sm,
    color: colors.textMuted,
    marginLeft: spacing.xs,
  },
})
