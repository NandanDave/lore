import { NavigationContainer } from '@react-navigation/native'
import { createNativeStackNavigator } from '@react-navigation/native-stack'
import { useEffect, useState } from 'react'
import * as SplashScreen from 'expo-splash-screen'
import { supabase } from './supabase'
import useStore from './store/useStore'

import LoadingScreen from './components/LoadingScreen'
import MainTabs from './MainTabs'
import OnboardingScreen from './screens/OnboardingScreen'
import WelcomeScreen from './screens/WelcomeScreen'
import SignUpScreen from './screens/SignUpScreen'
import LoginScreen from './screens/LoginScreen'
import QuizScreen from './screens/QuizScreen'
import DebriefScreen from './screens/DebriefScreen'
import LevelUpScreen from './screens/LevelUpScreen'
import FeedbackScreen from './screens/FeedbackScreen'

const Stack = createNativeStackNavigator()

export default function App() {
  const [session, setSession] = useState(null)
  const [loading, setLoading] = useState(true)
  const [onboardingComplete, setOnboardingComplete] = useState(false)
  const [showOnboardingIntro, setShowOnboardingIntro] = useState(true)
  const profile = useStore((state) => state.profile)

  const setUser = useStore((state) => state.setUser)
  const setProfile = useStore((state) => state.setProfile)
  const setCharacter = useStore((state) => state.setCharacter)
  const setDomainScores = useStore((state) => state.setDomainScores)
  const reset = useStore((state) => state.reset)
  const setIsDrifting = useStore((state) => state.setIsDrifting)
  const setDriftIntroSeen = useStore((state) => state.setDriftIntroSeen)

  // Hand off from the native splash to our own LoadingScreen (which now carries
  // the diagnostic step text) as soon as we've mounted, instead of waiting on
  // expo-splash-screen's own readiness heuristic to decide when to reveal it.
  useEffect(() => {
    SplashScreen.hideAsync().catch(() => {})
  }, [])

  useEffect(() => {
    let active = true

    const fallbackTimer = setTimeout(() => {
      if (active) setLoading(false)
    }, 8000)

    ;(async () => {
      let sessionResult
      try {
        sessionResult = await supabase.auth.getSession()
      } catch (e) {
        if (!active) return
        clearTimeout(fallbackTimer)
        setLoading(false)
        return
      }

      if (!active) return
      const { data: { session } } = sessionResult
      setSession(session)

      if (session) {
        setUser(session.user)
        // fallbackTimer stays armed until checkOnboarding's queries actually
        // settle — clearing it here would leave a hung/slow query with no
        // safety net and the app stuck on the loading screen forever.
        checkOnboarding(session.user.id).finally(() => {
          if (active) clearTimeout(fallbackTimer)
        })
      } else {
        clearTimeout(fallbackTimer)
        setShowOnboardingIntro(true)
        setLoading(false)
      }
    })()

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!active) return
      setSession(session)
      if (session) {
        setUser(session.user)
        checkOnboarding(session.user.id)
      } else {
        reset()
        setOnboardingComplete(false)
        setShowOnboardingIntro(true)
        setLoading(false)
      }
    })

    return () => {
      active = false
      clearTimeout(fallbackTimer)
      subscription.unsubscribe()
    }
  }, [])

  async function checkOnboarding(userId, retryCount = 0) {
    const { data: profileData, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .single()

    if (error && retryCount < 3) {
      await new Promise(resolve => setTimeout(resolve, 1000))
      return checkOnboarding(userId, retryCount + 1)
    }

    if (profileData) {
      setProfile(profileData)
      setDriftIntroSeen(profileData.drift_intro_seen ?? false)
      setOnboardingComplete(profileData.onboarding_complete)
    }

    if (profileData?.onboarding_complete) {
      const { data: characterData } = await supabase
        .from('characters')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(1)
        .single()

      if (characterData) {
        setCharacter(characterData)
        setIsDrifting(characterData.is_drifting ?? false)

        const { data: domainData } = await supabase
          .from('domain_scores')
          .select('*')
          .eq('character_id', characterData.id)

        if (domainData) {
          const scores = {}
          domainData.forEach((row) => {
            scores[row.domain] = {
              score: row.score,
              description: row.description,
            }
          })
          setDomainScores(scores)
        }
      }
    }

    setLoading(false)
  }

  if (loading) {
    return <LoadingScreen />
  }

  return (
    <NavigationContainer>
      <Stack.Navigator screenOptions={{ headerShown: false }} key={session ? 'authed' : 'unauthed'}>
        {session ? (
          (onboardingComplete || profile?.onboarding_complete) ? (
            <>
              <Stack.Screen name="Home" component={MainTabs} />
              <Stack.Screen name="Debrief" component={DebriefScreen} />
              <Stack.Screen name="LevelUp" component={LevelUpScreen} />
              <Stack.Screen name="Feedback" component={FeedbackScreen} />
            </>
          ) : showOnboardingIntro ? (
            <Stack.Screen name="OnboardingIntro">
              {() => <OnboardingScreen onComplete={() => setShowOnboardingIntro(false)} />}
            </Stack.Screen>
          ) : (
            <Stack.Screen name="Quiz" component={QuizScreen} />
          )
        ) : (
          <>
            <Stack.Screen name="Welcome" component={WelcomeScreen} />
            <Stack.Screen name="SignUp" component={SignUpScreen} />
            <Stack.Screen name="Login" component={LoginScreen} />
          </>
        )}
      </Stack.Navigator>
    </NavigationContainer>
  )
}
