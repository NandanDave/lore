import { registerRootComponent } from 'expo'
import * as SplashScreen from 'expo-splash-screen'
import App from './App'

// Keep the native splash up until App explicitly hides it, instead of relying
// on expo-splash-screen's auto-hide heuristic to notice our content is ready.
SplashScreen.preventAutoHideAsync().catch(() => {})

// Production builds have no red-box overlay, so an uncaught error is otherwise
// a silent black screen forever with no way to tell what happened.
const defaultHandler = ErrorUtils.getGlobalHandler()
ErrorUtils.setGlobalHandler((error, isFatal) => {
  console.error('[GlobalError]', isFatal ? 'FATAL' : 'non-fatal', error?.message, error?.stack)
  defaultHandler(error, isFatal)
})

registerRootComponent(App)
