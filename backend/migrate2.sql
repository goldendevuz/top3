ALTER TABLE domain_clicks ADD COLUMN IF NOT EXISTS ip_address VARCHAR;
ALTER TABLE domain_clicks ADD COLUMN IF NOT EXISTS user_agent VARCHAR;
CREATE INDEX IF NOT EXISTS ix_domain_clicks_ip_address ON domain_clicks (ip_address);
