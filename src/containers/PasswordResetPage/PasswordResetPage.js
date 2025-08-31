console.log("Password reset page");
import React, { useState, useEffect } from 'react';
import { compose } from 'redux';
import { connect } from 'react-redux';
import { withRouter } from 'react-router-dom';
import TermsAndConditions from '../AuthenticationPage/TermsAndConditions/TermsAndConditions';
import { useConfiguration } from '../../context/configurationContext';
import { FormattedMessage, useIntl } from '../../util/reactIntl';
import { propTypes } from '../../util/types';
import { parse } from '../../util/urlHelpers';
import { isScrollingDisabled, manageDisableScrolling } from '../../ducks/ui.duck';
import { camelize } from '../../util/string';

import {
  Heading,
  Page,
  NamedLink,
  IconKeys,
  IconKeysSuccess,
  ResponsiveBackgroundImageContainer,
  LayoutSingleColumn,
  Modal,
} from '../../components';

import TopbarContainer from '../../containers/TopbarContainer/TopbarContainer';
import FooterContainer from '../../containers/FooterContainer/FooterContainer';

import PasswordResetForm from './PasswordResetForm/PasswordResetForm';
import { resetPassword } from './PasswordResetPage.duck';
import css from './PasswordResetPage.module.css';

// TOS/Privacy containers
import { TermsOfServiceContent } from '../../containers/TermsOfServicePage/TermsOfServicePage';
import { PrivacyPolicyContent } from '../../containers/PrivacyPolicyPage/PrivacyPolicyPage';

// TOS/Privacy constants
import { TOS_ASSET_NAME, PRIVACY_POLICY_ASSET_NAME, loadData as loadPageAssets } from '../AuthenticationPage/AuthenticationPage.duck';

// Parse URL parameters
const parseUrlParams = location => {
  const params = parse(location.search);
  const { t: token, e: email } = params;
  return { token, email };
};

// Params missing content
const ParamsMissingContent = () => {
  const recoveryLink = (
    <NamedLink name="PasswordRecoveryPage">
      <FormattedMessage id="PasswordResetPage.recoveryLinkText" />
    </NamedLink>
  );
  return (
    <div className={css.content}>
      <p>
        <FormattedMessage id="PasswordResetPage.invalidUrlParams" values={{ recoveryLink }} />
      </p>
    </div>
  );
};

// Reset form content
const ResetFormContent = props => {
  const {
    handleSubmit,
    resetPasswordInProgress,
    resetPasswordError,
    onOpenTermsOfService,
    onOpenPrivacyPolicy,
    intl,
  } = props;

  return (
    <div className={css.content}>
      <IconKeys className={css.modalIcon} />
      <Heading as="h1" rootClassName={css.modalTitle}>
        <FormattedMessage id="PasswordResetPage.mainHeading" />
      </Heading>

      <p className={css.modalMessage}>
        <FormattedMessage id="PasswordResetPage.helpText1" />
      </p>
      <ul className={css.modalMessageList}>
        <li className={css.modalMessage}>
          <FormattedMessage id="PasswordResetPage.helpText2" />
        </li>
        <li className={css.modalMessage}>
          <FormattedMessage id="PasswordResetPage.helpText3" />
        </li>
      </ul>

      {resetPasswordError ? (
        <p className={css.error}>
          <FormattedMessage id="PasswordResetPage.resetFailed" />
        </p>
      ) : null}

      <PasswordResetForm
        className={css.form}
        onSubmit={handleSubmit}
        inProgress={resetPasswordInProgress}
        termsAndConditions={
          <TermsAndConditions
            formId="PasswordResetForm"
            onOpenTermsOfService={onOpenTermsOfService}
            onOpenPrivacyPolicy={onOpenPrivacyPolicy}
            intl={intl}
          />
        }
      />
    </div>
  );
};

// Reset done content
const ResetDoneContent = () => {
  return (
    <div className={css.content}>
      <IconKeysSuccess className={css.modalIcon} />
      <Heading as="h1" rootClassName={css.modalTitle}>
        <FormattedMessage id="PasswordResetPage.passwordChangedHeading" />
      </Heading>
      <p className={css.modalMessage}>
        <FormattedMessage id="PasswordResetPage.passwordChangedHelpText" />
      </p>
      <NamedLink name="LoginPage" className={css.submitButton}>
        <FormattedMessage id="PasswordResetPage.loginButtonText" />
      </NamedLink>
    </div>
  );
};

/**
 * The reset-password page.
 *
 * @param {Object} props
 * @param {boolean} props.scrollingDisabled - Whether the page is scrolling disabled
 * @param {boolean} props.resetPasswordInProgress - Whether the reset password is in progress
 * @param {propTypes.error} props.resetPasswordError - The reset password error
 * @param {function} props.onSubmitPassword - The function to submit the password
 * @param {Object} props.location - The location object
 * @param {string} props.location.search - The search string
 * @returns {JSX.Element} Password reset page component
 */

