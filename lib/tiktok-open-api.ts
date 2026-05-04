/**
 * TikTok Login Kit + Open API v2 — scopes and field lists kept in sync with the developer console submission.
 * @see https://developers.tiktok.com/doc/tiktok-api-v2-get-user-info
 * @see https://developers.tiktok.com/doc/tiktok-api-v2-video-list
 */

/** Comma-separated `scope` for `https://www.tiktok.com/v2/auth/authorize/` */
export const TIKTOK_OAUTH_SCOPES = [
  'user.info.basic',
  'user.info.profile',
  'user.info.stats',
  'video.list',
].join(',')

/**
 * `fields` query for `GET https://open.tiktokapis.com/v2/user/info/`
 * (each field requires the matching scope above).
 */
export const TIKTOK_USER_INFO_FIELDS = [
  'open_id',
  'union_id',
  'avatar_url',
  'display_name',
  'username',
  'bio_description',
  'profile_deep_link',
  'profile_web_link',
  'is_verified',
  'follower_count',
  'following_count',
  'likes_count',
  'video_count',
].join(',')

/** `fields` query for `POST https://open.tiktokapis.com/v2/video/list/` */
export const TIKTOK_VIDEO_LIST_FIELDS = [
  'id',
  'title',
  'cover_image_url',
  'create_time',
  'video_description',
  'duration',
  'share_url',
].join(',')

export const TIKTOK_USER_INFO_URL = `https://open.tiktokapis.com/v2/user/info/?fields=${encodeURIComponent(TIKTOK_USER_INFO_FIELDS)}`

export function tiktokVideoListUrl(): string {
  return `https://open.tiktokapis.com/v2/video/list/?fields=${encodeURIComponent(TIKTOK_VIDEO_LIST_FIELDS)}`
}
