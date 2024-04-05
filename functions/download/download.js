const axios = require('axios');

exports.handler = async function (event, context) {
  const { url: downloadUrl } = event.queryStringParameters;
  
  if (!downloadUrl) {
    return {
      statusCode: 400,
      body: 'Missing or invalid "url" parameter.'
    };
  }

  try {
    const response = await axios.get(downloadUrl, {
      responseType: 'stream',
      maxRedirects: 10 // Adjust the number of redirects to follow
    });

    const headers = {
      'Content-Type': response.headers['content-type']
    };
    
    const contentDisposition = response.headers['content-disposition'];
    if (contentDisposition) {
      const match = /filename="(.*)"/.exec(contentDisposition);
      if (match && match[1]) {
        headers['Content-Disposition'] = `attachment; filename="${match[1]}"`;
      }
    }

    if (event.headers.range) {
      const range = event.headers.range.replace(/bytes=/, '').split('-');
      const start = parseInt(range[0], 10);
      const end = range[1] ? parseInt(range[1], 10) : response.headers['content-length'] - 1;
      const chunkSize = (end - start) + 1;

      headers['Content-Range'] = `bytes ${start}-${end}/${response.headers['content-length']}`;
      headers['Accept-Ranges'] = 'bytes';
      headers['Content-Length'] = chunkSize;

      return {
        statusCode: 206,
        headers,
        body: response.data
      };
    } else {
      headers['Content-Length'] = response.headers['content-length'];
      
      return {
        statusCode: 200,
        headers,
        body: response.data
      };
    }
  } catch (error) {
    //console.error('Error fetching resource:', error);
    return {
      statusCode: 500,
      body: 'Internal Server Error'
    };
  }
};