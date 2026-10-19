import { View, Text, ScrollView, StyleSheet, TouchableOpacity } from 'react-native'
import { useState } from 'react'
import ScreenBackground from '../components/ScreenBackground'
import { colors, typography, spacing, radius } from '../constants/design'
import useStore from '../store/useStore'
import { getLevelFromXp } from '../utils'

const MOCK_CHARACTER = {
  archetype_name: 'The Calibrated Builder',
  archetype_description: 'You operate from a foundation most people spend years trying to build. Your systems work because you\'ve already done the thinking. But there\'s a weight to living this consistently that you don\'t name.',
  hp: 100,
  xp: 0,
  level: 1,
  passive_traits: [
    { name: 'Sustained Execution', description: 'Maintains forward momentum across multiple domains without visible strain.' },
    { name: 'Reset Protocol', description: 'Requires solitude after social engagement to return to baseline.' },
    { name: 'Systems Thinking', description: 'Approaches problems by building repeatable structures rather than relying on motivation.' },
  ],
  shadow_state: 'The danger isn\'t burnout. It\'s the slow conversion of your life into a machine that runs beautifully but no longer knows what it\'s running toward.',
}

const MOCK_DOMAIN_SCORES = {
  Body: { score: 82, description: 'You move through physical challenge the way most people move through their morning routine.' },
  Mind: { score: 85, description: 'You structure time and attention with intention that borders on architecture.' },
  Craft: { score: 84, description: 'You\'re actively making things that meet your own standards, which is rarer than it sounds.' },
  Relationships: { score: 78, description: 'You\'ve built an inner circle that actually functions.' },
  Wealth: { score: 81, description: 'Your financial system works because you made it work.' },
  Purpose: { score: 80, description: 'You\'re building something meaningful over time.' },
}

function DomainBar({ domain, data, expanded, onPress }) {
  const domainColor = colors.domains[domain]
  const score = typeof data === 'object' ? data.score : data
  const description = typeof data === 'object' ? data.description : null

  return (
    <TouchableOpacity onPress={onPress} activeOpacity={0.7}>
      <View style={styles.domainRow}>
        <Text style={styles.domainLabel}>{domain}</Text>
        <View style={styles.barBackground}>
          <View
            style={[
              styles.barFill,
              { width: `${score}%`, backgroundColor: domainColor },
            ]}
          />
        </View>
        <Text style={[styles.domainScore, { color: domainColor }]}>{score}</Text>
        <Text style={[styles.domainChevron, expanded && { color: domainColor }]}>
          {expanded ? '∧' : '∨'}
        </Text>
      </View>
      {expanded && (
        <View style={[styles.domainDescription, { borderLeftColor: domainColor }]}>
          <Text style={styles.domainDescriptionText}>
            {description ?? 'No description available for this domain yet.'}
          </Text>
        </View>
      )}
    </TouchableOpacity>
  )
}

export default function CharacterScreen() {
  const character = useStore((state) => state.character) ?? MOCK_CHARACTER
  const domainScores = useStore((state) => state.domainScores)
  const [expandedDomain, setExpandedDomain] = useState(null)

  const scores = Object.values(domainScores).every((v) =>
    (typeof v === 'object' ? v.score : v) === 0
  ) ? MOCK_DOMAIN_SCORES : domainScores

  const xpData = getLevelFromXp(character.xp ?? 0)
  const xpProgress = xpData.currentLevelXp / xpData.nextLevelXp

  function toggleDomain(domain) {
    setExpandedDomain(expandedDomain === domain ? null : domain)
  }

return (
    <ScreenBackground>
      <ScrollView contentContainerStyle={styles.container}>

        <View style={styles.header}>
          <Text style={styles.levelLabel}>LEVEL {xpData.level}</Text>
          <Text style={styles.archetype}>{character.archetype_name}</Text>

          <View style={styles.hpStrip}>
            <View style={styles.hpBarBackground}>
              <View
                style={[
                  styles.hpBarFill,
                  { width: `${Math.min(character.hp ?? 100, 100)}%` },
                ]}
              />
            </View>
            <View style={styles.xpLabels}>
              <Text style={styles.xpText}>{character.hp ?? 100} HP</Text>
            </View>
          </View>

          <View style={styles.xpStrip}>
            <View style={styles.xpBarBackground}>
              <View
                style={[
                  styles.xpBarFill,
                  { width: `${Math.min(xpProgress * 100, 100)}%` },
                ]}
              />
            </View>
            <View style={styles.xpLabels}>
              <Text style={styles.xpText}>{xpData.currentLevelXp} XP</Text>
              <Text style={styles.xpText}>{xpData.nextLevelXp} XP to level {xpData.level + 1}</Text>
            </View>
          </View>
        </View>

        <Text style={styles.description}>{character.archetype_description}</Text>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>DOMAINS</Text>
          <Text style={styles.sectionHint}>Tap a domain to expand</Text>
          {Object.entries(scores).map(([domain, data]) => (
            <DomainBar
              key={domain}
              domain={domain}
              data={data}
              expanded={expandedDomain === domain}
              onPress={() => toggleDomain(domain)}
            />
          ))}
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>PASSIVE TRAITS</Text>
          {character.passive_traits.map((trait, index) => (
            <View key={index} style={styles.traitRow}>
              <View style={styles.traitDot} />
              <View style={styles.traitContent}>
                <Text style={styles.traitName}>
                  {typeof trait === 'object' ? trait.name : trait}
                </Text>
                {typeof trait === 'object' && trait.description && (
                  <Text style={styles.traitDescription}>{trait.description}</Text>
                )}
              </View>
            </View>
          ))}
        </View>

        {character.shadow_state && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>DRIFT PATTERN</Text>
            <View style={styles.shadowCard}>
              <Text style={styles.shadowText}>{character.shadow_state}</Text>
            </View>
          </View>
        )}

      </ScrollView>
    </ScreenBackground>
  )
}

