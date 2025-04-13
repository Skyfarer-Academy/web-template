
const { transactionLineItems } = require('../api-util/lineItems');
const {
  getSdk,
  getTrustedSdk,
  handleError,
  serialize,
  fetchCommission,
} = require('../api-util/sdk');
const { extractOverridingProviderCommissionPercent, extractOverridingCustomerCommissionPercent } = require('./util/commission-override');

module.exports = (req, res) => {
  const { isSpeculative, orderData, bodyParams, queryParams } = req.body;

  const sdk = getSdk(req, res);
  let lineItems = null;

  const userDataPromise = () => sdk.authInfo().then(authInfo => {
    if (authInfo && authInfo.isAnonymous === false) {
      return sdk.currentUser.show({});
    }
    return Promise.resolve("Unauthenticated");
  });

  const listingPromise = () => sdk.listings.show({ id: bodyParams?.params?.listingId, include: 'author' });

  Promise.all([listingPromise(), userDataPromise(), fetchCommission(sdk)])
    .then(async ([showListingResponse, userDataResponse, fetchAssetsResponse]) => {
      const listing = showListingResponse.data.data;
      const commissionAsset = fetchAssetsResponse.data.data[0];

      const { providerCommission, customerCommission } =
        commissionAsset?.type === 'jsonAsset' ? commissionAsset.attributes.data : {};

      lineItems = await transactionLineItems(
        listing,
        { ...orderData, ...bodyParams.params },
        extractOverridingProviderCommissionPercent(showListingResponse, providerCommission),
        extractOverridingCustomerCommissionPercent(userDataResponse, customerCommission)
      );

      return getTrustedSdk(req);
    })
    .then(trustedSdk => {
      const { params } = bodyParams;

      // Add lineItems to the body params
      const body = {
        ...bodyParams,
        params: {
          ...params,
          lineItems,
        },
      };

      if (isSpeculative) {
        return trustedSdk.transactions.initiateSpeculative(body, queryParams);
      }
      return trustedSdk.transactions.initiate(body, queryParams);
    })
    .then(apiResponse => {
      const { status, statusText, data } = apiResponse;
      res
        .status(status)
        .set('Content-Type', 'application/transit+json')
        .send(
          serialize({
            status,
            statusText,
            data,
          })
        )
        .end();
    })
    .catch(e => {
      handleError(res, e);
    });
};
