import classNames from 'classnames';
import React, { useEffect } from 'react';
import { useLocation, useHistory } from 'react-router-dom';

import { useConfiguration } from '../../context/configurationContext';
import { FormattedMessage, useIntl } from '../../util/reactIntl';
import {
  displayPrice,
  isPriceVariationsEnabled,
  requireListingImage,
} from '../../util/configHelpers';
import { lazyLoadWithDimensions } from '../../util/uiHelpers';
import { formatMoney } from '../../util/currency';
import { ensureListing, ensureUser } from '../../util/data';
import { richText } from '../../util/richText';
import { createSlug } from '../../util/urlHelpers';
import { isBookingProcessAlias } from '../../transactions/transaction';
import { voucherifyBackend } from '../../util/api';

import { isFieldForListingType, isFieldForCategory } from '../../util/fieldHelpers';

import {
  AspectRatioWrapper,
  NamedLink,
  ResponsiveImage,
  ListingCardThumbnail,
} from '../../components';

import css from './ListingCard.module.css';

const MIN_LENGTH_FOR_LONG_WORDS = 10;

const priceData = (price, currency, intl) => {
  if (price && price.currency === currency) {
    const formattedPrice = formatMoney(intl, price);
    return { formattedPrice, priceTitle: formattedPrice };
  } else if (price) {
    return {
      formattedPrice: intl.formatMessage(
        { id: 'ListingCard.unsupportedPrice' },
        { currency: price.currency }
      ),
      priceTitle: intl.formatMessage(
        { id: 'ListingCard.unsupportedPriceTitle' },
        { currency: price.currency }
      ),
    };
  }
  return {};
};

const LazyImage = lazyLoadWithDimensions(ResponsiveImage, { loadAfterInitialRendering: 3000 });

const PriceMaybe = props => {
  const { price, publicData, config, intl, listingTypeConfig } = props;
  const showPrice = displayPrice(listingTypeConfig);
  if (!showPrice && price) {
    return null;
  }

  const isPriceVariationsInUse = isPriceVariationsEnabled(publicData, listingTypeConfig);
  const hasMultiplePriceVariants = isPriceVariationsInUse && publicData?.priceVariants?.length > 1;

  const isBookable = isBookingProcessAlias(publicData?.transactionProcessAlias);
  const { formattedPrice, priceTitle } = priceData(price, config.currency, intl);

  const priceValue = <span className={css.priceValue}>{formattedPrice}</span>;
  const pricePerUnit = isBookable ? (
    <span className={css.perUnit}>
      <FormattedMessage id="ListingCard.perUnit" values={{ unitType: publicData?.unitType }} />
    </span>
  ) : (
    ''
  );

  return (
    <div className={css.price} title={priceTitle}>
      {hasMultiplePriceVariants ? (
        <FormattedMessage
          id="ListingCard.priceStartingFrom"
          values={{ priceValue, pricePerUnit }}
        />
      ) : (
        <FormattedMessage id="ListingCard.price" values={{ priceValue, pricePerUnit }} />
      )}
    </div>
  );
};

/**
 * ListingCardImage
 * Component responsible for rendering the image part of the listing card.
 * It either renders the first image from the listing's images array with lazy loading,
 * or a stylized placeholder if images are disabled for the listing type.
 * Also wraps the image in a fixed aspect ratio container for consistent layout.
 * @component
 * @param {Object} props
 * @param {Object} props.currentListing listing entity with image data
 * @param {Function?} props.setActivePropsMaybe mouse enter/leave handlers for map highlighting
 * @param {string} props.title listing title for alt text
 * @param {string} props.renderSizes img/srcset size rules
 * @param {number} props.aspectWidth aspect ratio width
 * @param {number} props.aspectHeight aspect ratio height
 * @param {string} props.variantPrefix image variant prefix (e.g. "listing-card")
 * @param {boolean} props.showListingImage whether to show actual listing image or not
 * @param {Object?} props.style the background color for the listing card with no image
 * @returns {JSX.Element} listing image with fixed aspect ratio or fallback preview
 */
const ListingCardImage = props => {
  const {
    currentListing,
    setActivePropsMaybe,
    title,
    renderSizes,
    aspectWidth,
    aspectHeight,
    variantPrefix,
    showListingImage,
    style,
  } = props;

  const firstImage =
    currentListing.images && currentListing.images.length > 0 ? currentListing.images[0] : null;
  const variants = firstImage
    ? Object.keys(firstImage?.attributes?.variants).filter(k => k.startsWith(variantPrefix))
    : [];

  // Render the listing image only if listing images are enabled in the listing type
  return showListingImage ? (
    <AspectRatioWrapper
      className={css.aspectRatioWrapper}
      width={aspectWidth}
      height={aspectHeight}
      {...setActivePropsMaybe}
    >
      <LazyImage
        rootClassName={css.rootForImage}
        alt={title}
        image={firstImage}
        variants={variants}
        sizes={renderSizes}
      />
    </AspectRatioWrapper>
  ) : (
    <ListingCardThumbnail
      style={style}
      listingTitle={title}
      className={css.aspectRatioWrapper}
      width={aspectWidth}
      height={aspectHeight}
      setActivePropsMaybe={setActivePropsMaybe}
    />
  );
};

/**
 * ListingCard
 *
 * @component
 * @param {Object} props
 * @param {string?} props.className add more style rules in addition to component's own css.root
 * @param {string?} props.rootClassName overwrite components own css.root
 * @param {Object} props.listing API entity: listing or ownListing
 * @param {string?} props.renderSizes for img/srcset
 * @param {Function?} props.setActiveListing
 * @param {boolean?} props.showAuthorInfo
 * @returns {JSX.Element} listing card to be used in search result panel etc.
 */
