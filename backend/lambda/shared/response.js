const CORS_HEADERS = {
  'Content-Type': 'application/json',
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type,Authorization'
};

function success(data, statusCode = 200) {
  return {
    statusCode,
    headers: CORS_HEADERS,
    body: JSON.stringify(data)
  };
}

function error(message, statusCode = 500) {
  return {
    statusCode,
    headers: CORS_HEADERS,
    body: JSON.stringify({ error: message })
  };
}

function unauthorized() {
  return error('Unauthorized', 401);
}

function notFound(message = 'Not found') {
  return error(message, 404);
}

function badRequest(message = 'Bad request') {
  return error(message, 400);
}

module.exports = { success, error, unauthorized, notFound, badRequest, CORS_HEADERS };
