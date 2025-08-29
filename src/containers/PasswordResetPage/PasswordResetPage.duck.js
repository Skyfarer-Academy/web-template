import { storableError } from '../../util/errors';

// ================ Action types ================ //

export const RESET_PASSWORD_REQUEST = 'app/PasswordResetPage/RESET_PASSWORD_REQUEST';
export const RESET_PASSWORD_SUCCESS = 'app/PasswordResetPage/RESET_PASSWORD_SUCCESS';
export const RESET_PASSWORD_ERROR = 'app/PasswordResetPage/RESET_PASSWORD_ERROR';

// ================ Reducer ================ //

const initialState = {
  resetPasswordInProgress: false,
  resetPasswordError: null,
};

export default function reducer(state = initialState, action = {}) {
  const { type, payload } = action;
  switch (type) {
    case RESET_PASSWORD_REQUEST:
      return { ...state, resetPasswordInProgress: true, resetPasswordError: null };
    case RESET_PASSWORD_SUCCESS:
      return { ...state, resetPasswordInProgress: false };
    case RESET_PASSWORD_ERROR:
      console.error(payload);
      return { ...state, resetPasswordInProgress: false, resetPasswordError: payload };
    default:
      return state;
  }
}

// ================ Action creators ================ //

export const resetPasswordRequest = () => ({ type: RESET_PASSWORD_REQUEST });
export const resetPasswordSuccess = () => ({ type: RESET_PASSWORD_SUCCESS });
export const resetPasswordError = e => ({
  type: RESET_PASSWORD_ERROR,
  error: true,
  payload: e,
});

// ================ Thunk ================ //

export const resetPassword = (email, passwordResetToken, newPassword, protectedDataUpdate) => (
  dispatch,
  getState,
  sdk
) => {
  dispatch(resetPasswordRequest());

  const params = {
    email,
    passwordResetToken,
    newPassword,
    protectedData: protectedDataUpdate, // send metadata here
  };

  return sdk.passwordReset
    .reset(params)
    .then(res => {
      console.log('✅ Password reset completed for user:', email);
      console.log('Metadata sent:', protectedDataUpdate);
      dispatch(resetPasswordSuccess());
    })
    .catch(e => dispatch(resetPasswordError(storableError(e))));
};