export const ListingCard = props => {
  const config = useConfiguration();
  const listingFieldConfigs = config.listing?.listingFields || [];
  const intl = props.intl || useIntl();

  const {
    className,
    currentUser,
    rootClassName,
    listing,
    renderSizes,
    setActiveListing,
    onToggleFavorites,
    showAuthorInfo = true,
    showHeartIcon,
    showStateInfo = true,
    //showCityInfo = true,
    showwhereIam = true,
  } = props;

  const classes = classNames(rootClassName || css.root, className);

  const currentListing = ensureListing(listing);
  const id = currentListing.id.uuid;
  //console.log("----------------->", currentListing, currentListing.id, currentListing.id.uuid);

  const { title = '', price, publicData, metadata = {} } = currentListing.attributes;
  const slug = createSlug(title);

  const author = ensureUser(listing.author);
  //console.log(listing.author);
  const authorName = author.attributes.profile.displayName;

  const { listingType, cardStyle } = publicData || {};
  const validListingTypes = config.listing.listingTypes;
  const foundListingTypeConfig = validListingTypes.find(conf => conf.listingType === listingType);
  const showListingImage = requireListingImage(foundListingTypeConfig);

  const {
    aspectWidth = 1,
    aspectHeight = 1,
    variantPrefix = 'listing-card',
  } = config.layout.listingImage;

  // Sets the listing as active in the search map when hovered (if the search map is enabled)
  const setActivePropsMaybe = setActiveListing
    ? {
        onMouseEnter: () => {
          setActiveListing(currentListing.id);

          //console.log('publicData:', publicData);
          //console.log('listingType:', publicData?.listingType);
        },
        onMouseLeave: () => setActiveListing(null),
      }
    : null;

  // [SKYFARER]
  // Make sure Voucherify customer is created
  // TODO: refactor and move this to a hook
  useEffect(() => {
    if (currentUser && config.vouchers.ENABLED) {
      try {
        voucherifyBackend.customers.createOrGet({
          source_id: currentUser.id.uuid,
          email: currentUser.attributes.email,
          name: currentUser.attributes.profile.displayName,
          createdAt: currentUser.attributes.createdAt.toString(),
          userType: currentUser.attributes.profile.publicData.userType,
        })
      } catch {}
    }
  }, [currentUser])

  const HeartIcon = ({ filled }) => (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      style={{
        height: '28px',
        width: '28px',
        marginLeft: '1px',
        marginTop: '-4px',
        verticalAlign: 'middle',
        fill: filled ? 'red' : 'none',
        stroke: filled ? 'none' : 'black',
        strokeWidth: 1,
        transition: 'all 0.1s ease',
      }}
    >
      <path d={
        filled
          ? "M12.1 8.64l-.1.1-.11-.1C10.14 6.6 7.4 6.6 5.5 8.5 \
              c-1.9 1.9-1.9 4.63 0 6.54l6.6 6.6 6.6-6.6 \
              c1.9-1.9 1.9-4.63 0-6.54-1.9-1.9-4.64-1.9-6.54 0z"
          : "M12.1 8.64l-.1.1-.11-.1C10.14 6.6 7.4 6.6 5.5 8.5 \
              c-1.9 1.9-1.9 4.63 0 6.54l6.6 6.6 6.6-6.6 \
              c1.9-1.9 1.9-4.63 0-6.54-1.9-1.9-4.64-1.9-6.54 0z"
      } />
    </svg>
  );

  const isFavorite = currentUser?.attributes.profile.privateData.favorites?.includes(
    listing.id.uuid
  );

  const toggleFavorites = e => {
  e.preventDefault();
  e.stopPropagation();   // Prevent image click

  console.log('currentUser passed to handleToggleFavorites:', currentUser);

  if (!currentUser) {
    // Redirect directly to /signup if the user is not logged in
    window.location.href = '/signup';
    return;
  }

  if (typeof onToggleFavorites === 'function') {
    onToggleFavorites(isFavorite, id);
  }
};

//console.log('ListingCard → stateInfo:', stateInfo);
//console.log('City info----->', cityInfo);


  return (
    <NamedLink
      className={classes}
      name="ListingPage"
      params={{ id, slug }}
      target={typeof window !== 'undefined' ? window.location.hostname === 'localhost' ? undefined : '_blank' : '_blank'} // [SKYFARER]
    >
    <div className={css.imageWrapper}>
      <ListingCardImage
        renderSizes={renderSizes}
        title={title}
        currentListing={currentListing}
        config={config}
        setActivePropsMaybe={setActivePropsMaybe}
        aspectWidth={aspectWidth}
        aspectHeight={aspectHeight}
        variantPrefix={variantPrefix}
        style={cardStyle}
        showListingImage={showListingImage}
      />
      {showHeartIcon && (
        <button
        className={css.favoriteButton}
        onClick={toggleFavorites}
        aria-label={isFavorite ? 'Remove from favorites' : 'Add to favorites'}
        >
          <HeartIcon filled={isFavorite} />
        </button>
      )}
    </div>
    
      <div className={css.info}>
        <PriceMaybe
          price={price}
          publicData={publicData}
          config={config}
          intl={intl}
          listingTypeConfig={foundListingTypeConfig}
        />
        <div className={css.mainInfo}>
          {showListingImage && (
            <div className={css.title}>
              {richText(title, {
                longWordMinLength: MIN_LENGTH_FOR_LONG_WORDS,
                longWordClass: css.longWord,
              })}
            </div>
          )}
          {showAuthorInfo ? (
            <div className={css.authorInfo}>
              <FormattedMessage id="ListingCard.author" values={{ authorName }} />
            </div>
          ) : null}

        </div>
      </div>

    </NamedLink>
  );
};

export default ListingCard;
