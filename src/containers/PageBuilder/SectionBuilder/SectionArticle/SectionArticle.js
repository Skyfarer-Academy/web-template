import React, { useState } from 'react';
import classNames from 'classnames';

import Field, { hasDataInFields } from '../../Field';
import BlockBuilder from '../../BlockBuilder';
import SectionContainer from '../SectionContainer';

import css from './SectionArticle.module.css';

const SectionArticle = props => {
  const {
    sectionId,
    className,
    rootClassName,
    defaultClasses,
    title,
    description,
    appearance,
    callToAction,
    blocks = [],
    isInsideContainer = false,
    options,
  } = props;

  const fieldComponents = options?.fieldComponents;
  const fieldOptions = { fieldComponents };

  const hasHeaderFields = hasDataInFields([title, description, callToAction], fieldOptions);
  const hasBlocks = blocks?.length > 0;

  // === NEW STATE for modal ===
  const [showModal, setShowModal] = useState(false);

  // === NEW CONDITIONAL: only show in "Submit a request" section ===
  const isSubmitRequestSection =
    title?.content?.toLowerCase()?.includes('Submit a request') ||
    sectionId === 'submit-a-request';

  // === Monday form link ===
  const mondayFormUrl =
    'https://forms.monday.com/forms/embed/e84e8aefa14ef0f5d78bccf3a4ab3c75?r=use1';

  return (
    <SectionContainer
      id={sectionId}
      className={className}
      rootClassName={rootClassName}
      appearance={appearance}
      options={fieldOptions}
    >
      {hasHeaderFields ? (
        <header className={defaultClasses.sectionDetails}>
          {console.log('SectionArticle rendered:', sectionId, title?.content)}
          <Field data={title} className={defaultClasses.title} options={fieldOptions} />
          <Field data={description} className={defaultClasses.description} options={fieldOptions} />
          <Field data={callToAction} className={defaultClasses.ctaButton} options={fieldOptions} />

          {/* === Inject the button + modal only for Submit a Request section === */}
          {isSubmitRequestSection ? (
            <div style={{ marginTop: '2rem', textAlign: 'center' }}>
              <button
                className={defaultClasses.ctaButton}
                onClick={() => setShowModal(true)}
              >
                Submit your request
              </button>

              {showModal && (
                <div
                  className={css.modalOverlay}
                  onClick={() => setShowModal(false)}
                >
                  <div
                    className={css.modalContent}
                    onClick={e => e.stopPropagation()}
                  >
                    <button
                      className={css.closeBtn}
                      onClick={() => setShowModal(false)}
                    >
                      &times;
                    </button>
                    <iframe
                      src={mondayFormUrl}
                      title="Submit Your Request"
                    ></iframe>
                  </div>
                </div>
              )}
            </div>
          ) : null}
        </header>
      ) : null}

      {hasBlocks ? (
        <div
          className={classNames(defaultClasses.blockContainer, css.articleMain, {
            [css.noSidePaddings]: isInsideContainer,
          })}
        >
          <BlockBuilder
            blocks={blocks}
            sectionId={sectionId}
            ctaButtonClass={defaultClasses.ctaButton}
            options={options}
          />
        </div>
      ) : null}
    </SectionContainer>
  );
};
 
export default SectionArticle;
 