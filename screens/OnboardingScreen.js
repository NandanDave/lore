import { useState, useRef, useEffect } from 'react'
import { View, Text, TouchableOpacity, StyleSheet, FlatList, useWindowDimensions, Animated } from 'react-native'
import ScreenBackground from '../components/ScreenBackground'
import { colors, typography, spacing, radius } from '../constants/design'

const CARDS = [
  {
    lines: ['Something is about to change.', 'Not out there. In here.'],
  },
  {
    lines: ["We're going to ask you some questions.", "Answer like no one's watching the answers. They're not for us."],
  },
  {
    lines: ['A character forms from what you tell us.', "Just the opening line. The story's yours."],
  },
  {
    lines: ["From here, it's on you.", "Small quests. Real changes. We'll keep score.", 'Ready?'],
  },
]

function AnimatedLine({ text, index, isFirst, active }) {
  const opacity = useRef(new Animated.Value(0)).current
  const translateY = useRef(new Animated.Value(16)).current

  useEffect(() => {
    if (active) {
      opacity.setValue(0)
      translateY.setValue(16)
      Animated.parallel([
        Animated.timing(opacity, {
          toValue: 1,
          duration: 600,
          delay: index * 200,
          useNativeDriver: true,
        }),
        Animated.timing(translateY, {
          toValue: 0,
          duration: 600,
          delay: index * 200,
          useNativeDriver: true,
        }),
      ]).start()
    } else {
      opacity.setValue(0)
    }
  }, [active])

  return (
    <Animated.Text
      style={[
        isFirst ? styles.lineHeading : styles.lineBody,
        { opacity, transform: [{ translateY }] },
      ]}
    >
      {text}
    </Animated.Text>
  )
}

export default function OnboardingScreen({ onComplete }) {
  const { width } = useWindowDimensions()
  const [index, setIndex] = useState(0)
  const listRef = useRef(null)

  const isLast = index === CARDS.length - 1

  function handleNext() {
    if (isLast) {
      onComplete()
      return
    }
    listRef.current?.scrollToIndex({ index: index + 1, animated: true })
  }

  function handleScroll(event) {
    const newIndex = Math.round(event.nativeEvent.contentOffset.x / width)
    if (newIndex !== index) setIndex(newIndex)
  }

  return (
    <ScreenBackground>
      <View style={styles.container}>
        <FlatList
          ref={listRef}
          data={CARDS}
          keyExtractor={(_, i) => String(i)}
          horizontal
          pagingEnabled
          showsHorizontalScrollIndicator={false}
          onMomentumScrollEnd={handleScroll}
          renderItem={({ item, index: cardIndex }) => (
            <View style={[styles.card, { width }]}>

              {/* Chapter marker — decorative, almost invisible */}
              <Text style={styles.chapterNumber}>
                {String(cardIndex + 1).padStart(2, '0')}
              </Text>

              {/* Text content anchored to the bottom of the card */}
              <View style={styles.cardContent}>
                <View style={styles.accentLine} />
                {item.lines.map((line, i) => (
                  <AnimatedLine
                    key={i}
                    text={line}
                    index={i}
                    isFirst={i === 0}
                    active={cardIndex === index}
                  />
                ))}
              </View>

            </View>
          )}
        />

        <View style={styles.footer}>
          <View style={styles.segments}>
            {CARDS.map((_, i) => (
              <View
                key={i}
                style={[
                  styles.segment,
                  i === index ? styles.segmentActive : styles.segmentInactive,
                ]}
              />
            ))}
          </View>

          <TouchableOpacity
            style={isLast ? styles.primaryButton : styles.outlineButton}
            onPress={handleNext}
            activeOpacity={0.85}
          >
            <Text style={isLast ? styles.primaryButtonText : styles.outlineButtonText}>
              {isLast ? 'Begin' : 'Next'}
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    </ScreenBackground>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  card: {
    flex: 1,
    paddingHorizontal: spacing.xl,
    paddingTop: 48,
    paddingBottom: spacing.xl,
    justifyContent: 'space-between',
  },
  chapterNumber: {
    fontSize: 96,
    fontWeight: typography.weights.bold,
    color: colors.textPrimary,
    lineHeight: 96,
    letterSpacing: -2,
    opacity: 0.07,
  },
  cardContent: {
    // Content sits at the bottom of the card
  },
  accentLine: {
    width: 32,
    height: 1.5,
    backgroundColor: colors.domains.Purpose,
    marginBottom: spacing.lg,
  },
  lineHeading: {
    fontSize: typography.sizes.xxl,
    color: colors.textPrimary,
    fontWeight: typography.weights.bold,
    lineHeight: typography.sizes.xxl * 1.3,
    marginBottom: spacing.lg,
  },
  lineBody: {
    fontSize: typography.sizes.lg,
    color: colors.textSecondary,
    fontWeight: typography.weights.regular,
    lineHeight: typography.sizes.lg * 1.6,
    marginBottom: spacing.sm,
  },
  footer: {
    paddingHorizontal: spacing.xl,
    paddingBottom: spacing.xxl,
    gap: spacing.xl,
  },
  segments: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  segment: {
    height: 2,
    borderRadius: radius.full,
  },
  segmentActive: {
    width: 24,
    backgroundColor: colors.domains.Purpose,
  },
  segmentInactive: {
    width: 8,
    backgroundColor: colors.border,
  },
  primaryButton: {
    backgroundColor: colors.textPrimary,
    paddingVertical: spacing.lg + 2,
    borderRadius: radius.md,
    alignItems: 'center',
  },
  primaryButtonText: {
    color: colors.background,
    fontSize: typography.sizes.md,
    fontWeight: typography.weights.semibold,
    letterSpacing: 0.5,
  },
  outlineButton: {
    borderWidth: 0.5,
    borderColor: '#333333',
    paddingVertical: spacing.lg + 2,
    borderRadius: radius.md,
    alignItems: 'center',
  },
  outlineButtonText: {
    color: colors.textSecondary,
    fontSize: typography.sizes.md,
    letterSpacing: 0.5,
  },
})


