// All available Lottie animations from Bearo-iOS repository
// These can be imported and used with lottie-react's Lottie component

export const LOTTIE_ANIMATIONS = {
  // Main bear mascot animation
  bear: '/animations/Bear.json',
  
  // Alternate bear animation
  beary: '/animations/Beary.json',
  
  // Bear doing a floss dance - fun/playful
  flossBear: '/animations/FlossBear.json',
  
  // Flying bee animation - for loading states or decoration
  flyingBee: '/animations/FlyingBee.json',
  
  // BEE-lieve animation - HONEY icon
  beeLieve: '/animations/BEE-lieve.json',
  
  // Contact/communication icon
  contact: '/animations/Contact.json',
  
  // Email sending animation - for verification flows
  emailSend: '/animations/EmailSend.json',
  
  // Money/currency animation - for payment flows
  money: '/animations/Money.json',
  
  // Welcome animation - for onboarding
  welcome: '/animations/Welcome.json',
} as const;

// Type for animation keys
export type LottieAnimationKey = keyof typeof LOTTIE_ANIMATIONS;

// Animation descriptions for accessibility
export const LOTTIE_ANIMATION_DESCRIPTIONS: Record<LottieAnimationKey, string> = {
  bear: 'Animated Bearo bear mascot',
  beary: 'Cute animated bear character',
  flossBear: 'Bear doing a fun floss dance',
  flyingBee: 'Animated flying bee',
  beeLieve: 'BEE-lieve animated bee for HONEY',
  contact: 'Contact and communication animation',
  emailSend: 'Email being sent animation',
  money: 'Money and currency animation',
  welcome: 'Welcome greeting animation',
};

// Suggested use cases for each animation
export const LOTTIE_ANIMATION_USE_CASES: Record<LottieAnimationKey, string[]> = {
  bear: ['Hero section', 'Loading states', 'Success messages'],
  beary: ['Profile icons', 'Tier badges', 'Empty states'],
  flossBear: ['Celebration', 'Success confirmation', 'Fun interactions'],
  flyingBee: ['Loading spinners', 'Background decoration', 'Hover effects'],
  beeLieve: ['HONEY icon', 'Stablecoin explorer', 'Currency selector'],
  contact: ['Contact forms', 'Support section', 'Social links'],
  emailSend: ['Email verification', 'Newsletter signup', 'Notification sent'],
  money: ['Payment flows', 'Balance display', 'Transaction success'],
  welcome: ['Onboarding', 'First-time user greeting', 'Hero section'],
};

export default LOTTIE_ANIMATIONS;

