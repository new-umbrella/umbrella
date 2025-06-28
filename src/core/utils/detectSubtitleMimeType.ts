const subtitleMimeTypes = {
  vtt: 'text/vtt',
  srt: 'text/srt',
  sub: 'text/sub',
  sbv: 'text/sbv',
  smi: 'text/smi',
  ssa: 'text/ssa',
  ass: 'text/ass',
};

function detectSubtitleMimeType(url: string) {
  const extension = url.split('.').pop();
  return subtitleMimeTypes[extension as keyof typeof subtitleMimeTypes];
}

export default detectSubtitleMimeType;
