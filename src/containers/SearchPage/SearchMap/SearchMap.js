import React, { Component } from 'react';
import { useHistory } from 'react-router-dom';
import classNames from 'classnames';

import { useConfiguration } from '../../../context/configurationContext';
import { useRouteConfiguration } from '../../../context/routeConfigurationContext';
import { createResourceLocatorString } from '../../../util/routes';
import { createSlug } from '../../../util/urlHelpers';
import { propTypes } from '../../../util/types';
import { obfuscatedCoordinates, getMapProviderApiAccess } from '../../../util/maps';

import { hasParentWithClassName } from './SearchMap.helpers.js';
import * as searchMapMapbox from './SearchMapWithMapbox';
import * as searchMapGoogleMaps from './SearchMapWithGoogleMaps';
import ReusableMapContainer from './ReusableMapContainer';
import css from './SearchMap.module.css';

const REUSABLE_MAP_HIDDEN_HANDLE = 'reusableMapHidden';

const getSearchMapVariant = mapProvider => {
  const isGoogleMapsInUse = mapProvider === 'googleMaps';
  return isGoogleMapsInUse ? searchMapGoogleMaps : searchMapMapbox;
};
const getSearchMapVariantHandles = mapProvider => {
  const searchMapVariant = getSearchMapVariant(mapProvider);
  return {
    labelHandle: searchMapVariant.LABEL_HANDLE,
    infoCardHandle: searchMapVariant.INFO_CARD_HANDLE,
  };
};
const getFitMapToBounds = mapProvider => {
  const searchMapVariant = getSearchMapVariant(mapProvider);
  return searchMapVariant.fitMapToBounds;
};
const getSearchMapVariantComponent = mapProvider => {
  const searchMapVariant = getSearchMapVariant(mapProvider);
  return searchMapVariant.default;
};

const withCoordinatesObfuscated = (listings, offset) => {
  return listings.map(listing => {
    const { id, attributes, ...rest } = listing;
    const origGeolocation = attributes.geolocation;
    const cacheKey = id ? `${id.uuid}_${origGeolocation.lat}_${origGeolocation.lng}` : null;
    const geolocation = obfuscatedCoordinates(origGeolocation, offset, cacheKey);
    return {
      id,
      ...rest,
      attributes: {
        ...attributes,
        geolocation,
      },
    };
  });
};

export class SearchMapComponent extends Component {
  constructor(props) {
    super(props);

    this.listings = [];
    this.mapRef = null;

    let mapReattachmentCount = 0;

    if (typeof window !== 'undefined') {
      if (window.mapReattachmentCount) {
        mapReattachmentCount = window.mapReattachmentCount;
      } else {
        window.mapReattachmentCount = 0;
      }
    }

    // Default Seattle metro area coordinates and zoom
    this.defaultCenter = { lat: 47.6062, lng: -122.3321 }; // Seattle
    this.defaultZoom = 9;

    this.state = { 
      infoCardOpen: null, 
      mapReattachmentCount,
      center: this.defaultCenter,
      zoom: this.defaultZoom,
      locationInitialized: false,
    };

    this.createURLToListing = this.createURLToListing.bind(this);
    this.onListingInfoCardClicked = this.onListingInfoCardClicked.bind(this);
    this.onListingClicked = this.onListingClicked.bind(this);
    this.onMapClicked = this.onMapClicked.bind(this);
    this.onMapLoadHandler = this.onMapLoadHandler.bind(this);
  }

