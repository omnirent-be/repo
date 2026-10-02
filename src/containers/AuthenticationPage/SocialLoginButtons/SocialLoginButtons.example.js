import SocialLoginButtons from './SocialLoginButtons';

export const SignupWithItsmeComingSoon = {
  component: SocialLoginButtons,
  props: {
    isLogin: false,
    showFacebookLogin: true,
    showGoogleLogin: true,
    showItsmeComingSoon: true,
  },
  group: 'page:AuthenticationPage',
};

export const LoginWithItsmeComingSoon = {
  component: SocialLoginButtons,
  props: {
    isLogin: true,
    showFacebookLogin: true,
    showGoogleLogin: true,
    showItsmeComingSoon: true,
  },
  group: 'page:AuthenticationPage',
};
