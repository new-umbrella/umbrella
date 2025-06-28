const videoMimeTypes = {
  mp4: 'video/mp4',
  m3u8: 'application/x-mpegURL',
  webm: 'video/webm',
  ogg: 'video/ogg',
  mov: 'video/quicktime',
  avi: 'video/x-msvideo',
};

function detectVideoMimeType(url: string) {
  const extension = url.split('.').pop();
  return videoMimeTypes[extension as keyof typeof videoMimeTypes];
}

export default detectVideoMimeType;
