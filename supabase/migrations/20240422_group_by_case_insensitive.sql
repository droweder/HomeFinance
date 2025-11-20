CREATE OR REPLACE FUNCTION group_by_case_insensitive(
  table_name TEXT,
  column_name TEXT
) RETURNS TABLE(value TEXT, count BIGINT)
AS $$
BEGIN
  RETURN QUERY EXECUTE format(
    'SELECT mode() WITHIN GROUP (ORDER BY %I) AS value, count(*) AS count
     FROM %I
     GROUP BY lower(%I)
     ORDER BY lower(value) ASC',
    column_name,
    table_name,
    column_name
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;