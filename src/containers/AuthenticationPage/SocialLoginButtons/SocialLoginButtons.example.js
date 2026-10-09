import SocialLoginButtons from './SocialLoginButtons';

export const Signup = {
  component: SocialLoginButtons,
  props: {
    isLogin: false,
    showFacebookLogin: true,
    showGoogleLogin: true,
  },
  group: 'page:AuthenticationPage',
};

export const Login = {
  component: SocialLoginButtons,
  props: {
    isLogin: true,
    showFacebookLogin: true,
    showGoogleLogin: true,
  },
  group: 'page:AuthenticationPage',
};
