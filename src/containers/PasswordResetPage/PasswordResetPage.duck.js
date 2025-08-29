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

// NOTE: We DO NOT call update_profile here anymore (that caused 403 when user was not authenticated).
// Instead, we stash the metadata to localStorage so auth.duck.js can update protectedData
// immediately after a successful login.
export const resetPassword = (email, passwordResetToken, newPassword, protectedDataUpdate) => (
  dispatch,
  getState,
  sdk
) => {
  dispatch(resetPasswordRequest());

  const params = { email, passwordResetToken, newPassword };

  return sdk.passwordReset
    .reset(params) // Only reset password here
    .then(() => {
      console.log('✅ Password reset successful');

      // Stash metadata for after-login update (handled in auth.duck.js)
      if (protectedDataUpdate) {
        try {
          localStorage.setItem('passwordResetMetadata', JSON.stringify(protectedDataUpdate));
          console.log('💾 Stashed reset metadata for after-login update:', protectedDataUpdate);
        } catch (err) {
          console.warn('Could not save reset metadata to localStorage:', err);
        }
      }
    })
    .then(() => dispatch(resetPasswordSuccess()))
    .catch(e => dispatch(resetPasswordError(storableError(e))));
};
