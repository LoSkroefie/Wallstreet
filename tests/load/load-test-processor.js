module.exports = {
  setAuthToken: function (requestParams, context, ee, next) {
    if (context.vars.authToken) {
      requestParams.headers = requestParams.headers || {};
      requestParams.headers['Authorization'] = `Bearer ${context.vars.authToken}`;
    }
    return next();
  },

  logResponse: function (requestParams, response, context, ee, next) {
    if (response.statusCode >= 400) {
      console.log(`Error response: ${response.statusCode}`);
    }
    return next();
  },
};