const styles = StyleSheet.create({
  container: {
    flexGrow: 1,
    padding: spacing.xl,
    paddingTop: spacing.xxl,
  },
  header: {
    marginBottom: spacing.xl,
  },
  levelLabel: {
    fontSize: typography.sizes.xs,
    color: colors.textMuted,
    letterSpacing: typography.tracking.widest,
    marginBottom: spacing.sm,
  },
  archetype: {
    fontSize: typography.sizes.xxl,
    fontWeight: typography.weights.bold,
    color: colors.textPrimary,
    lineHeight: 36,
    marginBottom: spacing.lg,
  },
  xpStrip: {
    gap: spacing.xs,
  },
  xpBarBackground: {
    height: 2,
    backgroundColor: colors.surfaceRaised,
    borderRadius: radius.full,
    overflow: 'hidden',
  },
  xpBarFill: {
    height: '100%',
    backgroundColor: colors.domains.Purpose,
    borderRadius: radius.full,
  },
  xpLabels: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  xpText: {
    fontSize: typography.sizes.xs,
    color: colors.textMuted,
  },
  divider: {
    height: 0.5,
    backgroundColor: colors.border,
    marginBottom: spacing.xl,
  },
  description: {
    fontSize: typography.sizes.md,
    color: colors.textSecondary,
    lineHeight: 26,
    marginBottom: spacing.xxl,
  },
  section: {
    marginBottom: spacing.xxl,
  },
  sectionTitle: {
    fontSize: typography.sizes.xs,
    color: colors.textMuted,
    letterSpacing: typography.tracking.widest,
    marginBottom: spacing.xs,
  },
  sectionHint: {
    fontSize: typography.sizes.xs,
    color: colors.textMuted,
    marginBottom: spacing.lg,
    opacity: 0.6,
  },
  domainRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  domainLabel: {
    width: 110,
    fontSize: typography.sizes.sm,
    color: colors.textSecondary,
  },
  barBackground: {
    flex: 1,
    height: 4,
    backgroundColor: colors.surfaceRaised,
    borderRadius: radius.full,
    overflow: 'hidden',
  },
  barFill: {
    height: '100%',
    borderRadius: radius.full,
  },
  domainScore: {
    width: 32,
    fontSize: typography.sizes.sm,
    textAlign: 'right',
    fontWeight: typography.weights.medium,
  },
  domainChevron: {
    width: 16,
    fontSize: typography.sizes.xs,
    textAlign: 'right',
    color: colors.textMuted,
    marginLeft: spacing.xs,
  },
  domainDescription: {
    borderLeftWidth: 2,
    paddingLeft: spacing.md,
    marginBottom: spacing.lg,
    marginLeft: 110,
  },
  domainDescriptionText: {
    fontSize: typography.sizes.sm,
    color: colors.textSecondary,
    lineHeight: 22,
  },
  traitRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: spacing.lg,
    gap: spacing.md,
  },
  traitDot: {
    width: 4,
    height: 4,
    borderRadius: radius.full,
    backgroundColor: colors.textMuted,
    marginTop: 8,
  },
  traitContent: {
    flex: 1,
  },
  traitName: {
    fontSize: typography.sizes.md,
    color: colors.textPrimary,
    fontWeight: typography.weights.semibold,
    marginBottom: spacing.xs,
  },
  traitDescription: {
    fontSize: typography.sizes.sm,
    color: colors.textSecondary,
    lineHeight: 20,
  },
  shadowCard: {
    backgroundColor: colors.surface,
    borderWidth: 0.5,
    borderColor: colors.border,
    borderRadius: radius.lg,
    padding: spacing.lg,
  },
  shadowText: {
    fontSize: typography.sizes.md,
    color: colors.textSecondary,
    lineHeight: 26,
  },
  hpStrip: {
    gap: spacing.xs,
    marginBottom: spacing.md,
  },
  hpBarBackground: {
    height: 2,
    backgroundColor: colors.surfaceRaised,
    borderRadius: radius.full,
    overflow: 'hidden',
  },
  hpBarFill: {
    height: '100%',
    backgroundColor: colors.danger,
    borderRadius: radius.full,
  },
})