// ─── PREVIOUS CODE (v1 — original) ───────────────────────────────────────────
//
// import { useState, useRef, useEffect } from 'react'
// import { View, Text, TouchableOpacity, StyleSheet, FlatList, useWindowDimensions, Animated } from 'react-native'
// import ScreenBackground from '../components/ScreenBackground'
// import { colors, typography, spacing, radius } from '../constants/design'
//
// const CARDS = [
//   { lines: ['Something is about to change.', 'Not out there. In here.'] },
//   { lines: ["We're going to ask you some questions.", "Answer like no one's watching the answers. They're not for us."] },
//   { lines: ['A character forms from what you tell us.', "Just the opening line. The story's yours."] },
//   { lines: ["From here, it's on you.", "Small quests. Real changes. We'll keep score.", 'Ready?'] },
// ]
//
// function AnimatedLine({ text, index, isFirst, active }) {
//   const opacity = useRef(new Animated.Value(0)).current
//   const translateY = useRef(new Animated.Value(12)).current
//   useEffect(() => {
//     if (active) {
//       opacity.setValue(0)
//       translateY.setValue(12)
//       Animated.parallel([
//         Animated.timing(opacity, { toValue: 1, duration: 450, delay: index * 180, useNativeDriver: true }),
//         Animated.timing(translateY, { toValue: 0, duration: 450, delay: index * 180, useNativeDriver: true }),
//       ]).start()
//     } else {
//       opacity.setValue(0)
//     }
//   }, [active])
//   return (
//     <Animated.Text style={[isFirst ? styles.lineHeading : styles.lineBody, { opacity, transform: [{ translateY }] }]}>
//       {text}
//     </Animated.Text>
//   )
// }
//
// export default function OnboardingScreen({ onComplete }) {
//   const { width } = useWindowDimensions()
//   const [index, setIndex] = useState(0)
//   const listRef = useRef(null)
//   const isLast = index === CARDS.length - 1
//   function handleNext() {
//     if (isLast) { onComplete(); return }
//     listRef.current?.scrollToIndex({ index: index + 1, animated: true })
//   }
//   function handleScroll(event) {
//     const newIndex = Math.round(event.nativeEvent.contentOffset.x / width)
//     if (newIndex !== index) setIndex(newIndex)
//   }
//   return (
//     <ScreenBackground>
//       <View style={styles.container}>
//         <FlatList ref={listRef} data={CARDS} keyExtractor={(_, i) => String(i)} horizontal pagingEnabled showsHorizontalScrollIndicator={false} onMomentumScrollEnd={handleScroll}
//           renderItem={({ item, index: cardIndex }) => (
//             <View style={[styles.card, { width }]}>
//               {item.lines.map((line, i) => (
//                 <AnimatedLine key={i} text={line} index={i} isFirst={i === 0} active={cardIndex === index} />
//               ))}
//             </View>
//           )}
//         />
//         <View style={styles.footer}>
//           <View style={styles.dots}>
//             {CARDS.map((_, i) => (<View key={i} style={[styles.dot, i === index && styles.dotActive]} />))}
//           </View>
//           <TouchableOpacity style={styles.button} onPress={handleNext}>
//             <Text style={styles.buttonText}>{isLast ? 'Begin' : 'Next'}</Text>
//           </TouchableOpacity>
//         </View>
//       </View>
//     </ScreenBackground>
//   )
// }
//
// const styles = StyleSheet.create({
//   container: { flex: 1 },
//   card: { flex: 1, justifyContent: 'center', paddingHorizontal: spacing.xl },
//   lineHeading: { fontSize: typography.sizes.xxl, color: colors.textPrimary, fontWeight: typography.weights.bold, letterSpacing: typography.tracking.tight, lineHeight: typography.sizes.xxl * 1.3, marginBottom: spacing.lg },
//   lineBody: { fontSize: typography.sizes.lg, color: colors.textSecondary, fontWeight: typography.weights.regular, letterSpacing: typography.tracking.normal, lineHeight: typography.sizes.lg * 1.5, marginBottom: spacing.sm },
//   footer: { paddingHorizontal: spacing.xl, paddingBottom: spacing.xxl, gap: spacing.xl },
//   dots: { flexDirection: 'row', justifyContent: 'center', gap: spacing.sm },
//   dot: { width: 6, height: 6, borderRadius: radius.full, backgroundColor: colors.border },
//   dotActive: { backgroundColor: colors.domains.Purpose, width: 18 },
//   button: { backgroundColor: colors.textPrimary, paddingVertical: spacing.lg, borderRadius: radius.md, alignItems: 'center' },
//   buttonText: { color: colors.background, fontSize: typography.sizes.md, fontWeight: typography.weights.semibold },
// })
