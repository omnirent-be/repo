import { fetchCurrentUser } from '../../ducks/user.duck';

export const loadData = () => dispatch => {
  return dispatch(fetchCurrentUser());
};
