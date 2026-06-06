ALTER TABLE "financer_asset_sources" ADD COLUMN "color" text;
ALTER TABLE "financer_income_sources" ADD COLUMN "color" text;

-- Backfill existing rows with their current cyclic index colors (ordered by created_at per user)
UPDATE financer_asset_sources
SET color = src.color
FROM (
  SELECT id,
    CASE (ROW_NUMBER() OVER (PARTITION BY user_id ORDER BY created_at) - 1) % 8
      WHEN 0 THEN 'var(--blue-400)'
      WHEN 1 THEN 'var(--green-400)'
      WHEN 2 THEN 'var(--teal-400)'
      WHEN 3 THEN 'var(--moss-400)'
      WHEN 4 THEN 'var(--beige-400)'
      WHEN 5 THEN 'var(--yellow-400)'
      WHEN 6 THEN 'var(--magenta-400)'
      WHEN 7 THEN 'var(--red-400)'
    END AS color
  FROM financer_asset_sources
) AS src
WHERE financer_asset_sources.id = src.id;

UPDATE financer_income_sources
SET color = src.color
FROM (
  SELECT id,
    CASE (ROW_NUMBER() OVER (PARTITION BY user_id ORDER BY created_at) - 1) % 8
      WHEN 0 THEN 'var(--purple-400)'
      WHEN 1 THEN 'var(--teal-400)'
      WHEN 2 THEN 'var(--yellow-400)'
      WHEN 3 THEN 'var(--red-400)'
      WHEN 4 THEN 'var(--blue-400)'
      WHEN 5 THEN 'var(--green-400)'
      WHEN 6 THEN 'var(--magenta-400)'
      WHEN 7 THEN 'var(--moss-400)'
    END AS color
  FROM financer_income_sources
) AS src
WHERE financer_income_sources.id = src.id;
