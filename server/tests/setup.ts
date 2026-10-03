// Test-only encryption keyring; never used by deployed environments.
process.env.PUBLIC_APPOINTMENT_TOKEN_ENCRYPTION_KEYS =
  '{"v1":"AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA="}';
process.env.PUBLIC_APPOINTMENT_TOKEN_ENCRYPTION_ACTIVE_VERSION = "v1";
