import pRetry from './retryPromise.js';

const AUDIO_UPLOAD_RETRIES = 2;

const _api = async (url, headers, formData) => {
  try {
    const _response = await fetch(url, {
      method: 'POST',
      headers: {
        ...headers
      },
      body: formData,
    });
    if (_response.status < 200 || _response.status > 299) {
      throw new Error(_response.statusText);
    }

    return _response;
  } catch (e) {
    throw new Error();
  }
};

export const initiatePostCall = async (...args) => {
  const response = await pRetry(_api.bind(null, ...args), {
    retries: AUDIO_UPLOAD_RETRIES,
  });
  return response;
};
