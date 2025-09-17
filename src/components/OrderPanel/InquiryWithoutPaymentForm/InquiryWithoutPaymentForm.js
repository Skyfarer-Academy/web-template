import React from 'react';
import { Form as FinalForm } from 'react-final-form';
import classNames from 'classnames';

import { FormattedMessage, useIntl } from '../../../util/reactIntl';

import { Form, PrimaryButton } from '../..';

import css from './InquiryWithoutPaymentForm.module.css';

const renderForm = formRenderProps => {
  // FormRenderProps from final-form
  const { formId, className, rootClassName, handleSubmit, categoryLevel1 } = formRenderProps;

  // console.log("ProductOrderForm for listingId:", listingId);
  console.log("Listing categoryLevel1:", categoryLevel1);
  const classes = classNames(rootClassName || css.root, className);

  return (
    <Form id={formId} onSubmit={handleSubmit} className={classes}>
      <div className={css.submitButton}>
        <PrimaryButton type="submit">
          <FormattedMessage id="InquiryWithoutPaymentForm.ctaButton" />
        </PrimaryButton>
      </div>
      {categoryLevel1 &&
        ["Instructors-Flight-Schools-Clubs", "Flight-Schools", "Specific-Training-In-Person", "DPE-Checkride"].includes(categoryLevel1) && (
          <div className={css.adBannerWrapper}>
            <img src="/static/images/Avemco_banner.png" alt="Avemco Insurance Ad" className={css.adBanner} />
          </div>
        )
      }
    </Form>
  );
};

/**
 * A form for sending an inquiry without payment.
 *
 * @component
 * @param {Object} props
 * @param {string} [props.rootClassName] - Custom class that overrides the default class for the root element
 * @param {string} [props.className] - Custom class that extends the default class for the root element
 * @param {string} props.formId - The ID of the form
 * @param {Function} props.onSubmit - The function to handle the form submission
 * @returns {JSX.Element}
 */
const InquiryWithoutPaymentForm = props => {
  const intl = useIntl();
  const initialValues = {};

  return <FinalForm initialValues={initialValues} {...props} intl={intl} render={renderForm} />;
};

export default InquiryWithoutPaymentForm;
