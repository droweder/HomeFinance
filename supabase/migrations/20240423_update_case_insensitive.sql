CREATE OR REPLACE FUNCTION update_case_insensitive(
  table_name TEXT,
  column_name TEXT,
  old_values TEXT[],
  new_value TEXT
) RETURNS integer AS $$
DECLARE
  rows_affected integer;
BEGIN
  EXECUTE format(
    'UPDATE %I
     SET %I = %L
     WHERE lower(%I) = ANY(SELECT lower(unnest(%L::text[])))',
    table_name,
    column_name,
    new_value,
    column_name,
    old_values
  );
  GET DIAGNOSTICS rows_affected = ROW_COUNT;
  RETURN rows_affected;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;