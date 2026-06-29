export function isValidUrl(url: string): boolean {
  try {
    new URL(url);
    return true;
  } catch {
    return false;
  }
}

export function isSupportedDomain(url: string): boolean {
  // yt-dlp supports thousands of sites, so we do a basic check
  const supportedPatterns = [
    /youtube\.com/,
    /youtu\.be/,
    /vimeo\.com/,
    /tiktok\.com/,
    /twitter\.com/,
    /x\.com/,
    /instagram\.com/,
    /facebook\.com/,
    /reddit\.com/,
    /twitch\.tv/,
    /dailymotion\.com/,
    /bilibili\.com/,
    // Add more patterns as needed
  ];
  
  return supportedPatterns.some(pattern => pattern.test(url));
}
