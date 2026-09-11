// Vercel Speed Insights integration
import { injectSpeedInsights } from '@vercel/speed-insights';

// Initialize Speed Insights
// This will only track in production (not in development mode)
injectSpeedInsights({
  debug: false
});
