import React from 'react';
import classNames from 'classnames';
import * as googleMapsUtil from '../../util/googleMaps';
import { userLocation } from '../../util/maps';

import css from './LocationAutocompleteInput.module.css';

export const CURRENT_LOCATION_ID = 'current-location';

//Updating radius size based on the location type
// function getRadiusForType(type) {
//   switch (type) {
//     case 'locality':
//       return 400000;
//     case 'political': // state / province
//       return 200000; 
//     default:
//       return 500000;
//   }
// }

// When displaying data from the Google Maps Places API, and
// attribution is required next to the results.
// See: https://developers.google.com/places/web-service/policies#powered
export const GeocoderAttribution = props => {
  const { rootClassName, className, useDarkText } = props;
  const classes = classNames(rootClassName || css.poweredByGoogle, className, {
    [css.invert]: useDarkText,
  });
  return <div className={classes} />;
};

/**
 * A forward geocoding (place name -> coordinates) implementation
 * using the Google Maps Places API.
 */
class GeocoderGoogleMaps {
  constructor() {
    this.sessionToken = null;
  }
  getSessionToken() {
    this.sessionToken =
      this.sessionToken || new window.google.maps.places.AutocompleteSessionToken();
    return this.sessionToken;
  }

  // Public API
  //

  /**
   * Search places with the given name.
   *
   * @param {String} search query for place names
   *
   * @return {Promise<{ search: String, predictions: Array<Object>}>}
   * results of the geocoding, should have the original search query
   * and an array of predictions. The format of the predictions is
   * only relevant for the `getPlaceDetails` function below.
   */
  getPlacePredictions(search, countryLimit) {
    const limitCountriesMaybe = countryLimit
      ? {
          includedRegionCodes: countryLimit,
        }
      : {};

    return googleMapsUtil
      .getPlacePredictions(search, this.getSessionToken(), limitCountriesMaybe)
      .then(results => {
        return {
          search,
          predictions: results.predictions,
        };
      });
  }

  /**
   * Get the ID of the given prediction.
   */
  getPredictionId(prediction) {
    if (prediction.predictionPlace) {
      // default prediction defined above
      return prediction.id;
    }
    return prediction.placePrediction.placeId;
  }

  /**  
   * Get the address text of the given prediction.
   */
  getPredictionAddress(prediction) {
    if (prediction.predictionPlace) {
      // default prediction defined above
      return prediction.predictionPlace.address;
    }
    // prediction from Google Maps Places API

    return prediction.placePrediction.text.text;
  }

  /**
   * Fetch or read place details from the selected prediction.
   *
   * @param {Object} prediction selected prediction object
   *
   * @return {Promise<util.propTypes.place>} a place object
   */
  getPlaceDetails(prediction, currentLocationBoundsDistance) {
    if (this.getPredictionId(prediction) === CURRENT_LOCATION_ID) {
      return userLocation().then(latlng => {
        return {
          address: '',
          origin: latlng,
          bounds: googleMapsUtil.locationBounds(latlng, currentLocationBoundsDistance),
          // type: 'current-location',
          // radius: getRadiusForType('current-location')
        };
      });
    }

    if (prediction.predictionPlace) {
      return Promise.resolve(prediction.predictionPlace);
      // return Promise.resolve({...prediction.predictionPlace, type: prediction.predictionPlace.types ? prediction.predictionPlace.types[0] : undefined,});
    }

    return googleMapsUtil.getPlaceDetails(
        this.getPredictionId(prediction))
        .then(place => {
          this.sessionToken = null;

        // // Extract a simple 'type' from Google response
        // const placeType =
        // prediction.placePrediction?.types?.[0] ||
        // place.types?.[0] ||
        // undefined;
        
        // const radius = getRadiusForType(placeType);

        // // 🔥 Add console here
        // console.log('Place details with dynamic radius:', { address: place.address, type, radius });

        // return {
        // place,
        // // type: placeType,
        // // radius,
        // };
        return{
          address: place.address,
          origin: place.origin,
          bounds: place.bounds,
          radius: place.radius, // <- make sure this is accessible
          types: place.types
        };    
      });
  }
}

export default GeocoderGoogleMaps;