export const PasswordResetPageComponent = props => {
  const [state, setState] = useState({ newPasswordSubmitted: false });
  const [tosModalOpen, setTosModalOpen] = useState(false);
  const [privacyModalOpen, setPrivacyModalOpen] = useState(false);

  const config = useConfiguration();
  const intl = useIntl();
  const {
    scrollingDisabled,
    location,
    resetPasswordInProgress,
    resetPasswordError,
    onSubmitPassword,
    tosAssetsData,
    tosFetchInProgress,
    tosFetchError,
    privacyAssetsData,
    privacyFetchInProgress,
    privacyFetchError,
    onManageDisableScrolling,
    dispatchLoadPageAssets
  } = props;

  useEffect(() => {
    dispatchLoadPageAssets();
  }, [dispatchLoadPageAssets]);

  // Scroll to top when modals open
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [tosModalOpen, privacyModalOpen]);

  const { token, email } = parseUrlParams(location);
  const hasParams = !!(token && email);
  const isPasswordSubmitted = state.newPasswordSubmitted && !resetPasswordError;

  const handleSubmit = async values => {
    const { password } = values;
    setState({ newPasswordSubmitted: false });

    // Collect metadata
    const passwordResetTimestamp = new Date().toISOString();
    let passwordResetIP = 'unknown';
    try {
      const res = await fetch('https://api.ipify.org?format=json');
      const data = await res.json();
      passwordResetIP = data.ip;
    } catch (err) {
      console.error('Could not fetch IP address', err);
    }

    const protectedDataUpdate = {
      passwordResetTimestamp,
      passwordResetIP,
    };

    console.log('Password reset metadata (local test):', protectedDataUpdate);

    // Call SDK to reset password
    onSubmitPassword(email, token, password, protectedDataUpdate).then(() =>
      setState({ newPasswordSubmitted: true })
    );
  };

  const content = !hasParams ? (
    <ParamsMissingContent />
  ) : isPasswordSubmitted ? (
    <ResetDoneContent />
  ) : (
    <ResetFormContent
      handleSubmit={handleSubmit}
      resetPasswordInProgress={resetPasswordInProgress}
      resetPasswordError={resetPasswordError}
      onOpenTermsOfService={() => setTosModalOpen(true)}
      onOpenPrivacyPolicy={() => setPrivacyModalOpen(true)}
      intl={intl}
    />
  );

  const marketplaceName = config.marketplaceName;

  return (
    <Page
      title={intl.formatMessage({ id: 'PasswordResetPage.title' })}
      scrollingDisabled={scrollingDisabled}
      referrer="origin"
    >
      <LayoutSingleColumn
        mainColumnClassName={css.layoutWrapperMain}
        topbar={<TopbarContainer />}
        footer={<FooterContainer />}
      >
        <ResponsiveBackgroundImageContainer
          className={css.root}
          childrenWrapperClassName={css.contentContainer}
          as="section"
          image={config.branding?.brandImage}
          sizes="100%"
          useOverlay
        >
          {content}
        </ResponsiveBackgroundImageContainer>
      </LayoutSingleColumn>

      {/* Terms of Service modal */}
      <Modal
        id="PasswordResetPage.tos"
        isOpen={tosModalOpen}
        onClose={() => setTosModalOpen(false)}
        usePortal
        onManageDisableScrolling={onManageDisableScrolling}
      >
        <div className={css.termsWrapper}>
          <TermsOfServiceContent
            inProgress={tosFetchInProgress}
            error={tosFetchError}
            data={tosAssetsData?.[camelize(TOS_ASSET_NAME)]?.data || {}}
          />
        </div>
      </Modal>

      {/* Privacy Policy modal */}
      <Modal
        id="PasswordResetPage.privacyPolicy"
        isOpen={privacyModalOpen}
        onClose={() => setPrivacyModalOpen(false)}
        usePortal
        onManageDisableScrolling={onManageDisableScrolling}
      >
        <div className={css.privacyWrapper}>
          <PrivacyPolicyContent
            inProgress={privacyFetchInProgress}
            error={privacyFetchError}
            data={privacyAssetsData?.[camelize(PRIVACY_POLICY_ASSET_NAME)]?.data || {}}
          />
        </div>
      </Modal>
    </Page>
  );
};

const mapStateToProps = state => {
  const { resetPasswordInProgress, resetPasswordError } = state.PasswordResetPage || {};

  const {
    pageAssetsData: privacyAssetsData,
    inProgress: privacyFetchInProgress,
    error: privacyFetchError,
  } = state.hostedAssets || {};

  const {
    pageAssetsData: tosAssetsData,
    inProgress: tosFetchInProgress,
    error: tosFetchError,
  } = state.hostedAssets || {};

  return {
    scrollingDisabled: isScrollingDisabled(state),
    resetPasswordInProgress,
    resetPasswordError,
    privacyAssetsData,
    privacyFetchInProgress,
    privacyFetchError,
    tosAssetsData,
    tosFetchInProgress,
    tosFetchError,
  };
};

const mapDispatchToProps = dispatch => ({
  onSubmitPassword: (email, token, password, protectedDataUpdate) =>
    dispatch(resetPassword(email, token, password, protectedDataUpdate)),
  onManageDisableScrolling: (componentId, disableScrolling) =>
    dispatch(manageDisableScrolling(componentId, disableScrolling)),
  dispatchLoadPageAssets: () => dispatch(loadPageAssets()),
});

// Note: it is important that the withRouter HOC is **outside** the
// connect HOC, otherwise React Router won't rerender any Route
// components since connect implements a shouldComponentUpdate
// lifecycle hook.
//
// See: https://github.com/ReactTraining/react-router/issues/4671

const PasswordResetPage = compose(
  withRouter,
  connect(
    mapStateToProps,
    mapDispatchToProps
  )
)(PasswordResetPageComponent);

export default PasswordResetPage;
