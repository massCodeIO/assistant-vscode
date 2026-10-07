export const MESSAGES = {
  ERROR: 'massCode app is not running or port is not correct.',
  UNAUTHORIZED:
    'massCode API token is missing or invalid. Generate a token in massCode Preferences > API.',
  SET_TOKEN: 'Set API Token',
  TOKEN_PROMPT: 'Paste the API token from massCode Preferences > API',
  TOKEN_SAVED: 'massCode API token saved.',
  API_ERROR: (status: number) => `massCode API error: ${status}`,
  SUCCESS: 'Snippet successfully created.',
  NO_CONTENT: 'No content to create a snippet from.',
  CONTENT_UNAVAILABLE:
    'Snippet fragment is unavailable. It may have been deleted or not yet downloaded.',
}