  componentDidMount() {
    // Try to get browser geolocation
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        position => {
          const { latitude, longitude } = position.coords;
          // 150 miles ≈ 241 km
          const RADIUS_MILES = 150;
          const RADIUS_KM = 241;

          // Helper to calculate distance between two lat/lng points (Haversine formula)
          function getDistanceMiles(lat1, lng1, lat2, lng2) {
            const toRad = x => (x * Math.PI) / 180;
            const R = 3958.8; // Radius of Earth in miles
            const dLat = toRad(lat2 - lat1);
            const dLng = toRad(lng2 - lng1);
            const a =
              Math.sin(dLat / 2) * Math.sin(dLat / 2) +
              Math.cos(toRad(lat1)) *
                Math.cos(toRad(lat2)) *
                Math.sin(dLng / 2) *
                Math.sin(dLng / 2);
            const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
            return R * c;
          }

          // Find listings within 150 miles of user
          const listingsArray = this.props.listings || [];
          const listingsWithLocation = listingsArray.filter(l => !!l.attributes.geolocation);
          const nearbyListings = listingsWithLocation.filter(l => {
            const { lat, lng } = l.attributes.geolocation;
            return getDistanceMiles(latitude, longitude, lat, lng) <= RADIUS_MILES;
          });

          if (nearbyListings.length >= 5) {
            // Center on user location
            this.setState({
              center: { lat: latitude, lng: longitude },
              zoom: 8,
              locationInitialized: true,
            });
          } else {
            // Try to find a cluster of 5+ listings within 150 miles of each other
            let bestCluster = [];
            for (let i = 0; i < listingsWithLocation.length; i++) {
              const { lat, lng } = listingsWithLocation[i].attributes.geolocation;
              const cluster = listingsWithLocation.filter(l2 => {
                const { lat: lat2, lng: lng2 } = l2.attributes.geolocation;
                return getDistanceMiles(lat, lng, lat2, lng2) <= RADIUS_MILES;
              });
              if (cluster.length >= 5 && cluster.length > bestCluster.length) {
                bestCluster = cluster;
                // Early exit if we find a big enough cluster
                if (bestCluster.length >= 10) break;
              }
            }
            if (bestCluster.length >= 5) {
              // Center on the first listing in the best cluster
              const { lat, lng } = bestCluster[0].attributes.geolocation;
              this.setState({
                center: { lat, lng },
                zoom: 8,
                locationInitialized: true,
              });
            } else {
              // Fallback: Seattle
              this.setState({
                center: this.defaultCenter,
                zoom: this.defaultZoom,
                locationInitialized: true,
              });
            }
          }
        },
        () => {
          // If user denies or fails, use default Seattle
          this.setState({
            center: this.defaultCenter,
            zoom: this.defaultZoom,
            locationInitialized: true,
          });
        }
      );
    } else {
      // Geolocation not supported
      this.setState({
        center: this.defaultCenter,
        zoom: this.defaultZoom,
        locationInitialized: true,
      });
    }
  }

  componentWillUnmount() {
    this.listings = [];
  }

  createURLToListing(listing) {
    const routes = this.props.routeConfiguration;

    const id = listing.id.uuid;
    const slug = createSlug(listing.attributes.title);
    const pathParams = { id, slug };

    return createResourceLocatorString('ListingPage', routes, pathParams, {});
  }

  onListingClicked(listings) {
    this.setState({ infoCardOpen: listings });
  }

  onListingInfoCardClicked(listing) {
    if (this.props.onCloseAsModal) {
      this.props.onCloseAsModal();
    }

    // To avoid full page refresh we need to use internal router
    const history = this.props.history;
    history.push(this.createURLToListing(listing));
  }

  onMapClicked(e) {
    // Close open listing popup / infobox, unless the click is attached to a price label
    const variantHandles = getSearchMapVariantHandles(this.props.config.maps.mapProvider);
    const labelClicked = hasParentWithClassName(e.nativeEvent.target, variantHandles.labelHandle);
    const infoCardClicked = hasParentWithClassName(
      e.nativeEvent.target,
      variantHandles.infoCardHandle
    );
    if (this.state.infoCardOpen != null && !labelClicked && !infoCardClicked) {
      this.setState({ infoCardOpen: null });
    }
  }

  onMapLoadHandler(map) {
    this.mapRef = map;

    if (this.mapRef && this.state.mapReattachmentCount === 0) {
      // map is ready, let's fit search area's bounds to map's viewport
      const fitMapToBounds = getFitMapToBounds(this.props.config.maps.mapProvider);
      fitMapToBounds(this.mapRef, this.props.bounds, { padding: 0, isAutocompleteSearch: true });
    }
  }

  render() {
    const {
      id = 'searchMap',
      className,
      rootClassName,
      reusableContainerClassName,
      bounds,
      center: propCenter = null,
      location,
      listings: originalListings,
      onMapMoveEnd,
      zoom: propZoom = 11,
      config,
      activeListingId,
      messages,
    } = this.props;
    const classes = classNames(rootClassName || css.root, className);

    const listingsArray = originalListings || [];
    const listingsWithLocation = listingsArray.filter(l => !!l.attributes.geolocation);
    const listings = config.maps.fuzzy.enabled
      ? withCoordinatesObfuscated(listingsWithLocation, config.maps.fuzzy.offset)
      : listingsWithLocation;
    const infoCardOpen = this.state.infoCardOpen;

    const forceUpdateHandler = () => {
      // Update global reattachement count
      window.mapReattachmentCount += 1;
      // Initiate rerendering
      this.setState({ mapReattachmentCount: window.mapReattachmentCount });
    };
    const mapProvider = config.maps.mapProvider;
    const hasApiAccessForMapProvider = !!getMapProviderApiAccess(config.maps);
    const SearchMapVariantComponent = getSearchMapVariantComponent(mapProvider);
    const isMapProviderAvailable =
      hasApiAccessForMapProvider && getSearchMapVariant(mapProvider).isMapsLibLoaded();

    // Use detected or default center/zoom unless explicitly provided by props
    const center = propCenter || this.state.center;
    const zoom = propZoom || this.state.zoom;

    // Wait for location to be initialized before rendering map
    if (!this.state.locationInitialized) {
      return <div className={classNames(classes, reusableContainerClassName || css.defaultMapLayout)} />;
    }

    return isMapProviderAvailable ? (
      <ReusableMapContainer
        className={reusableContainerClassName}
        reusableMapHiddenHandle={REUSABLE_MAP_HIDDEN_HANDLE}
        onReattach={forceUpdateHandler}
        messages={messages}
        config={config}
      >
        <SearchMapVariantComponent
          id={id}
          className={classes}
          bounds={bounds}
          center={center}
          location={location}
          infoCardOpen={infoCardOpen}
          listings={listings}
          activeListingId={activeListingId}
          mapComponentRefreshToken={this.state.mapReattachmentCount}
          createURLToListing={this.createURLToListing}
          onClick={this.onMapClicked}
          onListingClicked={this.onListingClicked}
          onListingInfoCardClicked={this.onListingInfoCardClicked}
          onMapLoad={this.onMapLoadHandler}
          onMapMoveEnd={onMapMoveEnd}
          reusableMapHiddenHandle={REUSABLE_MAP_HIDDEN_HANDLE}
          zoom={zoom}
          config={config}
        />
      </ReusableMapContainer>
    ) : (
      <div className={classNames(classes, reusableContainerClassName || css.defaultMapLayout)} />
    );
  }
}

