import React from 'react';
import css from './AvemcoBanner.module.css';

const AvemcoBanner = ({ categoryLevel1 }) => {
  const validCategories = [
    "Instructors-Flight-Schools-Clubs",
    "Flight-Schools",
    "Specific-Training-In-Person",
    "dpe-checkride", 
  ];

  if (!categoryLevel1 || !validCategories.includes(categoryLevel1)) {
    return null; 
  }

  return (
    <div className={css.adBannerWrapper}>
      <img
        src="/static/images/Avemco_banner.png"
        alt="Avemco Insurance Ad"
        className={css.adBanner}
        style={{ cursor: 'pointer' }}
        onClick={() =>
          window.open(
            'https://www.avemco.com/products/renter?partner=SF17',
            '_blank',
            'noopener,noreferrer'
          )
        }
      />
    </div>
  );
};

export default AvemcoBanner;