/**
 * SearchMap component
 * @component
 * @param {Object} props
 * @param {string} [props.id] - The ID
 * @param {string} [props.className] - Custom class that extends the default class for the root element
 * @param {string} [props.rootClassName] - Custom class that overrides the default class for the root element
 * @param {string} [props.reusableContainerClassName] - Custom class that overrides the default class for the reusable container
 * @param {propTypes.latlngBounds} props.bounds - The bounds
 * @param {propTypes.latlng} props.center - The center
 * @param {Object} props.location - The location
 * @param {string} props.location.search - The search query params
 * @param {propTypes.uuid} props.activeListingId - The active listing ID
 * @param {Array<propTypes.listing>} props.listings - The listings
 * @param {Function} props.onCloseAsModal - The function to close as modal
 * @param {Function} props.onMapMoveEnd - The function to move end
 * @param {number} props.zoom - The zoom
 * @param {Object} props.messages - The messages for the IntlProvider
 * @returns {JSX.Element}
 */
const SearchMap = props => {
  const config = useConfiguration();
  const routeConfiguration = useRouteConfiguration();
  const history = useHistory();
  return (
    <SearchMapComponent
      config={config}
      routeConfiguration={routeConfiguration}
      history={history}
      {...props}
    />
  );
};

export default SearchMap;
